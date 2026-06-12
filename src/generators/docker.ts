/**
 * Docker 설정 생성기
 *
 * 스택별 최적화된 Dockerfile + docker-compose.yml + .dockerignore를 생성한다.
 * - 새 프로젝트 (lockfile 없음) 에서도 동작하도록 설계
 * - 모노레포일 때는 루트에 docker-compose.yml, 각 앱에 Dockerfile
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { UserChoices, StackConfig } from '../prompts/types.js';
import { getStackCategory } from '../constants.js';

/**
 * Docker 설정 파일을 생성한다.
 */
export async function setupDocker(projectDir: string, choices: UserChoices): Promise<void> {
  if (choices.repoStructure === 'monorepo' && choices.stacks) {
    await setupMonorepoDocker(projectDir, choices);
  } else {
    await writeDockerfile(projectDir, choices);
    await writeDockerCompose(projectDir, [choices]);
    await writeDockerIgnore(projectDir);
  }
}

async function setupMonorepoDocker(projectDir: string, choices: UserChoices): Promise<void> {
  if (!choices.stacks) return;

  for (const stackConfig of choices.stacks) {
    const appName = getAppNameForDocker(stackConfig.stack);
    const appDir = path.join(projectDir, 'apps', appName);
    if (await fs.pathExists(appDir)) {
      await writeDockerfile(appDir, stackConfig);
    }
  }

  await writeDockerCompose(projectDir, choices.stacks);
  await writeDockerIgnore(projectDir);
}

// ─── PM 헬퍼 ───

/**
 * Docker 내 PM 설정.
 * yarn은 Docker에서 호환 문제가 많아 npm으로 fallback.
 */
function pmSetup(pm: string): string {
  if (pm === 'pnpm') return 'RUN npm install -g pnpm@9\n';
  if (pm === 'bun') return 'RUN npm install -g bun\n';
  // yarn은 Docker에서 npm으로 fallback (yarn classic 호환 문제)
  return '';
}

function pmInstall(pm: string): string {
  if (pm === 'pnpm') return 'pnpm install';
  if (pm === 'bun') return 'bun install';
  // yarn → Docker에서는 npm으로 fallback
  return 'npm install';
}

function pmRun(pm: string): string {
  if (pm === 'pnpm') return 'pnpm';
  if (pm === 'bun') return 'bun';
  // yarn → Docker에서는 npm으로 fallback
  return 'npm';
}

// ─── Dockerfile 생성 ───

async function writeDockerfile(dir: string, config: StackConfig): Promise<void> {
  const category = getStackCategory(config.stack);
  let content: string | null = null;

  await fs.ensureDir(dir);

  switch (category) {
    case 'frontend':
      content = getFrontendDockerfile(config);
      break;
    case 'node-backend':
      content = getNodeDockerfile(config);
      break;
    case 'go':
      content = getGoDockerfile();
      break;
    case 'python':
      content = getPythonDockerfile(config);
      break;
    case 'java':
      content = getJavaDockerfile(config);
      break;
    case 'rust':
      content = getRustDockerfile();
      break;
    case 'kotlin':
      content = getKotlinDockerfile();
      break;
    case 'dotnet':
      content = getDotnetDockerfile();
      break;
    default:
      return;
  }

  if (content) {
    await fs.writeFile(path.join(dir, 'Dockerfile'), content);
  }
}

// ─── 스택별 Dockerfile ───

