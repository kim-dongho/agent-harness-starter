/**
 * @fileoverview 프로젝트 전역 상수 및 타입 정의
 *
 * 지원하는 AI 에이전트, 레포 구조, 스택, 옵션 목록과
 * 관련 유틸리티 함수를 정의한다.
 */

/** 지원하는 AI 에이전트 목록 (value, label, 설정 디렉토리) */
export const AGENTS = [
  { value: 'claude', label: 'Claude Code', dir: '.claude' },
  { value: 'gemini', label: 'Gemini CLI', dir: '.gemini' },
  { value: 'codex', label: 'OpenAI Codex CLI', dir: '.codex' },
] as const;

// ─── 워크플로우 옵션 ───

/** 이슈 트래커 옵션 */
export const ISSUE_TRACKERS = [
  { value: 'jira', label: 'Jira' },
  { value: 'none', label: 'None' },
] as const;

/** Git 플랫폼 옵션 */
export const GIT_PLATFORMS = [
  { value: 'gitlab', label: 'GitLab' },
] as const;

/** 이슈 트래커 식별자 타입 */
export type IssueTrackerValue = (typeof ISSUE_TRACKERS)[number]['value'];
/** Git 플랫폼 식별자 타입 */
export type GitPlatformValue = (typeof GIT_PLATFORMS)[number]['value'];

/** 레포지토리 구조 옵션 (모노레포 또는 폴리레포) */
export const REPO_STRUCTURES = [
  { value: 'monorepo', label: 'Monorepo (Turborepo)' },
  { value: 'polyrepo', label: 'Polyrepo' },
] as const;

/** 카테고리별 스택 정의 (프론트엔드, 백엔드, 블록체인) */
export const STACKS = {
  frontend: {
    label: 'Frontend',
    items: [
      { value: 'nextjs-app', label: 'Next.js (App Router)' },
      { value: 'nextjs-pages', label: 'Next.js (Pages Router)' },
      { value: 'react-vite', label: 'React (Vite)' },
      { value: 'vue-vite', label: 'Vue (Vite)' },
      { value: 'nuxt', label: 'Nuxt' },
      { value: 'sveltekit', label: 'SvelteKit' },
      { value: 'angular', label: 'Angular' },
      { value: 'remix', label: 'Remix' },
      // { value: 'astro', label: 'Astro' },
      // { value: 'solid-start', label: 'SolidStart' },
      // { value: 'qwik', label: 'Qwik City' },
    ],
  },
  backend: {
    label: 'Backend',
    items: [
      { value: 'go-gin', label: 'Go (Gin)' },
      { value: 'go-fiber', label: 'Go (Fiber)' },
      { value: 'java-spring', label: 'Java (Spring Boot)' },
      { value: 'python-fastapi', label: 'Python (FastAPI)' },
      { value: 'python-django', label: 'Python (Django)' },
      { value: 'node-express', label: 'Node (Express)' },
      { value: 'node-nestjs', label: 'Node (NestJS)' },
      { value: 'rust-axum', label: 'Rust (Axum)' },
      // { value: 'go-echo', label: 'Go (Echo)' },
      // { value: 'python-flask', label: 'Python (Flask)' },
      // { value: 'node-hono', label: 'Node (Hono)' },
      // { value: 'node-fastify', label: 'Node (Fastify)' },
      // { value: 'rust-actix', label: 'Rust (Actix)' },
      // { value: 'kotlin-ktor', label: 'Kotlin (Ktor)' },
      // { value: 'dotnet', label: 'C# (.NET)' },
    ],
  },
  blockchain: {
    label: 'Blockchain',
    items: [
      { value: 'solidity-hardhat', label: 'Solidity (Hardhat)' },
      { value: 'solidity-foundry', label: 'Solidity (Foundry)' },
      { value: 'solana-anchor', label: 'Solana (Anchor)' },
      { value: 'move-sui', label: 'Move (Sui)' },
      // { value: 'move-aptos', label: 'Move (Aptos)' },
      // { value: 'ton-tact', label: 'TON (Tact)' },
      // { value: 'cosmwasm', label: 'CosmWasm (Rust)' },
    ],
  },
  // mobile: {
  //   label: 'Mobile',
  //   items: [
  //     { value: 'react-native', label: 'React Native' },
  //     { value: 'flutter', label: 'Flutter' },
  //   ],
  // },
} as const;

