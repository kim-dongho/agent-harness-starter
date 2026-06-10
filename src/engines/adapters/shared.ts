/**
 * 공통 빌더
 *
 * harness.config.json → 에이전트 규칙 콘텐츠로 변환하는 공유 함수들.
 * 각 어댑터가 이 함수들의 결과를 에이전트별 포맷으로 래핑한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import type { HarnessConfig } from './types.js';

/** 프로젝트 컨텍스트 섹션 */
export function buildProjectContext(config: HarnessConfig): string {
  const lines = [
    `# ${config.project.name}`,
    '',
    `Framework: ${config.project.framework} | Language: ${config.project.language} | PM: ${config.project.packageManager}`,
    `Architecture: ${config.architecture.style} | Test: ${config.testing.runner}`,
    '',
  ];
  return lines.join('\n');
}

/** 컨벤션 규칙 섹션 */
export function buildConventionRules(config: HarnessConfig): string {
  const lines: string[] = [];

  lines.push('## Conventions');
  lines.push(`- Architecture style: ${config.architecture.style}`);
  if (config.architecture.enforceIndexGen) {
    lines.push('- Every directory under src/ MUST have an index.ts barrel export');
  }
  lines.push('');

  // Import restrictions
  const forbidden = config.architecture.forbiddenImports;
  if (Object.keys(forbidden).length > 0) {
    lines.push('## Import Restrictions');
    for (const [source, blocked] of Object.entries(forbidden)) {
      lines.push(`- \`${source}\` MUST NOT import from: ${blocked.map(b => `\`${b}\``).join(', ')}`);
    }
    lines.push('');
  }

  // File naming
  const fn = config.rules?.fileNaming;
  lines.push('## File Naming');
  lines.push(`- Components: ${fn?.components ?? 'PascalCase'}`);
  lines.push(`- Hooks: camelCase with use prefix (useAuth.ts)`);
  lines.push(`- Utils: ${fn?.utils ?? 'camelCase'}`);
  lines.push(`- Services: ${fn?.services ?? 'camelCase'}`);
  lines.push(`- Tests: same name + ${fn?.testSuffix ?? '.test'} suffix`);
  lines.push('');

  return lines.join('\n');
}

/** 코딩 원칙 섹션 */
export function buildCodingPrinciples(): string {
  return [
    '## Coding Principles',
    '',
    '1. **Think Before Coding** — State assumptions explicitly. If uncertain, ask. If multiple interpretations exist, present them.',
    '2. **Simplicity First** — Minimum code that solves the problem. No speculative features, no premature abstractions.',
    '3. **Surgical Changes** — Touch only what you must. Match existing style. Every changed line should trace to the request.',
    '4. **Goal-Driven Execution** — Define verifiable success criteria before coding. Loop until verified.',
    '',
  ].join('\n');
}

/** 코딩 표준 섹션 (harness.config.json의 codingStandards) */
export function buildCodingStandards(config: HarnessConfig): string {
  const standards = config.rules?.codingStandards;
  if (!standards || standards.length === 0) return '';

  const lines = ['## Coding Standards', ''];
  for (const std of standards) {
    const icon = std.severity === 'error' ? '🚫' : std.severity === 'warn' ? '⚠️' : '💡';
    lines.push(`- ${icon} **${std.id}**: ${std.description}`);
  }
  lines.push('');
  return lines.join('\n');
}

/** 워크플로우 / SDLC 파이프라인 섹션 */
export function buildWorkflowRules(config: HarnessConfig): string {
  const lines: string[] = [];

  lines.push('## SDLC Pipeline');
  lines.push('');
  lines.push('1. `/plan` → 기능, 우선순위, 마일스톤');
  lines.push('2. `/analyze` → 도메인 용어집 + 기능 스펙');
  lines.push('3. `/design` → 인터페이스, API 계약, 컴포넌트 구조');
  lines.push('4. `/generate <type> <name>` → 파일 생성 (직접 Write 금지)');
  lines.push('5. `/start <이슈번호>` → 이슈 기반 작업 시작');
  lines.push('6. `/done` → 품질 게이트 + 커밋 + MR');
  lines.push('');
  lines.push('**MANDATORY:** 새 파일은 `/generate`로만 생성한다. 직접 Write 금지.');
  lines.push('');

  // Testing
  lines.push('## Testing');
  lines.push(`- Runner: ${config.testing.runner}`);
  lines.push(`- Min coverage: statements=${config.testing.minCoverage.statements}%, branches=${config.testing.minCoverage.branches}%`);
  if (config.testing.requireTestFileWithImplementation) {
    lines.push('- Every implementation file MUST have a corresponding test file');
  }
  lines.push('');

  // Policy test
  lines.push('## Policy Test');
  lines.push('');
  lines.push('비즈니스 정책(날짜 계산, 금액, 상태 전이, 필터 조건, 외부 연동 규격)이 포함된 코드를 수정할 때:');
  lines.push('1. 해당 정책을 검증하는 테스트가 있는지 확인한다');
  lines.push('2. 테스트가 없으면 경계값과 예외 케이스를 커버하는 테스트를 먼저 작성한다');
  lines.push('3. 정책 수정 후 기존 + 신규 테스트가 모두 통과하는지 확인한다');
  lines.push('');

  // Agent scope
  lines.push('## Agent Scope');
  lines.push(`- Persona: ${config.agent.persona}`);
  lines.push(`- Allowed scopes: ${config.agent.allowedScopes.join(', ')}`);
  lines.push('- Do NOT modify files outside allowed scopes');
  lines.push('');

  // Tools
  lines.push('## Tools');
  lines.push(`- Linter: ${config.development.linter}`);
  lines.push(`- Formatter: ${config.development.formatter}`);
  if (config.development.styling) {
    lines.push(`- Styling: ${config.development.styling}`);
  }
  lines.push('');

  return lines.join('\n');
}

/** 전체 규칙 콘텐츠를 하나로 합침 */
export function buildFullContent(config: HarnessConfig, stackRules: string): string {
  return [
    buildProjectContext(config),
    buildCodingPrinciples(),
    buildConventionRules(config),
    buildCodingStandards(config),
    buildWorkflowRules(config),
    stackRules ? `## Stack Rules\n\n${stackRules}` : '',
  ].filter(Boolean).join('\n');
}

/** templates/rules/stack/ 에서 스택별 규칙 파일을 읽어서 합친다 */
export async function loadStackRules(templatesDir: string, stackDirs: string[]): Promise<string> {
  const parts: string[] = [];

  for (const dir of stackDirs) {
    const dirPath = path.join(templatesDir, 'rules', 'stack', dir);
    if (!(await fs.pathExists(dirPath))) continue;

    const files = await fs.readdir(dirPath);
    for (const file of files.sort()) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      parts.push(content.trim());
    }
  }

  return parts.join('\n\n');
}

/** templates/rules/stack/ 에서 스택별로 분리하여 반환한다 */
export async function loadStackRulesByDir(templatesDir: string, stackDirs: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const dir of stackDirs) {
    const dirPath = path.join(templatesDir, 'rules', 'stack', dir);
    if (!(await fs.pathExists(dirPath))) continue;

    const parts: string[] = [];
    const files = await fs.readdir(dirPath);
    for (const file of files.sort()) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      parts.push(content.trim());
    }
    if (parts.length > 0) {
      result[dir] = parts.join('\n\n');
    }
  }

  return result;
}
