/**
 * Claude Code 어댑터
 *
 * CLAUDE.md + .claude/rules/*.md + .claude/hooks/ + .claude/settings.json
 */
import type { AgentAdapter, HarnessConfig, AdapterOutput } from './types.js';
import { buildFullContent, buildProjectContext, buildConventionRules, buildCodingPrinciples, buildCodingStandards, buildWorkflowRules } from './shared.js';

export const claudeAdapter: AgentAdapter = {
  name: 'Claude Code',
  type: 'claude',
  supportsHooks: true,
  supportsSkills: true,

  async generate(_root, config, stackRules, stackRulesByDir) {
    const files = [];

    // CLAUDE.md — 프로젝트 컨텍스트 + 코딩 원칙
    files.push({
      path: '.claude/CLAUDE.md',
      content: [
        buildProjectContext(config),
        buildCodingPrinciples(),
        buildCodingStandards(config),
        '## Verify',
        '',
        '작업 완료 전 반드시 검증한다.',
        '1. **빌드** — 빌드 에러 없는지 확인',
        '2. **린트** — lint/format 통과',
        '3. **타입** — type-check 통과',
        '4. **테스트** — 관련 테스트 통과',
        '5. **범위** — 의도하지 않은 파일 변경 없는지 `git diff` 확인',
        '',
      ].join('\n'),
    });

    // .claude/rules/conventions.md
    files.push({
      path: '.claude/rules/conventions.md',
      content: buildConventionRules(config),
    });

    // .claude/rules/workflow.md
    files.push({
      path: '.claude/rules/workflow.md',
      content: buildWorkflowRules(config),
    });

    // .claude/rules/stack/{name}.md — 스택별 규칙 분리
    if (stackRulesByDir && Object.keys(stackRulesByDir).length > 0) {
      for (const [dir, content] of Object.entries(stackRulesByDir)) {
        files.push({
          path: `.claude/rules/stack/${dir}.md`,
          content,
        });
      }
    } else if (stackRules) {
      // fallback: 분리 데이터 없으면 하나로
      files.push({
        path: '.claude/rules/stack.md',
        content: stackRules,
      });
    }

    return { files, skipped: [] };
  },
};