/** AI 에이전트 식별자 타입 */
export type AgentValue = (typeof AGENTS)[number]['value'];
/** 레포 구조 타입 ('monorepo' | 'polyrepo') */
export type RepoStructure = (typeof REPO_STRUCTURES)[number]['value'];
/** 지원하는 모든 스택 식별자의 유니온 타입 */
export type StackValue =
  | (typeof STACKS.frontend.items)[number]['value']
  | (typeof STACKS.backend.items)[number]['value']
  | (typeof STACKS.blockchain.items)[number]['value']
  // 주석처리된 스택 타입 유지 (나중에 활성화 시 사용)
  | 'astro' | 'solid-start' | 'qwik'
  | 'go-echo' | 'python-flask' | 'node-hono' | 'node-fastify' | 'rust-actix' | 'kotlin-ktor' | 'dotnet'
  | 'move-aptos' | 'ton-tact' | 'cosmwasm'
  | 'react-native' | 'flutter';

/** 프론트엔드 스택 목록 */
const FRONTEND_STACKS: StackValue[] = [
  'nextjs-app', 'nextjs-pages', 'react-vite', 'vue-vite', 'nuxt',
  'sveltekit', 'angular', 'remix',
];

/** Node.js 백엔드 스택 목록 */
const NODE_BACKEND_STACKS: StackValue[] = [
  'node-express', 'node-nestjs',
];

/** Go 백엔드 스택 목록 */
const GO_STACKS: StackValue[] = ['go-gin', 'go-fiber'];
/** Python 백엔드 스택 목록 */
const PYTHON_STACKS: StackValue[] = ['python-fastapi', 'python-django'];
/** Java 백엔드 스택 목록 */
const JAVA_STACKS: StackValue[] = ['java-spring'];
/** Rust 백엔드 스택 목록 */
const RUST_STACKS: StackValue[] = ['rust-axum'];
/** 블록체인 스택 목록 */
const BLOCKCHAIN_STACKS: StackValue[] = [
  'solidity-hardhat', 'solidity-foundry', 'solana-anchor', 'move-sui',
];
/** 모바일 스택 목록 */
const MOBILE_STACKS: StackValue[] = ['react-native', 'flutter'];

/**
 * 스택 카테고리를 판별한다.
 *
 * @param stack - 스택 식별자 (예: 'nextjs-app', 'go-gin')
 * @returns 스택 카테고리 ('frontend' | 'node-backend' | 'go' | 'python' | 'java' | 'blockchain' | 'mobile' | 'unknown')
 *
 * @example
 * ```ts
 * getStackCategory('nextjs-app') // 'frontend'
 * getStackCategory('go-gin')     // 'go'
 * ```
 */
export function getStackCategory(stack: StackValue) {
  if (FRONTEND_STACKS.includes(stack)) return 'frontend';
  if (NODE_BACKEND_STACKS.includes(stack)) return 'node-backend';
  if (GO_STACKS.includes(stack)) return 'go';
  if (PYTHON_STACKS.includes(stack)) return 'python';
  if (JAVA_STACKS.includes(stack)) return 'java';
  if (RUST_STACKS.includes(stack)) return 'rust';
  if (['kotlin-ktor'].includes(stack)) return 'kotlin';
  if (['dotnet'].includes(stack)) return 'dotnet';
  if (BLOCKCHAIN_STACKS.includes(stack)) return 'blockchain';
  if (['react-native', 'flutter'].includes(stack)) return 'mobile';
  return 'unknown';
}

// ─── 언어 선택 ───

/** 지원하는 프로그래밍 언어 옵션 */
export const LANGUAGES = [
  { value: 'typescript', label: 'TypeScript' },
  { value: 'javascript', label: 'JavaScript' },
] as const;

// ─── 공통 옵션 ───

/** Node.js 패키지 매니저 옵션 */
export const PACKAGE_MANAGERS = [
  { value: 'npm', label: 'npm' },
  { value: 'bun', label: 'bun' },
  { value: 'pnpm', label: 'pnpm' },
  { value: 'yarn', label: 'yarn' },
] as const;

