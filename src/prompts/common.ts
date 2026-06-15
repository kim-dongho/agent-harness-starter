/**
 * @fileoverview 공통 프롬프트 함수
 *
 * 프로젝트 이름, 에이전트 선택, 레포 구조 등 모든 스택에 공통으로 필요한
 * 프롬프트를 수집한다.
 */
import * as p from '@clack/prompts';
import {
  AGENTS,
  REPO_STRUCTURES,
  STACKS,
  LANGUAGES,
  PACKAGE_MANAGERS,
  JS_LINTERS,
  NAMING_CONVENTIONS,
  ISSUE_TRACKERS,
  type AgentValue,
  type RepoStructure,
  type StackValue,
  type IssueTrackerValue,
  type GitPlatformValue,
} from '../constants.js';
import type { UserChoices } from './types.js';

/**
 * 사용자가 프롬프트를 취소했는지 확인한다.
 *
 * @param value - 프롬프트 반환값
 * @returns 취소된 경우 true
 */
export function cancelled<T>(value: T | symbol): value is symbol {
  return p.isCancel(value);
}

/** 카테고리 선택지 */
const CATEGORIES = [
  { value: 'frontend', label: 'Frontend' },
  { value: 'backend', label: 'Backend' },
  { value: 'blockchain', label: 'Blockchain' },
  // { value: 'mobile', label: 'Mobile' },
] as const;

/** 카테고리 → 스택 매핑 */
const STACKS_BY_CATEGORY: Record<string, { value: string; label: string }[]> = {
  frontend: [...STACKS.frontend.items],
  backend: [...STACKS.backend.items],
  blockchain: [...STACKS.blockchain.items],
  // mobile: [...STACKS.mobile.items],
};

/**
 * 카테고리 먼저 선택 → 카테고리 내 스택 선택 (단일)
 */
async function selectStack(): Promise<StackValue | null> {
  const category = await p.select({
    message: '카테고리를 선택하세요',
    options: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
  });
  if (cancelled(category)) return null;

  const stacks = STACKS_BY_CATEGORY[category as string];
  const stack = await p.select({
    message: '스택을 선택하세요',
    options: stacks.map((s) => ({ value: s.value, label: s.label })),
  });
  if (cancelled(stack)) return null;

  return stack as StackValue;
}

/**
 * 카테고리 복수 선택 → 각 카테고리에서 스택 하나씩 선택 (모노레포)
 *
 * 같은 카테고리에서 두 개 이상 선택하는 건 실무에서 없음
 * (Next.js + React Vite를 동시에 쓰는 경우는 없다)
 */
async function selectMultipleStacks(): Promise<StackValue[] | null> {
  const categories = await p.multiselect({
    message: '카테고리를 선택하세요 (space로 복수 선택)',
    options: CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
    required: true,
  });
  if (cancelled(categories)) return null;

  const selectedStacks: StackValue[] = [];

  for (const cat of categories as string[]) {
    const stacks = STACKS_BY_CATEGORY[cat];
    const label = CATEGORIES.find((c) => c.value === cat)?.label ?? cat;

    const selected = await p.select({
      message: `[${label}] 스택을 선택하세요`,
      options: stacks.map((s) => ({ value: s.value, label: s.label })),
    });
    if (cancelled(selected)) return null;

    selectedStacks.push(selected as StackValue);
  }

  return selectedStacks;
}

/**
 * 공통 프롬프트를 실행하여 기본 설정을 수집한다.
 *
 * 프로젝트 이름, 에이전트, Graphify/Docker/의존성 설치 여부, 레포 구조, 스택을 선택받는다.
 *
 * @param projectNameArg - CLI 인자로 전달된 프로젝트 이름 (없으면 프롬프트로 입력받음)
 * @returns 기본 선택 결과 또는 취소 시 null
 */
