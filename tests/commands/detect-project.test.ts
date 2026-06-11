import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { detectProject } from '../../src/commands/init.js';

const TMP = path.join(os.tmpdir(), 'harness-detect-test');

async function makeProject(name: string, files: Record<string, string | object>) {
  const dir = path.join(TMP, name);
  await fs.ensureDir(dir);
  for (const [filePath, content] of Object.entries(files)) {
    const full = path.join(dir, filePath);
    await fs.ensureDir(path.dirname(full));
    if (typeof content === 'string') {
      await fs.writeFile(full, content);
    } else {
      await fs.writeJson(full, content, { spaces: 2 });
    }
  }
  return dir;
}

beforeEach(async () => { await fs.ensureDir(TMP); });
afterEach(async () => { await fs.remove(TMP); });

describe('detectProject — Frontend', () => {
  it('Next.js App Router', async () => {
    const dir = await makeProject('next-app', {
      'package.json': { name: 'my-next', dependencies: { next: '14.0.0', react: '18.0.0' }, devDependencies: { typescript: '5.0.0' } },
      'tsconfig.json': '{}',
      'src/app/page.tsx': '',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('nextjs-app');
    expect(result.language).toBe('typescript');
  });

  it('Next.js Pages Router', async () => {
    const dir = await makeProject('next-pages', {
      'package.json': { name: 'my-next-pages', dependencies: { next: '14.0.0', react: '18.0.0' } },
      'tsconfig.json': '{}',
      'pages/index.tsx': '',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('nextjs-pages');
  });

  it('React + Vite', async () => {
    const dir = await makeProject('react-vite', {
      'package.json': { dependencies: { react: '18.0.0', vite: '5.0.0' }, devDependencies: { typescript: '5.0.0' } },
      'tsconfig.json': '{}',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('react-vite');
  });

  it('Vue + Vite', async () => {
    const dir = await makeProject('vue-vite', {
      'package.json': { dependencies: { vue: '3.0.0', vite: '5.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('vue-vite');
  });

  it('Nuxt', async () => {
    const dir = await makeProject('nuxt', {
      'package.json': { dependencies: { nuxt: '3.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('nuxt');
    expect(result.stacks).toContain('nuxt');
  });

  it('SvelteKit', async () => {
    const dir = await makeProject('sveltekit', {
      'package.json': { devDependencies: { '@sveltejs/kit': '2.0.0', svelte: '4.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('sveltekit');
  });

  it('Angular', async () => {
    const dir = await makeProject('angular', {
      'package.json': { dependencies: { '@angular/core': '17.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('angular');
    expect(result.stacks).toContain('angular');
  });

  it('Remix', async () => {
    const dir = await makeProject('remix', {
      'package.json': { dependencies: { '@remix-run/react': '2.0.0', react: '18.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('remix');
    expect(result.stacks).toContain('remix');
  });
});

describe('detectProject — Node.js Backend', () => {
  it('Express', async () => {
    const dir = await makeProject('express', {
      'package.json': { dependencies: { express: '4.18.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('node-express');
  });

  it('NestJS', async () => {
    const dir = await makeProject('nest', {
      'package.json': { dependencies: { '@nestjs/core': '10.0.0' } },
      'tsconfig.json': '{}',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('node-nestjs');
  });
});

describe('detectProject — Go', () => {
  it('Go Fiber', async () => {
    const dir = await makeProject('go-fiber', {
      'go.mod': 'module myapp\n\ngo 1.21\n\nrequire github.com/gofiber/fiber/v2 v2.50.0\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('go');
    expect(result.stacks).toContain('go-fiber');
    expect(result.packageManager).toBe('go');
    expect(result.testRunner).toBe('go test');
  });

  it('Go Gin', async () => {
    const dir = await makeProject('go-gin', {
      'go.mod': 'module myapp\n\ngo 1.21\n\nrequire github.com/gin-gonic/gin v1.9.0\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('go');
    expect(result.stacks).toContain('go-gin');
  });

  it('Go with golangci-lint', async () => {
    const dir = await makeProject('go-lint', {
      'go.mod': 'module myapp\n\ngo 1.21\n',
      '.golangci.yml': 'linters:\n  enable:\n    - gofmt\n',
    });
    const result = await detectProject(dir);
    expect(result.linters).toContain('golangci-lint');
  });
});

describe('detectProject — Python', () => {
  it('FastAPI', async () => {
    const dir = await makeProject('fastapi', {
      'pyproject.toml': '[project]\nname = "myapp"\ndependencies = ["fastapi"]\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('python');
    expect(result.stacks).toContain('python-fastapi');
    expect(result.testRunner).toBe('pytest');
  });

  it('Django', async () => {
    const dir = await makeProject('django', {
      'pyproject.toml': '[project]\nname = "myapp"\ndependencies = ["django"]\n',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('python-django');
  });

  it('Python with poetry', async () => {
    const dir = await makeProject('py-poetry', {
      'pyproject.toml': '[tool.poetry]\nname = "myapp"\n',
      'poetry.lock': '',
    });
    const result = await detectProject(dir);
    expect(result.packageManager).toBe('poetry');
  });

  it('Python with requirements.txt only', async () => {
    const dir = await makeProject('py-req', {
      'requirements.txt': 'flask==3.0.0\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('python');
    expect(result.packageManager).toBe('pip');
  });
});

describe('detectProject — Rust', () => {
  it('Rust Axum', async () => {
    const dir = await makeProject('rust-axum', {
      'Cargo.toml': '[package]\nname = "myapp"\n\n[dependencies]\naxum = "0.7"\ntokio = "1"\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('rust');
    expect(result.stacks).toContain('rust-axum');
    expect(result.packageManager).toBe('cargo');
    expect(result.testRunner).toBe('cargo test');
  });

  it('Solana Anchor', async () => {
    const dir = await makeProject('solana-anchor', {
      'Cargo.toml': '[package]\nname = "myprogram"\n\n[dependencies]\nanchor-lang = "0.29"\n',
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('solana-anchor');
  });
});

describe('detectProject — Java', () => {
  it('Spring Boot (Maven)', async () => {
    const dir = await makeProject('spring-maven', {
      'pom.xml': '<project><parent><artifactId>spring-boot-starter-parent</artifactId></parent></project>',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('java');
    expect(result.stacks).toContain('java-spring');
    expect(result.packageManager).toBe('maven');
    expect(result.testRunner).toBe('junit');
  });

  it('Spring Boot (Gradle)', async () => {
    const dir = await makeProject('spring-gradle', {
      'build.gradle': "plugins { id 'org.springframework.boot' }\ndependencies { implementation 'org.springframework.boot:spring-boot-starter-web' }",
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('java');
    expect(result.stacks).toContain('java-spring');
    expect(result.packageManager).toBe('gradle');
  });
});

describe('detectProject — Blockchain', () => {
  it('Solidity Hardhat', async () => {
    const dir = await makeProject('hardhat', {
      'package.json': { devDependencies: { hardhat: '2.19.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('solidity-hardhat');
  });

  it('Solidity Foundry', async () => {
    const dir = await makeProject('foundry', {
      'foundry.toml': '[profile.default]\nsrc = "src"\nout = "out"\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('solidity');
    expect(result.stacks).toContain('solidity-foundry');
  });

  it('Move Sui', async () => {
    const dir = await makeProject('move-sui', {
      'Move.toml': '[package]\nname = "mymodule"\nversion = "0.0.1"\n',
    });
    const result = await detectProject(dir);
    expect(result.language).toBe('move');
    expect(result.stacks).toContain('move-sui');
  });
});

describe('detectProject — Package Manager', () => {
  it('pnpm', async () => {
    const dir = await makeProject('pnpm-proj', {
      'package.json': { dependencies: { react: '18.0.0', vite: '5.0.0' } },
      'pnpm-lock.yaml': '',
    });
    const result = await detectProject(dir);
    expect(result.packageManager).toBe('pnpm');
  });

  it('yarn', async () => {
    const dir = await makeProject('yarn-proj', {
      'package.json': { dependencies: { react: '18.0.0', vite: '5.0.0' } },
      'yarn.lock': '',
    });
    const result = await detectProject(dir);
    expect(result.packageManager).toBe('yarn');
  });

  it('bun', async () => {
    const dir = await makeProject('bun-proj', {
      'package.json': { dependencies: { react: '18.0.0', vite: '5.0.0' } },
      'bun.lockb': '',
    });
    const result = await detectProject(dir);
    expect(result.packageManager).toBe('bun');
  });
});

describe('detectProject — Linter', () => {
  it('biome', async () => {
    const dir = await makeProject('biome-proj', {
      'package.json': { devDependencies: { '@biomejs/biome': '1.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.linters).toContain('biome');
  });

  it('eslint', async () => {
    const dir = await makeProject('eslint-proj', {
      'package.json': { devDependencies: { eslint: '8.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.linters).toContain('eslint');
  });

  it('ruff (Python)', async () => {
    const dir = await makeProject('ruff-proj', {
      'pyproject.toml': '[project]\nname = "x"\n',
      'ruff.toml': '[lint]\nselect = ["E", "F"]\n',
    });
    const result = await detectProject(dir);
    expect(result.linters).toContain('ruff');
  });
});

describe('detectProject — Test Runner', () => {
  it('vitest', async () => {
    const dir = await makeProject('vitest-proj', {
      'package.json': { devDependencies: { vitest: '1.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.testRunner).toBe('vitest');
  });

  it('jest', async () => {
    const dir = await makeProject('jest-proj', {
      'package.json': { devDependencies: { jest: '29.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.testRunner).toBe('jest');
  });
});

describe('detectProject — Monorepo', () => {
  it('pnpm workspace — 하위 패키지에서 next 감지', async () => {
    const dir = await makeProject('mono-pnpm', {
      'package.json': { name: 'monorepo', devDependencies: { typescript: '5.0.0' } },
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "packages/*"\n',
      'pnpm-lock.yaml': '',
      'apps/web/package.json': { name: '@mono/web', dependencies: { next: '14.0.0', react: '18.0.0' } },
      'apps/web/src/app/page.tsx': '',
      'packages/ui/package.json': { name: '@mono/ui', dependencies: { react: '18.0.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('nextjs-app');
    expect(result.packageManager).toBe('pnpm');
  });

  it('멀티 언어 모노레포 — python + go + nextjs 동시 감지', async () => {
    const dir = await makeProject('mono-multi', {
      'package.json': { name: 'quant', devDependencies: { typescript: '5.0.0' } },
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n  - "services/*"\n',
      'pnpm-lock.yaml': '',
      'apps/web/package.json': { name: '@q/web', dependencies: { next: '14.0.0', react: '18.0.0' } },
      'apps/web/src/app/page.tsx': '',
      'services/api/go.mod': 'module api\n\ngo 1.21\n\nrequire github.com/gofiber/fiber/v2 v2.50.0\n',
      'services/ml/pyproject.toml': '[project]\nname = "ml"\ndependencies = ["fastapi"]\n',
    });
    const result = await detectProject(dir);
    expect(result.languages).toContain('typescript');
    expect(result.languages).toContain('go');
    expect(result.languages).toContain('python');
    expect(result.stacks).toContain('nextjs-app');
    expect(result.stacks).toContain('go-fiber');
    expect(result.stacks).toContain('python-fastapi');
    expect(result.packageManager).toBe('pnpm');
  });

  it('npm workspaces — 하위 패키지에서 express 감지', async () => {
    const dir = await makeProject('mono-npm', {
      'package.json': { name: 'monorepo', workspaces: ['apps/*'], devDependencies: { typescript: '5.0.0' } },
      'apps/api/package.json': { name: '@mono/api', dependencies: { express: '4.18.0' } },
    });
    const result = await detectProject(dir);
    expect(result.stacks).toContain('node-express');
  });
});

describe('detectProject — Architecture', () => {
  it('FSD (features + shared)', async () => {
    const dir = await makeProject('fsd', {
      'package.json': { dependencies: { react: '18.0.0', vite: '5.0.0' } },
      'src/features/.keep': '',
      'src/shared/.keep': '',
    });
    const result = await detectProject(dir);
    expect(result.architecture).toBe('fsd');
  });

  it('Clean (domain + application)', async () => {
    const dir = await makeProject('clean', {
      'package.json': { dependencies: { express: '4.18.0' } },
      'src/domain/.keep': '',
      'src/application/.keep': '',
    });
    const result = await detectProject(dir);
    expect(result.architecture).toBe('clean');
  });

  it('FSD in monorepo workspace package', async () => {
    const dir = await makeProject('mono-fsd', {
      'package.json': { name: 'monorepo', devDependencies: { typescript: '5.0.0' } },
      'pnpm-workspace.yaml': 'packages:\n  - "apps/*"\n',
      'pnpm-lock.yaml': '',
      'apps/web/package.json': { name: '@mono/web', dependencies: { next: '14.0.0', react: '18.0.0' } },
      'apps/web/src/features/.keep': '',
      'apps/web/src/shared/.keep': '',
    });
    const result = await detectProject(dir);
    expect(result.architecture).toBe('fsd');
  });

  it('Go Clean (internal + cmd)', async () => {
    const dir = await makeProject('go-clean', {
      'go.mod': 'module myapp\n\ngo 1.21\n',
      'internal/.keep': '',
      'cmd/.keep': '',
    });
    const result = await detectProject(dir);
    expect(result.architecture).toBe('clean');
  });
});
