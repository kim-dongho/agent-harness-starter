/**
 * @fileoverview 프롬프트 관련 타입 정의
 *
 * 사용자 선택 옵션과 스택 설정을 위한 인터페이스를 정의한다.
 */
import type { AgentValue, RepoStructure, StackValue, IssueTrackerValue, GitPlatformValue } from '../constants.js';

/** 스택별 세부 설정 옵션 */
export interface StackConfig {
  /** 스택 식별자 (예: 'nextjs-app', 'go-gin', 'solidity-hardhat') */
  stack: StackValue;
  /** 프로그래밍 언어 ('typescript' | 'javascript') */
  language?: string;
  /** 아키텍처 패턴 (예: 'fsd', 'layered', 'clean') */
  architecture?: string;
  /** 패키지 매니저 (예: 'npm', 'pnpm', 'bun', 'yarn') */
  packageManager?: string;
  /** 린트/포맷터 (예: 'eslint-prettier', 'biome') */
  linter?: string;
  /** 파일 네이밍 규칙 (예: 'kebab-case', 'PascalCase', 'camelCase') */
  namingConvention?: string;
  /** 테스트 프레임워크 (예: 'vitest', 'jest') */
  testFramework?: string;
  /** 스타일링 방식 (예: 'tailwind', 'styled-components') */
  style?: string;
  /** 상태관리 라이브러리 (쉼표 구분, 예: 'react-query,zustand') */
  stateManagement?: string;
  /** 폼 라이브러리 (예: 'react-hook-form', 'formik') */
  formLibrary?: string;
  /** 국제화 라이브러리 (예: 'next-intl', 'react-i18next') */
  i18n?: string;
  /** 데이터베이스 종류 (예: 'postgresql', 'mysql', 'mongodb') */
  database?: string;
  /** ORM 라이브러리 (예: 'prisma', 'drizzle', 'gorm') */
  orm?: string;
  /** API 스타일 (예: 'rest', 'graphql', 'grpc') */
  apiStyle?: string;
  /** API 문서화 도구 (예: 'swagger', 'scalar', 'redoc') */
  apiDocs?: string;
  /** Go 린터 (예: 'golangci-lint', 'staticcheck') */
  goLinter?: string;
  /** Python 패키지 매니저 (예: 'uv', 'poetry', 'pip') */
  pythonPackageManager?: string;
  /** Java 빌드 도구 (예: 'gradle', 'maven') */
  buildTool?: string;
  /** 블록체인 네트워크 (예: 'ethereum', 'polygon') */
  network?: string;
  /** 모바일 네비게이션 라이브러리 (예: 'go-router', 'react-navigation') */
  navigation?: string;
}

/**
 * 사용자의 전체 선택 결과
 *
 * StackConfig를 확장하여 프로젝트 메타 정보와 추가 옵션을 포함한다.
 */
export interface UserChoices extends StackConfig {
  /** 프로젝트 이름 (디렉토리명으로 사용) */
  projectName: string;
  /** 선택한 AI 에이전트 */
  agent: AgentValue;
  /** 레포 구조 ('monorepo' | 'polyrepo') */
  repoStructure: RepoStructure;
  /** 모노레포일 때 복수 스택 */
  stacks?: StackConfig[];
  /** Graphify Knowledge Graph 세팅 여부 */
  graphify?: boolean;
  /** Docker 설정 여부 */
  docker?: boolean;
  /** 의존성 자동 설치 여부 */
  autoInstall?: boolean;
  /** 이슈 트래커 (예: 'jira', 'linear', 'github-issues') */
  issueTracker?: IssueTrackerValue;
  /** Git 플랫폼 (예: 'github', 'gitlab', 'bitbucket') */
  gitPlatform?: GitPlatformValue;
}
