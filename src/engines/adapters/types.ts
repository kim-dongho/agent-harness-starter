/**
 * Agent Adapter 인터페이스
 *
 * harness.config.json → 에이전트별 설정 파일로 변환하는 어댑터 패턴
 */

/** 지원하는 에이전트 타입 */
export type AgentType = 'claude' | 'cursor' | 'windsurf' | 'cline' | 'copilot' | 'aider' | 'gemini' | 'codex';

/** 어댑터가 생성한 파일 */
export interface GeneratedFile {
  /** 프로젝트 루트 기준 상대 경로 */
  path: string;
  /** 파일 내용 */
  content: string;
  /** 실행 권한 필요 여부 (hook 스크립트) */
  executable?: boolean;
}

/** 어댑터 생성 결과 */
export interface AdapterOutput {
  /** 생성된 파일 목록 */
  files: GeneratedFile[];
  /** 스킵된 항목 설명 */
  skipped: string[];
}

/** harness.config.json 타입 (어댑터가 읽는 입력) */
export interface HarnessConfig {
  project: {
    name: string;
    framework: string;
    packageManager: string;
    language: string;
  };
  architecture: {
    style: string;
    enforceIndexGen: boolean;
    forbiddenImports: Record<string, string[]>;
  };
  development: {
    linter: string;
    formatter: string;
    styling: string;
  };
  testing: {
    runner: string;
    minCoverage: {
      statements: number;
      branches: number;
      functions: number;
      lines: number;
    };
    requireTestFileWithImplementation: boolean;
  };
  agent: {
    persona: string;
    allowedScopes: string[];
    adapters: string[];
  };
  rules: {
    fileNaming: {
      components: string;
      hooks: string;
      utils: string;
      services: string;
      models: string;
      testSuffix: string;
    };
    codingStandards: Array<{
      id: string;
      description: string;
      severity: 'error' | 'warn' | 'info';
    }>;
  };
}

/** 어댑터 인터페이스 — 모든 에이전트 어댑터가 구현 */
export interface AgentAdapter {
  /** 에이전트 이름 */
  name: string;
  /** 에이전트 타입 */
  type: AgentType;
  /** hooks 지원 여부 */
  supportsHooks: boolean;
  /** skills(SKILL.md) 지원 여부 */
  supportsSkills: boolean;
  /** config에서 에이전트 설정 파일 생성 */
  generate(projectRoot: string, config: HarnessConfig, stackRules: string, stackRulesByDir?: Record<string, string>): Promise<AdapterOutput>;
}