/** JS/TS 린트 및 포맷터 옵션 */
export const JS_LINTERS = [
  { value: 'eslint-prettier', label: 'ESLint + Prettier' },
  { value: 'biome', label: 'Biome' },
] as const;

// ─── 네이밍 규칙 (JS/TS 프로젝트) ───

/** 파일 네이밍 규칙 옵션 (JS/TS 프로젝트용) */
export const NAMING_CONVENTIONS = [
  { value: 'kebab-case', label: 'kebab-case (user-profile.tsx)' },
  { value: 'PascalCase', label: 'PascalCase (UserProfile.tsx)' },
  { value: 'camelCase', label: 'camelCase (userProfile.tsx)' },
] as const;

// ─── Frontend 옵션 ───

/** 프론트엔드 스타일링 옵션 */
export const STYLES = [
  { value: 'tailwind', label: 'Tailwind CSS' },
  { value: 'styled-components', label: 'styled-components' },
  { value: 'css-module', label: 'CSS Module' },
  { value: 'vanilla-extract', label: 'vanilla-extract' },
] as const;

/** 프론트엔드 상태관리 라이브러리 옵션 */
export const FE_STATE_MANAGEMENT = [
  { value: 'react-query', label: 'TanStack Query (서버 상태)' },
  { value: 'swr', label: 'SWR (서버 상태)' },
  { value: 'zustand', label: 'Zustand (클라이언트 상태)' },
  { value: 'redux-toolkit', label: 'Redux Toolkit (클라이언트 상태)' },
  { value: 'jotai', label: 'Jotai (클라이언트 상태)' },
  { value: 'pinia', label: 'Pinia (Vue)' },
  { value: 'ngrx', label: 'NgRx (Angular)' },
] as const;

/** 프론트엔드 테스트 프레임워크 옵션 */
export const FE_TEST_FRAMEWORKS = [
  { value: 'vitest', label: 'Vitest' },
  { value: 'jest', label: 'Jest' },
] as const;

/** 프론트엔드 폼 라이브러리 옵션 */
export const FE_FORM_LIBRARIES = [
  { value: 'react-hook-form', label: 'React Hook Form' },
  { value: 'formik', label: 'Formik' },
  { value: 'vee-validate', label: 'VeeValidate', hint: 'Vue only' },
  { value: 'none', label: 'None' },
] as const;

/** 프론트엔드 국제화(i18n) 라이브러리 옵션 */
export const FE_I18N = [
  { value: 'next-intl', label: 'next-intl', hint: 'Next.js' },
  { value: 'react-i18next', label: 'react-i18next' },
  { value: 'vue-i18n', label: 'vue-i18n', hint: 'Vue only' },
  { value: 'none', label: 'None' },
] as const;

// ─── Backend Node 옵션 ───

/** Node.js 백엔드 ORM 옵션 */
export const NODE_ORMS = [
  { value: 'prisma', label: 'Prisma' },
  { value: 'drizzle', label: 'Drizzle' },
  { value: 'typeorm', label: 'TypeORM' },
  { value: 'none', label: 'None' },
] as const;

// ─── Backend Go 옵션 ───

/** Go 백엔드 ORM 옵션 */
export const GO_ORMS = [
  { value: 'gorm', label: 'GORM' },
  { value: 'sqlx', label: 'sqlx' },
  { value: 'ent', label: 'ent' },
  { value: 'none', label: 'None' },
] as const;

/** Go 린터 옵션 */
export const GO_LINTERS = [
  { value: 'golangci-lint', label: 'golangci-lint' },
  { value: 'staticcheck', label: 'staticcheck' },
] as const;

// ─── Backend Python 옵션 ───

/** Python 패키지 매니저 옵션 */
export const PYTHON_PACKAGE_MANAGERS = [
  { value: 'uv', label: 'uv' },
  { value: 'poetry', label: 'Poetry' },
  { value: 'pip', label: 'pip' },
] as const;

