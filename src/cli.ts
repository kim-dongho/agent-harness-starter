#!/usr/bin/env node

/**
 * create-harness CLI 진입점
 *
 * 사용법:
 *   npx create-harness [project-name]
 *
 * 플로우:
 *   1. 인터랙티브 프롬프트로 옵션 수집 (prompts/)
 *   2. 프로젝트 스캐폴딩 + 에이전트 룰 세팅 (scaffolder.ts)
 */
import { Command } from 'commander';
import { runPrompts } from './prompts/index.js';
import { scaffold } from './scaffolder/index.js';

const program = new Command();

program
  .name('create-harness')
  .description('Scaffold projects with AI agent rules')
  .version('0.1.0')
  .argument('[project-name]', '프로젝트 이름')
  .action(async (projectName?: string) => {
    const choices = await runPrompts(projectName);
    if (!choices) {
      process.exit(0);
    }
    await scaffold(choices);
    process.exit(0); // graphify hook 등 백그라운드 프로세스 정리
  });

program.parse();