function getFrontendDockerfile(config: StackConfig): string {
  const pm = config.packageManager ?? 'npm';
  const setup = pmSetup(pm);
  const install = pmInstall(pm);
  const run = pmRun(pm);

  // Next.js는 .next, 나머지는 dist/build/.output 등
  const isNextjs = ['nextjs-app', 'nextjs-pages'].includes(config.stack);
  const isNuxt = config.stack === 'nuxt';
  const isSvelteKit = config.stack === 'sveltekit';
  const isRemix = config.stack === 'remix';
  const isAngular = config.stack === 'angular';

  if (isNextjs) {
    return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN ${run} run build

EXPOSE 3000
CMD ["${run}", "run", "start"]
`;
  }

  if (isNuxt) {
    return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN ${run} run build

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
`;
  }

  if (isSvelteKit) {
    return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN ${run} run build

EXPOSE 3000
CMD ["node", "build"]
`;
  }

  if (isRemix) {
    return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN ${run} run build

EXPOSE 3000
CMD ["${run}", "run", "start"]
`;
  }

  if (isAngular) {
    // Angular fallback: CLI가 Node 버전 문제로 실패한 경우 npx serve로 dev 실행
    return `FROM node:lts-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN npx -y @angular/cli@latest build 2>/dev/null || echo "Angular build skipped"
RUN npm install -g serve

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
`;
  }

  // 기타 FE (Vite 계열 — static 빌드 + serve)
  return `FROM node:22-alpine AS builder
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN ${run} run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
}

function getNodeDockerfile(config: StackConfig): string {
  const pm = config.packageManager ?? 'npm';
  const setup = pmSetup(pm);
  const install = pmInstall(pm);

  // Express 수동 생성은 tsx로 실행, NestJS는 dist
  const isManual = ['node-express', 'node-hono', 'node-fastify'].includes(config.stack);

  if (isManual) {
    // 빌드 없이 tsx로 직접 실행 (개발용 간단 Dockerfile)
    return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}

EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]
`;
  }

  // NestJS 등 CLI가 만든 프로젝트 — build 스크립트가 없으면 tsx로 fallback
  return `FROM node:22-alpine
WORKDIR /app
${setup}
COPY . .
RUN ${install}
RUN if grep -q '"build"' package.json; then ${pmRun(pm)} run build; fi

EXPOSE 3000
CMD ["sh", "-c", "if [ -f dist/main.js ]; then node dist/main.js; else npx tsx src/main.ts; fi"]
`;
}

function getGoDockerfile(): string {
  return `FROM golang:1.23-alpine AS builder
WORKDIR /app

COPY go.mod ./
COPY go.sum* ./
RUN go mod download || true

COPY . .
RUN go mod tidy && CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.20
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /server .

EXPOSE 8080
CMD ["./server"]
`;
}

function getPythonDockerfile(config: StackConfig): string {
  const pm = config.pythonPackageManager ?? 'pip';
  const isFlask = config.stack === 'python-flask';
  const isDjango = config.stack === 'python-django';

  const envLine = isFlask ? 'ENV FLASK_APP=app\n' : '';

  const getStartCmd = (useUvRun: boolean) => {
    const prefix = useUvRun ? '"uv", "run", ' : '';
    if (isDjango) return `CMD [${prefix}"python", "manage.py", "runserver", "0.0.0.0:8000"]`;
    if (isFlask) return `CMD [${prefix}"python", "-m", "flask", "run", "--host=0.0.0.0", "--port=8000"]`;
    return `CMD [${prefix}"uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]`;
  };

  if (pm === 'uv') {
    return `FROM python:3.12-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

COPY pyproject.toml ./
COPY uv.lock* ./
RUN uv sync --no-dev || uv sync

COPY . .
RUN uv sync --no-dev || uv sync

${envLine}EXPOSE 8000
${getStartCmd(true)}
`;
  }

  if (pm === 'poetry') {
    return `FROM python:3.12-slim
WORKDIR /app

RUN pip install poetry && poetry config virtualenvs.create false

COPY pyproject.toml ./
COPY poetry.lock* ./
RUN poetry install --no-interaction || poetry install --no-interaction --no-root

COPY . .

${envLine}EXPOSE 8000
${getStartCmd(false)}
`;
  }

  // pip
  return `FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt* ./
RUN pip install --no-cache-dir -r requirements.txt || pip install --no-cache-dir flask uvicorn fastapi django

COPY . .

${envLine}EXPOSE 8000
${getStartCmd(false)}
`;
}