/** Python ORM 옵션 */
export const PYTHON_ORMS = [
  { value: 'sqlalchemy', label: 'SQLAlchemy', hint: 'FastAPI' },
  { value: 'tortoise', label: 'Tortoise ORM', hint: 'FastAPI' },
  { value: 'django-orm', label: 'Django ORM', hint: 'Django 내장' },
  { value: 'none', label: 'None' },
] as const;

// ─── Backend Java 옵션 ───

/** Java 빌드 도구 옵션 */
export const JAVA_BUILD_TOOLS = [
  { value: 'gradle', label: 'Gradle (Groovy DSL)' },
  { value: 'gradle-kts', label: 'Gradle (Kotlin DSL)' },
  { value: 'maven', label: 'Maven' },
] as const;

/** Java ORM 옵션 */
export const JAVA_ORMS = [
  { value: 'spring-data-jpa', label: 'Spring Data JPA (Hibernate)' },
  { value: 'mybatis', label: 'MyBatis' },
  { value: 'none', label: 'None' },
] as const;

// ─── Backend Rust 옵션 ───

/** Rust ORM 옵션 */
export const RUST_ORMS = [
  { value: 'diesel', label: 'Diesel' },
  { value: 'sqlx-rust', label: 'SQLx' },
  { value: 'sea-orm', label: 'SeaORM' },
  { value: 'none', label: 'None' },
] as const;

// ─── Backend Kotlin 옵션 ───

/** Kotlin 빌드 도구 옵션 */
export const KOTLIN_BUILD_TOOLS = [
  { value: 'gradle-kotlin', label: 'Gradle (Kotlin DSL)' },
] as const;

// ─── Backend .NET 옵션 ───

/** .NET ORM 옵션 */
export const DOTNET_ORMS = [
  { value: 'ef-core', label: 'Entity Framework Core' },
  { value: 'dapper', label: 'Dapper' },
  { value: 'none', label: 'None' },
] as const;

// ─── 공통 DB ───

/** 지원하는 데이터베이스 옵션 */
export const DATABASES = [
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mongodb', label: 'MongoDB' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'none', label: 'None' },
] as const;

// ─── 공통 API 스타일 ───

/** API 스타일 옵션 */
export const API_STYLES = [
  { value: 'rest', label: 'REST' },
  { value: 'graphql', label: 'GraphQL' },
  { value: 'grpc', label: 'gRPC' },
] as const;

// ─── API 문서화 ───

/** API 문서화 도구 옵션 */
export const API_DOCS = [
  { value: 'swagger', label: 'Swagger (OpenAPI)' },
  { value: 'scalar', label: 'Scalar' },
  { value: 'redoc', label: 'Redoc' },
  { value: 'none', label: 'None' },
] as const;

// ─── Blockchain 옵션 ───

/** 블록체인 네트워크 옵션 — 스택별 필터링 */
export const BLOCKCHAIN_NETWORKS: Record<string, { value: string; label: string }[]> = {
  'solidity-hardhat': [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'base', label: 'Base' },
    { value: 'other', label: 'Other EVM' },
  ],
  'solidity-foundry': [
    { value: 'ethereum', label: 'Ethereum' },
    { value: 'polygon', label: 'Polygon' },
    { value: 'arbitrum', label: 'Arbitrum' },
    { value: 'base', label: 'Base' },
    { value: 'other', label: 'Other EVM' },
  ],
  'solana-anchor': [
    { value: 'solana-mainnet', label: 'Solana Mainnet' },
    { value: 'solana-devnet', label: 'Solana Devnet' },
  ],
  'move-sui': [
    { value: 'sui-mainnet', label: 'Sui Mainnet' },
    { value: 'sui-testnet', label: 'Sui Testnet' },
  ],
};

// ─── Mobile 옵션 ───

/** 모바일 상태관리 라이브러리 옵션 */
export const MOBILE_STATE_MANAGEMENT = [
  { value: 'riverpod', label: 'Riverpod', hint: 'Flutter' },
  { value: 'bloc', label: 'Bloc', hint: 'Flutter' },
  { value: 'provider', label: 'Provider', hint: 'Flutter' },
  { value: 'redux', label: 'Redux', hint: 'React Native' },
  { value: 'zustand-rn', label: 'Zustand', hint: 'React Native' },
  { value: 'none', label: 'None' },
] as const;