export async function promptCommon(projectNameArg?: string): Promise<UserChoices | null> {
  p.intro('create-harness');

  const projectName = projectNameArg ?? await p.text({
    message: '프로젝트 이름을 입력하세요',
    placeholder: 'my-project',
    validate: (v = '') => {
      if (!v.trim()) return '프로젝트 이름은 필수입니다';
      if (!/^[a-z0-9-_]+$/.test(v)) return '소문자, 숫자, -, _ 만 사용 가능합니다';
    },
  });
  if (cancelled(projectName)) return null;

  const agent = await p.select({
    message: 'AI 에이전트를 선택하세요',
    options: AGENTS.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(agent)) return null;

  const graphify = await p.confirm({
    message: 'Graphify (Knowledge Graph) 세팅할까요? — 토큰 절약 + 자동 갱신',
    initialValue: true,
  });
  if (cancelled(graphify)) return null;

  const docker = await p.confirm({
    message: 'Docker 설정을 추가할까요? — Dockerfile + docker-compose.yml',
    initialValue: false,
  });
  if (cancelled(docker)) return null;

  const autoInstall = await p.confirm({
    message: '의존성을 자동으로 설치할까요?',
    initialValue: true,
  });
  if (cancelled(autoInstall)) return null;

  const gitPlatform = 'gitlab' as GitPlatformValue; // GitLab 고정

  const issueTracker = await p.select({
    message: '이슈 트래커를 선택하세요',
    options: ISSUE_TRACKERS.map((t) => ({ value: t.value, label: t.label })),
  });
  if (cancelled(issueTracker)) return null;

  const repoStructure = await p.select({
    message: '레포 구조를 선택하세요',
    options: REPO_STRUCTURES.map((r) => ({ value: r.value, label: r.label })),
  });
  if (cancelled(repoStructure)) return null;

  if (repoStructure === 'monorepo') {
    const result = await promptMonorepoStacks(
      projectName as string,
      agent as AgentValue,
      repoStructure as RepoStructure,
    );
    if (result) {
      result.graphify = graphify as boolean;
      result.docker = docker as boolean;
      result.autoInstall = autoInstall as boolean;
      result.issueTracker = issueTracker as IssueTrackerValue;
      result.gitPlatform = gitPlatform as GitPlatformValue;
    }
    return result;
  }

  // 폴리레포: 카테고리 → 스택 단일 선택
  const stack = await selectStack();
  if (!stack) return null;

  return {
    projectName: projectName as string,
    agent: agent as AgentValue,
    repoStructure: repoStructure as RepoStructure,
    stack: stack as StackValue,
    graphify: graphify as boolean,
    docker: docker as boolean,
    autoInstall: autoInstall as boolean,
    issueTracker: issueTracker as IssueTrackerValue,
    gitPlatform: gitPlatform as GitPlatformValue,
  };
}

async function promptMonorepoStacks(
  projectName: string,
  agent: AgentValue,
  repoStructure: RepoStructure,
): Promise<UserChoices | null> {
  // 카테고리 → 스택 복수 선택
  const stacks = await selectMultipleStacks();
  if (!stacks || stacks.length === 0) return null;

  // JS/TS 스택이 하나라도 있으면 공통 옵션을 루트에서 물어봄
  const NON_JS_STACKS = [
    'go-gin', 'go-echo', 'go-fiber',
    'java-spring', 'kotlin-ktor',
    'python-fastapi', 'python-django', 'python-flask',
    'rust-axum', 'rust-actix',
    'dotnet', 'flutter',
  ];
  const hasJsTs = stacks.some((s) => !NON_JS_STACKS.includes(s));

  let packageManager: string | undefined;
  let linter: string | undefined;
  let language: string | undefined;
  let namingConvention: string | undefined;

  if (hasJsTs) {
    p.log.step('모노레포 공통 설정');

    // TS 강제 스택 — JS 선택 불가
    const TS_ONLY_STACKS = ['nuxt', 'sveltekit', 'angular', 'remix'];
    const jstsStacks = stacks.filter((s) => !NON_JS_STACKS.includes(s));
    const allTsOnly = jstsStacks.every((s) => TS_ONLY_STACKS.includes(s));

    // TS 강제 스택이 섞여있으면 안내
    const hasTsOnly = jstsStacks.some((s) => TS_ONLY_STACKS.includes(s));

    if (allTsOnly) {
      language = 'typescript';
      p.log.info('선택한 스택은 TypeScript만 지원합니다.');
    } else {
      const tsNote = hasTsOnly
        ? ` (${jstsStacks.filter(s => TS_ONLY_STACKS.includes(s)).join(', ')}은 TS 고정)`
        : '';
      const lang = await p.select({
        message: `언어를 선택하세요 (JS/TS 스택 공통)${tsNote}`,
        options: LANGUAGES.map((l) => ({ value: l.value, label: l.label })),
      });
      if (cancelled(lang)) return null;
      language = lang as string;
    }

    const pm = await p.select({
      message: '패키지 매니저를 선택하세요 (루트 공통)',
      options: PACKAGE_MANAGERS.map((pm) => ({ value: pm.value, label: pm.label })),
    });
    if (cancelled(pm)) return null;
    packageManager = pm as string;

    const lint = await p.select({
      message: '린트/포맷터를 선택하세요 (루트 공통)',
      options: JS_LINTERS.map((l) => ({ value: l.value, label: l.label })),
    });
    if (cancelled(lint)) return null;
    linter = lint as string;

    const naming = await p.select({
      message: '파일 네이밍 규칙을 선택하세요 (루트 공통)',
      options: NAMING_CONVENTIONS.map((n) => ({ value: n.value, label: n.label })),
    });
    if (cancelled(naming)) return null;
    namingConvention = naming as string;
  }

  return {
    projectName,
    agent,
    repoStructure,
    stack: stacks[0],
    packageManager,
    linter,
    language,
    namingConvention,
    stacks: stacks.map((s) => ({
      stack: s,
      packageManager,
      linter,
      language,
      namingConvention,
    })),
  };
}

/**
 * 프로그래밍 언어를 선택받는다.
 *
 * @returns 선택된 언어 ('typescript' | 'javascript') 또는 취소 시 null
 */
export async function promptLanguage(): Promise<string | null> {
  const lang = await p.select({
    message: '언어를 선택하세요',
    options: LANGUAGES.map((l) => ({ value: l.value, label: l.label })),
  });
  if (cancelled(lang)) return null;
  return lang as string;
}