function getJavaDockerfile(config: StackConfig): string {
  const isGradle = config.buildTool !== 'maven';

  if (isGradle) {
    return `FROM gradle:8-jdk21-alpine AS builder
WORKDIR /app

COPY *.gradle* ./
COPY gradle* ./
COPY src ./src
RUN gradle build -x test --no-daemon || true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
`;
  }

  return `FROM maven:3.9-eclipse-temurin-21-alpine AS builder
WORKDIR /app

COPY pom.xml ./
RUN mvn dependency:go-offline || true

COPY src ./src
RUN mvn package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
`;
}

function getRustDockerfile(): string {
  return `FROM rust:1-alpine AS builder
WORKDIR /app
RUN apk add --no-cache musl-dev pkgconfig openssl-dev openssl-libs-static

COPY Cargo.toml Cargo.lock* ./
COPY src ./src
RUN cargo build --release
RUN find target/release -maxdepth 1 -perm +111 -type f ! -name '.*' ! -name '*.d' | head -1 | xargs -I{} cp {} /server

FROM alpine:3.20
WORKDIR /app
COPY --from=builder /server ./server

EXPOSE 8080
CMD ["./server"]
`;
}

function getKotlinDockerfile(): string {
  return `FROM gradle:8-jdk21-alpine AS builder
WORKDIR /app

COPY *.gradle* ./
COPY gradle* ./
COPY src ./src
RUN gradle build -x test --no-daemon || true

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=builder /app/build/libs/*.jar app.jar

EXPOSE 8080
CMD ["java", "-jar", "app.jar"]
`;
}

function getDotnetDockerfile(): string {
  return `FROM mcr.microsoft.com/dotnet/sdk:8.0-alpine AS builder
WORKDIR /app

COPY . .
RUN dotnet restore
RUN dotnet publish -c Release -o out

FROM mcr.microsoft.com/dotnet/aspnet:8.0-alpine
WORKDIR /app
COPY --from=builder /app/out .

EXPOSE 8080
CMD ["dotnet", "app.dll"]
`;
}

// ─── docker-compose.yml ───

async function writeDockerCompose(projectDir: string, stacks: StackConfig[]): Promise<void> {
  const services: Record<string, object> = {};
  const isMulti = stacks.length > 1;

  /** 컨테이너 내부 포트 (카테고리별) */
  const containerPortMap: Record<string, number> = {
    frontend: 3000,
    'node-backend': 3000,
    go: 8080,
    python: 8000,
    java: 8080,
    rust: 8080,
    kotlin: 8080,
    dotnet: 8080,
  };

  /**
   * 모노레포에서 호스트 포트 충돌 방지:
   * FE=3000, Node BE=3001, Go/Java/Rust/Kotlin/Dotnet=8080, Python=8000
   */
  const hostPortMap: Record<string, number> = {
    frontend: 3000,
    'node-backend': 3001,
    go: 8080,
    python: 8000,
    java: 8080,
    rust: 8080,
    kotlin: 8080,
    dotnet: 8080,
  };

  const usedHostPorts = new Set<number>();

  for (const config of stacks) {
    const category = getStackCategory(config.stack);
    const appName = getAppNameForDocker(config.stack);
    const buildCtx = isMulti ? `./apps/${appName}` : '.';

    const containerPort = containerPortMap[category];
    if (containerPort === undefined) continue; // blockchain/mobile 스킵

    let hostPort = hostPortMap[category] ?? containerPort;
    // 호스트 포트 충돌 시 +1씩 밀기
    while (usedHostPorts.has(hostPort)) hostPort++;
    usedHostPorts.add(hostPort);

    const ports = [`${hostPort}:${containerPort}`];
    const svc: Record<string, unknown> = { build: buildCtx, ports };
    if (category === 'frontend' || category === 'node-backend') {
      svc.environment = ['NODE_ENV=production'];
    }
    if (config.database && config.database !== 'none' && config.database !== 'sqlite') {
      svc.depends_on = ['db'];
    }

    services[appName] = svc;
  }

  // DB — sqlite는 파일 기반이라 Docker 컨테이너 불필요
  const dbConfig = stacks.find((s) => s.database && s.database !== 'none' && s.database !== 'sqlite');
  if (dbConfig?.database) {
    services.db = getDbService(dbConfig.database);
  }

  // YAML 생성
  let yaml = 'services:\n';
  for (const [name, svc] of Object.entries(services)) {
    yaml += `  ${name}:\n`;
    yaml += objToYaml(svc as Record<string, unknown>, 4);
  }

  if (dbConfig?.database && dbConfig.database !== 'sqlite') {
    yaml += '\nvolumes:\n  db-data:\n';
  }

  await fs.writeFile(path.join(projectDir, 'docker-compose.yml'), yaml);
}

