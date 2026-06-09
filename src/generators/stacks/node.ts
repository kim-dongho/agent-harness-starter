/**
 * @fileoverview Node.js 스택 보일러플레이트 생성기
 *
 * Express 프로젝트의 기본 구조와 설정 파일을 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/**
 * Express 프로젝트 보일러플레이트를 생성한다.
 *
 * package.json, 엔트리 파일, tsconfig(TS 선택 시), .gitignore를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션
 */
export async function setupNodeExpress(dir: string, config: StackConfig): Promise<void> {
  const ts = config.language !== 'javascript';
  const ext = ts ? 'ts' : 'js';

  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: ts ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
      build: ts ? 'tsc' : undefined,
      start: ts ? 'node dist/index.js' : 'node src/index.js',
      lint: config.linter === 'biome' ? 'biome check .' : 'eslint .',
    },
    dependencies: {
      express: '^5',
    },
    devDependencies: {
      ...(ts ? { tsx: '^4', typescript: '^5', '@types/express': '^5', '@types/node': '^22' } : {}),
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, `src/index.${ext}`), `import express from 'express';

const app = express();
const port = process.env.PORT ?? 3000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(\`Server running on port \${port}\`);
});
`);

  if (ts) {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    }, { spaces: 2 });
  }

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.env\n');
}

/**
 * Hono 프로젝트 보일러플레이트를 생성한다.
 */
export async function setupNodeHono(dir: string, config: StackConfig): Promise<void> {
  const ts = config.language !== 'javascript';
  const ext = ts ? 'ts' : 'js';

  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: ts ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
      build: ts ? 'tsc' : undefined,
      start: ts ? 'node dist/index.js' : 'node src/index.js',
      lint: config.linter === 'biome' ? 'biome check .' : 'eslint .',
    },
    dependencies: {
      hono: '^4',
      '@hono/node-server': '^1',
    },
    devDependencies: {
      ...(ts ? { tsx: '^4', typescript: '^5', '@types/node': '^22' } : {}),
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, `src/index.${ext}`), `import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => c.json({ status: 'ok' }));

serve({ fetch: app.fetch, port: 3000 }, (info) => {
  console.log(\`Server running on port \${info.port}\`);
});
`);

  if (ts) {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    }, { spaces: 2 });
  }

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.env\n');
}

/**
 * Fastify 프로젝트 보일러플레이트를 생성한다.
 */
export async function setupNodeFastify(dir: string, config: StackConfig): Promise<void> {
  const ts = config.language !== 'javascript';
  const ext = ts ? 'ts' : 'js';

  await fs.ensureDir(path.join(dir, 'src'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: ts ? 'tsx watch src/index.ts' : 'node --watch src/index.js',
      build: ts ? 'tsc' : undefined,
      start: ts ? 'node dist/index.js' : 'node src/index.js',
      lint: config.linter === 'biome' ? 'biome check .' : 'eslint .',
    },
    dependencies: {
      fastify: '^5',
    },
    devDependencies: {
      ...(ts ? { tsx: '^4', typescript: '^5', '@types/node': '^22' } : {}),
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, `src/index.${ext}`), `import Fastify from 'fastify';

const app = Fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok' }));

app.listen({ port: 3000, host: '0.0.0.0' }).then(() => {
  console.log('Server running on port 3000');
});
`);

  if (ts) {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        outDir: 'dist',
        rootDir: 'src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
      include: ['src'],
    }, { spaces: 2 });
  }

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.env\n');
}
