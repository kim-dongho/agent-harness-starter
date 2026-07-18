#!/usr/bin/env node

/**
 * @fileoverview agent-harness-starter CLI 진입점
 *
 * 사용법:
 *   npx agent-harness-starter [project-name]  — 새 프로젝트 생성
 *   npx agent-harness-starter init             — 기존 프로젝트에 하네스 세팅
 */
import { Command } from 'commander';
import { runPrompts } from './prompts/index.js';
import { scaffold } from './scaffolder/index.js';
import { initHarness } from './commands/init.js';
import { showMetrics } from './commands/metrics.js';

const program = new Command();

program
  .name('agent-harness-starter')
  .description('프로젝트 스캐폴더 + AI 에이전트 하네스')
  .version('0.1.0');

// 기본 명령어: 새 프로젝트 생성
program
  .command('create', { isDefault: true })
  .description('새 프로젝트를 생성하고 하네스를 세팅한다')
  .argument('[project-name]', '프로젝트 이름')
  .action(async (projectName?: string) => {
    const choices = await runPrompts(projectName);
    if (!choices) {
      process.exit(0);
    }
    await scaffold(choices);
    process.exit(0);
  });

// init 명령어: 기존 프로젝트에 하네스만 세팅
program
  .command('init')
  .description('기존 프로젝트에 하네스만 세팅한다 (보일러플레이트 생성 없음)')
  .argument('[project-dir]', '프로젝트 디렉토리 (기본: 현재 디렉토리)')
  .action(async (projectDir?: string) => {
    await initHarness(projectDir);
    process.exit(0);
  });

// metrics 명령어: 메트릭 확인
program
  .command('metrics')
  .description('하네스 메트릭을 집계하여 출력한다')
  .argument('[project-dir]', '프로젝트 디렉토리 (기본: 현재 디렉토리)')
  .option('-d, --days <days>', '집계 기간 (일)', '7')
  .action(async (projectDir?: string, opts?: { days?: string }) => {
    const days = Number(opts?.days ?? 7);
    await showMetrics(projectDir, isNaN(days) || days <= 0 ? 7 : days);
    process.exit(0);
  });

program.parse();