/** 모바일 네비게이션 라이브러리 옵션 */
export const MOBILE_NAVIGATION = [
  { value: 'go-router', label: 'GoRouter', hint: 'Flutter' },
  { value: 'auto-route', label: 'AutoRoute', hint: 'Flutter' },
  { value: 'react-navigation', label: 'React Navigation', hint: 'React Native' },
  { value: 'expo-router', label: 'Expo Router', hint: 'React Native' },
] as const;

// ─── 아키텍처 ───

/** 프론트엔드 아키텍처 옵션 */
export const FE_ARCHITECTURES = [
  { value: 'fsd', label: 'Feature-Sliced Design (FSD)' },
  { value: 'atomic', label: 'Atomic Design' },
  { value: 'colocation', label: 'Colocation (파일 기능별 배치)' },
  { value: 'flat', label: 'Flat (단순 구조)' },
] as const;

/** 백엔드 아키텍처 옵션 */
export const BE_ARCHITECTURES = [
  { value: 'layered', label: 'Layered (Controller → Service → Repository)' },
  { value: 'clean', label: 'Clean Architecture (Hexagonal)' },
  { value: 'ddd', label: 'Domain-Driven Design (DDD)' },
  { value: 'modular', label: 'Modular (도메인별 모듈 분리)' },
] as const;

/** 모바일 아키텍처 옵션 */
export const MOBILE_ARCHITECTURES = [
  { value: 'clean-mobile', label: 'Clean Architecture' },
  { value: 'mvvm', label: 'MVVM' },
  { value: 'feature-first', label: 'Feature-First' },
] as const;

// ─── 스택 → 에이전트 룰 폴더 매핑 ───

/**
 * 스택에 해당하는 에이전트 룰 디렉토리 목록을 반환한다.
 *
 * @param stack - 스택 식별자
 * @returns 복사할 룰 디렉토리 이름 배열 (예: ['react', 'nextjs', 'general-ts'])
 *
 * @example
 * ```ts
 * getStackRuleDirs('nextjs-app') // ['react', 'nextjs', 'general-ts']
 * getStackRuleDirs('go-gin')     // ['go']
 * ```
 */
export function getStackRuleDirs(stack: StackValue): string[] {
  const dirs: string[] = [];

  if (['nextjs-app', 'nextjs-pages'].includes(stack)) {
    dirs.push('react', 'nextjs', 'general-ts');
  } else if (['react-vite', 'react-native'].includes(stack)) {
    dirs.push('react', 'general-ts');
  } else if (['vue-vite', 'nuxt'].includes(stack)) {
    dirs.push('vue', 'general-ts');
  } else if (stack === 'sveltekit') {
    dirs.push('svelte', 'general-ts');
  } else if (stack === 'angular') {
    dirs.push('angular', 'general-ts');
  } else if (['astro', 'remix', 'solid-start', 'qwik'].includes(stack)) {
    dirs.push('general-ts');
  } else if (['go-gin', 'go-echo', 'go-fiber'].includes(stack)) {
    dirs.push('go');
  } else if (stack === 'java-spring') {
    dirs.push('java');
  } else if (['python-fastapi', 'python-django', 'python-flask'].includes(stack)) {
    dirs.push('python');
  } else if (['node-express', 'node-nestjs', 'node-hono', 'node-fastify'].includes(stack)) {
    dirs.push('general-ts');
  } else if (['rust-axum', 'rust-actix'].includes(stack)) {
    dirs.push('rust');
  } else if (stack === 'kotlin-ktor') {
    dirs.push('kotlin');
  } else if (stack === 'dotnet') {
    dirs.push('dotnet');
  } else if (['solidity-hardhat', 'solidity-foundry'].includes(stack)) {
    dirs.push('solidity');
  } else if (stack === 'solana-anchor') {
    dirs.push('solana');
  } else if (['move-sui', 'move-aptos'].includes(stack)) {
    dirs.push('move');
  } else if (stack === 'ton-tact') {
    dirs.push('ton');
  } else if (stack === 'cosmwasm') {
    dirs.push('cosmwasm');
  } else if (stack === 'flutter') {
    dirs.push('flutter');
  }

  return dirs;
}
