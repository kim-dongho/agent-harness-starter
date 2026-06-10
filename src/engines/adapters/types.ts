/**
 * @fileoverview Agent Adapter 타입 정의
 *
 * harness.config.json을 읽어 에이전트별 설정 파일을 동적 생성하는
 * 어댑터 패턴의 인터페이스와 관련 타입을 정의한다.
 */

/**
 * 지원하는 AI 에이전트 타입
 *
 * 각 타입에 대응하는 어댑터가 `agents/` 폴더에 구현되어 있다.
 */
export type AgentType = 'claude' | 'cursor' | 'windsurf' | 'cline' | 'copilot' | 'aider' | 'gemini' | 'codex';

/**
 * 어댑터가 생성한 개별 파일
 *
 * @example
 * ```ts
 * { path: '.claude/CLAUDE.md', content: '# Project\n...', executable: false }
 * { path: '.claude/hooks/scope-guard.sh', content: '#!/bin/bash\n...', executable: true }
 * ```
 */
export interface GeneratedFile {
  /** 프로젝트 루트 기준 상대 경로 (예: '.claude/rules/conventions.md') */
  path: string;
  /** 파일에 쓸 텍스트 내용 */
  content: string;
  /** true면 chmod 755로 실행 권한 부여 (hook 셸 스크립트용) */
  executable?: boolean;
}

/**
 * 어댑터의 generate() 반환값
 *
 * 생성된 파일 목록과 스킵된 항목 사유를 포함한다.
 */
export interface AdapterOutput {
  /** 생성된 파일 목록 — scaffolder가 순회하며 디스크에 기록한다 */
  files: GeneratedFile[];
  /** 스킵된 항목 설명 (예: 'hooks (Cline은 hooks 미지원 — 수동 승인 게이트 사용)') */
  skipped: string[];
}

/**
 * harness.config.json의 전체 스키마
 *
 * 프로젝트 생성 시 자동 생성되며, 어댑터가 이 config을 읽어
 * 에이전트별 설정 파일을 동적으로 만든다.
 */
export interface HarnessConfig {
  /** 프로젝트 기본 정보 */
  project: {
    /** 프로젝트 이름 (package.json name과 동일) */
    name: string;
    /** 프레임워크 (예: 'nextjs', 'vite-react', 'express', 'unknown') */
    framework: string;
    /** 패키지 매니저 (예: 'npm', 'pnpm', 'bun', 'yarn') */
    packageManager: string;
    /** 프로그래밍 언어 ('typescript' | 'javascript') */
    language: string;
  };

  /** 아키텍처 설정 */
  architecture: {
    /** 아키텍처 스타일 (예: 'fsd', 'clean', 'modular', 'flat') */
    style: string;
    /** true면 모든 src/ 하위 디렉토리에 index.ts barrel export를 강제한다 */
    enforceIndexGen: boolean;
    /**
     * 모듈 간 import 제한 규칙
     *
     * @example
     * ```json
     * { "shared": ["features", "pages"], "entities": ["features"] }
     * ```
     * shared 모듈은 features, pages를 import할 수 없다.
     */
    forbiddenImports: Record<string, string[]>;
  };

  /** 개발 도구 설정 */
  development: {
    /** 린터 (예: 'eslint', 'biome') */
    linter: string;
    /** 포맷터 (예: 'prettier', 'biome') */
    formatter: string;
    /** 스타일링 (예: 'tailwind', 'styled-components', '') */
    styling: string;
  };

  /** 테스트 설정 */
  testing: {
    /** 테스트 러너 (예: 'vitest', 'jest') */
    runner: string;
    /** 최소 커버리지 기준 (%) */
    minCoverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    /** true면 구현 파일마다 대응하는 테스트 파일이 있어야 한다 */
    requireTestFileWithImplementation: boolean;
  };

  /** AI 에이전트 설정 */
  agent: {
    /** 에이전트 페르소나 (예: 'senior-developer') */
    persona: string;
    /** 에이전트가 수정할 수 있는 경로 glob 패턴 (예: "src/**\/*", "tests/**\/*") */
    allowedScopes: string[];
    /** 사용할 에이전트 어댑터 목록 (예: "claude") */
    adapters: string[];
  };

  /** 프로젝트 규칙 */
  rules: {
    /** 파일 네이밍 규칙 (타입별) */
    fileNaming: {
      /** 컴포넌트 파일 네이밍 (예: 'PascalCase') */
      components: string;
      /** 훅 파일 네이밍 (예: 'camelCase') */
      hooks: string;
      /** 유틸 파일 네이밍 (예: 'camelCase') */
      utils: string;
      /** 서비스 파일 네이밍 (예: 'camelCase') */
      services: string;
      /** 모델 파일 네이밍 (예: 'camelCase') */
      models: string;
      /** 테스트 파일 접미사 (예: '.test') */
      testSuffix: string;
    };
    /**
     * 프로젝트 코딩 표준
     *
     * harness.config.json에 정의하면 에이전트 규칙 파일에 자동 반영된다.
     *
     * @example
     * ```json
     * [{ "id": "no-any", "description": "any 타입 사용 금지", "severity": "error" }]
     * ```
     */
    codingStandards: Array<{
      /** 규칙 식별자 (예: 'no-any', 'no-console-log') */
      id: string;
      /** 사람이 읽을 수 있는 규칙 설명 */
      description: string;
      /** 심각도 — error: 🚫 차단, warn: ⚠️ 경고, info: 💡 참고 */
      severity: 'error' | 'warn' | 'info';
    }>;
  };
}

/**
 * 에이전트 어댑터 인터페이스
 *
 * 모든 에이전트 어댑터(`agents/*.ts`)가 이 인터페이스를 구현한다.
 * `generate()` 메서드가 harness.config.json을 읽어 에이전트별 포맷으로 변환한다.
 */
export interface AgentAdapter {
  /** 에이전트 표시 이름 (예: 'Claude Code', 'OpenAI Codex CLI') */
  name: string;
  /** 에이전트 타입 식별자 */
  type: AgentType;
  /** hooks(PreToolUse/PostToolUse/Stop) 지원 여부 */
  supportsHooks: boolean;
  /** SKILL.md 오픈 스탠다드 지원 여부 */
  supportsSkills: boolean;
  /**
   * harness.config.json에서 에이전트 설정 파일을 동적 생성한다.
   *
   * @param projectRoot - 프로젝트 루트 디렉토리 절대 경로
   * @param config - harness.config.json 파싱 결과
   * @param stackRules - 스택별 규칙을 하나로 합친 문자열 (Aider/Gemini 등 파일 분리 불가 에이전트용)
   * @param stackRulesByDir - 스택 디렉토리별로 분리된 규칙 (Claude/Cursor 등 파일 분리 가능 에이전트용)
   * @returns 생성할 파일 목록과 스킵 사유
   */
  generate(projectRoot: string, config: HarnessConfig, stackRules: string, stackRulesByDir?: Record<string, string>): Promise<AdapterOutput>;
}
