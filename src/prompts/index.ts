/**
 * @fileoverview 프롬프트 오케스트레이터
 *
 * 공통 프롬프트 → 스택별 세부 프롬프트 순서로 실행하여
 * 사용자의 전체 선택 결과(UserChoices)를 수집한다.
 */
import * as p from '@clack/prompts';
import { getStackCategory, STACKS, type StackValue } from '../constants.js';
import { promptCommon } from './common.js';
import { promptFrontend } from './frontend.js';
import { promptNodeBackend, promptGo, promptPython, promptJava, promptRust, promptKotlin, promptDotnet } from './backend.js';
import { promptBlockchain } from './blockchain.js';
import { promptMobile } from './mobile.js';
import type { UserChoices, StackConfig } from './types.js';

export type { UserChoices, StackConfig } from './types.js';

/**
 * 전체 인터랙티브 프롬프트를 실행하여 사용자 선택을 수집한다.
 *
 * @param projectNameArg - CLI 인자로 전달된 프로젝트 이름 (없으면 프롬프트로 입력받음)
 * @returns 사용자 선택 결과 또는 취소 시 null
 */
export async function runPrompts(projectNameArg?: string): Promise<UserChoices | null> {
  const choices = await promptCommon(projectNameArg);
  if (!choices) return null;

  // 모노레포: 각 스택마다 세부 옵션
  if (choices.repoStructure === 'monorepo' && choices.stacks) {
    const configuredStacks: StackConfig[] = [];

    for (const stackConfig of choices.stacks) {
      const stackLabel = getStackLabel(stackConfig.stack);
      p.log.step(`[${stackLabel}] 세부 옵션`);

      const result = await promptStackOptions({ ...choices, ...stackConfig, stack: stackConfig.stack });
      if (!result) return null;

      configuredStacks.push({
        stack: stackConfig.stack,
        language: result.language,
        architecture: result.architecture,
        packageManager: result.packageManager,
        linter: result.linter,
        namingConvention: result.namingConvention,
        testFramework: result.testFramework,
        style: result.style,
        stateManagement: result.stateManagement,
        formLibrary: result.formLibrary,
        i18n: result.i18n,
        database: result.database,
        orm: result.orm,
        apiStyle: result.apiStyle,
        apiDocs: result.apiDocs,
        goLinter: result.goLinter,
        pythonPackageManager: result.pythonPackageManager,
        buildTool: result.buildTool,
        network: result.network,
        navigation: result.navigation,
      });
    }

    choices.stacks = configuredStacks;
    return choices;
  }

  // 폴리레포: 단일 스택
  return await promptStackOptions(choices);
}

async function promptStackOptions(choices: UserChoices): Promise<UserChoices | null> {
  const category = getStackCategory(choices.stack);

  switch (category) {
    case 'frontend':
      return await promptFrontend(choices);
    case 'node-backend':
      return await promptNodeBackend(choices);
    case 'go':
      return await promptGo(choices);
    case 'python':
      return await promptPython(choices);
    case 'java':
      return await promptJava(choices);
    case 'rust':
      return await promptRust(choices);
    case 'kotlin':
      return await promptKotlin(choices);
    case 'dotnet':
      return await promptDotnet(choices);
    case 'blockchain':
      return await promptBlockchain(choices);
    case 'mobile':
      return await promptMobile(choices);
    default:
      return choices;
  }
}

function getStackLabel(stack: StackValue): string {
  const all = [
    ...STACKS.frontend.items,
    ...STACKS.backend.items,
    ...STACKS.blockchain.items,
    // ...STACKS.mobile.items,
  ];
  return all.find((s) => s.value === stack)?.label ?? stack;
}
