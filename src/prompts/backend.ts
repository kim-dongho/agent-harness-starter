/**
 * @fileoverview 백엔드 스택 세부 프롬프트
 *
 * Node.js, Go, Python, Java 각 백엔드 스택에 특화된
 * 아키텍처, ORM, DB, API 스타일 등의 옵션을 수집한다.
 */
import * as p from '@clack/prompts';
import {
  PACKAGE_MANAGERS,
  JS_LINTERS,
  NAMING_CONVENTIONS,
  FE_TEST_FRAMEWORKS,
  NODE_ORMS,
  GO_ORMS,
  GO_LINTERS,
  PYTHON_PACKAGE_MANAGERS,
  PYTHON_ORMS,
  JAVA_BUILD_TOOLS,
  RUST_ORMS,
  KOTLIN_BUILD_TOOLS,
  DOTNET_ORMS,
  DATABASES,
  API_STYLES,
  API_DOCS,
  BE_ARCHITECTURES,
} from '../constants.js';
import { cancelled, promptLanguage } from './common.js';
import type { UserChoices } from './types.js';

async function promptApiDocs(choices: UserChoices): Promise<boolean> {
  if (choices.apiStyle !== 'rest') return true;
  const apiDocs = await p.select({
    message: 'API 문서화 도구를 선택하세요',
    options: API_DOCS.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(apiDocs)) return false;
  choices.apiDocs = apiDocs as string;
  return true;
}

/**
 * Node.js 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptNodeBackend(choices: UserChoices): Promise<UserChoices | null> {
  if (!choices.language) {
    const language = await promptLanguage();
    if (language === null) return null;
    choices.language = language;
  }

  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  if (!choices.packageManager) {
    const packageManager = await p.select({
      message: '패키지 매니저를 선택하세요',
      options: PACKAGE_MANAGERS.map((pm) => ({ value: pm.value, label: pm.label })),
    });
    if (cancelled(packageManager)) return null;
    choices.packageManager = packageManager as string;
  }

  if (!choices.linter) {
    const linter = await p.select({
      message: '린트/포맷터를 선택하세요',
      options: JS_LINTERS.map((l) => ({ value: l.value, label: l.label })),
    });
    if (cancelled(linter)) return null;
    choices.linter = linter as string;
  }

  if (!choices.namingConvention) {
    const naming = await p.select({
      message: '파일 네이밍 규칙을 선택하세요',
      options: NAMING_CONVENTIONS.map((n) => ({ value: n.value, label: n.label })),
    });
    if (cancelled(naming)) return null;
    choices.namingConvention = naming as string;
  }

  const orm = await p.select({
    message: 'ORM을 선택하세요',
    options: NODE_ORMS.map((o) => ({ value: o.value, label: o.label })),
  });
  if (cancelled(orm)) return null;
  choices.orm = orm as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  const testFramework = await p.select({
    message: '테스트 프레임워크를 선택하세요',
    options: FE_TEST_FRAMEWORKS.map((t) => ({ value: t.value, label: t.label })),
  });
  if (cancelled(testFramework)) return null;
  choices.testFramework = testFramework as string;

  return choices;
}

/**
 * Go 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptGo(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const orm = await p.select({
    message: 'ORM을 선택하세요',
    options: GO_ORMS.map((o) => ({ value: o.value, label: o.label })),
  });
  if (cancelled(orm)) return null;
  choices.orm = orm as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  const goLinter = await p.select({
    message: '린터를 선택하세요',
    options: GO_LINTERS.map((l) => ({ value: l.value, label: l.label })),
  });
  if (cancelled(goLinter)) return null;
  choices.goLinter = goLinter as string;

  return choices;
}

/**
 * Python 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptPython(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const pythonPm = await p.select({
    message: '패키지 매니저를 선택하세요',
    options: PYTHON_PACKAGE_MANAGERS.map((pm) => ({ value: pm.value, label: pm.label })),
  });
  if (cancelled(pythonPm)) return null;
  choices.pythonPackageManager = pythonPm as string;

  const ormOptions = PYTHON_ORMS.filter((o) => {
    if (o.value === 'sqlalchemy' || o.value === 'tortoise') return choices.stack === 'python-fastapi';
    if (o.value === 'django-orm') return choices.stack === 'python-django';
    return true;
  });
  const orm = await p.select({
    message: 'ORM을 선택하세요',
    options: ormOptions.map((o) => ({ value: o.value, label: o.label })),
  });
  if (cancelled(orm)) return null;
  choices.orm = orm as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  return choices;
}

/**
 * Java 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptJava(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const buildTool = await p.select({
    message: '빌드 도구를 선택하세요',
    options: JAVA_BUILD_TOOLS.map((b) => ({ value: b.value, label: b.label })),
  });
  if (cancelled(buildTool)) return null;
  choices.buildTool = buildTool as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  return choices;
}

/**
 * Rust 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptRust(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const orm = await p.select({
    message: 'ORM을 선택하세요',
    options: RUST_ORMS.map((o) => ({ value: o.value, label: o.label })),
  });
  if (cancelled(orm)) return null;
  choices.orm = orm as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  return choices;
}

/**
 * Kotlin 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptKotlin(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const buildTool = await p.select({
    message: '빌드 도구를 선택하세요',
    options: KOTLIN_BUILD_TOOLS.map((b) => ({ value: b.value, label: b.label })),
  });
  if (cancelled(buildTool)) return null;
  choices.buildTool = buildTool as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  return choices;
}

/**
 * .NET 백엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptDotnet(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: BE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const orm = await p.select({
    message: 'ORM을 선택하세요',
    options: DOTNET_ORMS.map((o) => ({ value: o.value, label: o.label })),
  });
  if (cancelled(orm)) return null;
  choices.orm = orm as string;

  const database = await p.select({
    message: 'DB를 선택하세요',
    options: DATABASES.map((d) => ({ value: d.value, label: d.label })),
  });
  if (cancelled(database)) return null;
  choices.database = database as string;

  const apiStyle = await p.select({
    message: 'API 스타일을 선택하세요',
    options: API_STYLES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(apiStyle)) return null;
  choices.apiStyle = apiStyle as string;

  if (!(await promptApiDocs(choices))) return null;

  return choices;
}
