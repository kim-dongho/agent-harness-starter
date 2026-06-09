/**
 * @fileoverview Angular 스택 보일러플레이트 생성기
 *
 * Angular CLI 실패 시 (Node 버전 미스매치 등) fallback으로 최소 구조를 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { StackConfig } from '../../prompts/types.js';

/**
 * Angular 프로젝트 보일러플레이트를 생성한다.
 *
 * @param dir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션
 */
export async function setupAngular(dir: string, config: StackConfig): Promise<void> {
  const ts = config.language !== 'javascript';

  await fs.ensureDir(path.join(dir, 'src/app'));
  await fs.ensureDir(path.join(dir, 'src/assets'));
  await fs.ensureDir(path.join(dir, 'public'));

  await fs.writeJson(path.join(dir, 'package.json'), {
    name: path.basename(dir),
    version: '0.1.0',
    scripts: {
      start: 'ng serve',
      build: 'ng build',
      test: 'ng test',
      lint: config.linter === 'biome' ? 'biome check .' : 'ng lint',
    },
    dependencies: {
      '@angular/core': '^19',
      '@angular/common': '^19',
      '@angular/compiler': '^19',
      '@angular/platform-browser': '^19',
      '@angular/platform-browser-dynamic': '^19',
      '@angular/router': '^19',
      'rxjs': '^7',
      'zone.js': '^0.15',
    },
    devDependencies: {
      '@angular/cli': '^19',
      '@angular/compiler-cli': '^19',
      'typescript': '^5',
    },
  }, { spaces: 2 });

  if (ts) {
    await fs.writeJson(path.join(dir, 'tsconfig.json'), {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'bundler',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        experimentalDecorators: true,
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src'],
    }, { spaces: 2 });
  }

  await fs.writeFile(path.join(dir, 'src/main.ts'), `import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent).catch((err) => console.error(err));
`);

  await fs.writeFile(path.join(dir, 'src/app/app.component.ts'), `import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  standalone: true,
  template: \`<h1>{{ title }}</h1>\`,
})
export class AppComponent {
  title = '${path.basename(dir)}';
}
`);

  await fs.writeFile(path.join(dir, 'src/index.html'), `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${path.basename(dir)}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
  <app-root></app-root>
</body>
</html>
`);

  await fs.writeFile(path.join(dir, '.gitignore'), 'node_modules\ndist\n.angular\n.env\n');
}