function getDbService(db: string): object {
  switch (db) {
    case 'postgresql':
      return {
        image: 'postgres:16-alpine',
        ports: ['5432:5432'],
        environment: ['POSTGRES_USER=postgres', 'POSTGRES_PASSWORD=postgres', 'POSTGRES_DB=app'],
        volumes: ['db-data:/var/lib/postgresql/data'],
      };
    case 'mysql':
      return {
        image: 'mysql:8',
        ports: ['3306:3306'],
        environment: ['MYSQL_ROOT_PASSWORD=root', 'MYSQL_DATABASE=app'],
        volumes: ['db-data:/var/lib/mysql'],
      };
    case 'mongodb':
      return {
        image: 'mongo:7',
        ports: ['27017:27017'],
        volumes: ['db-data:/data/db'],
      };
    default:
      return {};
  }
}

// ─── .dockerignore ───

async function writeDockerIgnore(projectDir: string): Promise<void> {
  // 루트 + 각 apps/ 하위에도 .dockerignore 생성
  const appsDir = path.join(projectDir, 'apps');
  if (await fs.pathExists(appsDir)) {
    const apps = await fs.readdir(appsDir, { withFileTypes: true });
    for (const app of apps) {
      if (app.isDirectory()) {
        await fs.writeFile(path.join(appsDir, app.name, '.dockerignore'), DOCKER_IGNORE);
      }
    }
  }
  await fs.writeFile(path.join(projectDir, '.dockerignore'), DOCKER_IGNORE);
}

const DOCKER_IGNORE = `node_modules
.next
dist
build
.output
.git
.env
.env.*
*.md
.turbo
__pycache__
.venv
target
graphify-out
pnpm-lock.yaml
pnpm-workspace.yaml
.npmrc
package-lock.json
yarn.lock
bun.lock
`;

// ─── Helpers ───

function getAppNameForDocker(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'web', 'nextjs-pages': 'web', 'react-vite': 'web',
    'vue-vite': 'web', 'nuxt': 'web', 'sveltekit': 'web', 'angular': 'web',
    'astro': 'web', 'remix': 'web', 'solid-start': 'web', 'qwik': 'web',
    'go-gin': 'api', 'go-echo': 'api', 'go-fiber': 'api',
    'java-spring': 'api', 'kotlin-ktor': 'api', 'dotnet': 'api',
    'python-fastapi': 'api', 'python-django': 'api', 'python-flask': 'api',
    'node-express': 'api', 'node-nestjs': 'api', 'node-hono': 'api', 'node-fastify': 'api',
    'rust-axum': 'api', 'rust-actix': 'api',
  };
  return map[stack] ?? stack;
}

function objToYaml(obj: Record<string, unknown>, indent: number): string {
  let result = '';
  const pad = ' '.repeat(indent);

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      result += `${pad}${key}:\n`;
      for (const item of value) {
        result += `${pad}  - ${typeof item === 'string' ? `"${item}"` : item}\n`;
      }
    } else if (typeof value === 'string') {
      result += `${pad}${key}: ${value}\n`;
    } else if (typeof value === 'object' && value !== null) {
      result += `${pad}${key}:\n`;
      result += objToYaml(value as Record<string, unknown>, indent + 2);
    }
  }

  return result;
}
