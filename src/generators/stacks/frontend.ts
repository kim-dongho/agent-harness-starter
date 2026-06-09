/**
 * @fileoverview FE 스택 보일러플레이트 생성기 (CLI 불안정 스택용)
 *
 * Astro, SolidStart, Qwik — CLI가 execSync pipe에서 불안정하여 수동 생성.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/** Astro 프로젝트 보일러플레이트 */
export async function setupAstro(dir: string, config: StackConfig): Promise<void> {
  await fs.ensureDir(path.join(dir, 'src/pages'));
  await fs.ensureDir(path.join(dir, 'src/layouts'));
  await fs.ensureDir(path.join(dir, 'public'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'astro dev',
      build: 'astro build',
      preview: 'astro preview',
    },
    dependencies: {
      astro: '^5',
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, 'astro.config.mjs'), `import { defineConfig } from 'astro/config';

export default defineConfig({});
`);

  await fs.writeFile(path.join(dir, 'src/pages/index.astro'), `---
// Welcome to Astro
---

<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${path.basename(dir)}</title>
</head>
<body>
  <h1>${path.basename(dir)}</h1>
</body>
</html>
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.astro\n.env\n');
}

/** SolidStart 프로젝트 보일러플레이트 */
export async function setupSolidStart(dir: string, config: StackConfig): Promise<void> {
  await fs.ensureDir(path.join(dir, 'src/routes'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'vinxi dev',
      build: 'vinxi build',
      start: 'vinxi start',
    },
    dependencies: {
      '@solidjs/meta': '^0.29',
      '@solidjs/router': '^0.15',
      '@solidjs/start': '^1',
      'solid-js': '^1.9',
      'vinxi': '^0.5',
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, 'src/routes/index.tsx'), `export default function Home() {
  return <h1>${path.basename(dir)}</h1>;
}
`);

  await fs.writeFile(path.join(dir, 'app.config.ts'), `import { defineConfig } from "@solidjs/start/config";

export default defineConfig({});
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.output\n.vinxi\n.env\n');
}

/** Qwik City 프로젝트 보일러플레이트 */
export async function setupQwik(dir: string, config: StackConfig): Promise<void> {
  await fs.ensureDir(path.join(dir, 'src/routes'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'qwik dev',
      build: 'qwik build',
      preview: 'vite preview',
    },
    devDependencies: {
      '@builder.io/qwik': '^2',
      '@builder.io/qwik-city': '^2',
      'vite': '^6',
      'typescript': '^5',
    },
  }, { spaces: 2 });

  await fs.writeFile(path.join(dir, 'src/routes/index.tsx'), `import { component$ } from '@builder.io/qwik';

export default component$(() => {
  return <h1>${path.basename(dir)}</h1>;
});
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.qwik\ntmp\nserver\n.env\n');
}
