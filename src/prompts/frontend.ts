/**
 * @fileoverview 프론트엔드 스택 세부 프롬프트
 *
 * 아키텍처, 스타일링, 상태관리, 테스트, 폼, i18n 등
 * 프론트엔드에 특화된 옵션을 수집한다.
 */
import * as p from '@clack/prompts';
import {
  PACKAGE_MANAGERS,
  JS_LINTERS,
  NAMING_CONVENTIONS,
  STYLES,
  FE_STATE_MANAGEMENT,
  FE_TEST_FRAMEWORKS,
  FE_FORM_LIBRARIES,
  FE_I18N,
  FE_ARCHITECTURES,
} from '../constants.js';
import { cancelled, promptLanguage } from './common.js';
import type { UserChoices } from './types.js';

/**
 * 프론트엔드 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * 모노레포에서 이미 설정된 공통 옵션(language, packageManager 등)은 건너뛴다.
 *
 * @param choices - 기존 선택 결과 (공통 프롬프트에서 수집된 값)
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptFrontend(choices: UserChoices): Promise<UserChoices | null> {
  // 모노레포에서 이미 설정된 공통 옵션은 스킵
  if (!choices.language) {
    const language = await promptLanguage();
    if (language === null) return null;
    choices.language = language;
  }

  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: FE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
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

  const style = await p.select({
    message: '스타일링을 선택하세요',
    options: STYLES.map((s) => ({ value: s.value, label: s.label })),
  });
  if (cancelled(style)) return null;
  choices.style = style as string;

  const stateOptions = FE_STATE_MANAGEMENT.filter((s) => {
    if (s.value === 'pinia') return ['vue-vite', 'nuxt'].includes(choices.stack);
    if (s.value === 'ngrx') return choices.stack === 'angular';
    return true;
  });
  const stateManagement = await p.multiselect({
    message: '상태관리를 선택하세요 (space로 복수 선택)',
    options: stateOptions.map((s) => ({ value: s.value, label: s.label })),
    required: false,
  });
  if (cancelled(stateManagement)) return null;
  choices.stateManagement = (stateManagement as string[]).join(',');

  const testFramework = await p.select({
    message: '테스트 프레임워크를 선택하세요',
    options: FE_TEST_FRAMEWORKS.map((t) => ({ value: t.value, label: t.label })),
  });
  if (cancelled(testFramework)) return null;
  choices.testFramework = testFramework as string;

  const formOptions = FE_FORM_LIBRARIES.filter((f) => {
    if (f.value === 'vee-validate') return ['vue-vite', 'nuxt'].includes(choices.stack);
    return true;
  });
  const formLibrary = await p.select({
    message: '폼 라이브러리를 선택하세요',
    options: formOptions.map((f) => ({ value: f.value, label: f.label })),
  });
  if (cancelled(formLibrary)) return null;
  choices.formLibrary = formLibrary as string;

  const i18nOptions = FE_I18N.filter((i) => {
    if (i.value === 'next-intl') return ['nextjs-app', 'nextjs-pages'].includes(choices.stack);
    if (i.value === 'vue-i18n') return ['vue-vite', 'nuxt'].includes(choices.stack);
    return true;
  });
  const i18n = await p.select({
    message: 'i18n을 선택하세요',
    options: i18nOptions.map((i) => ({ value: i.value, label: i.label })),
  });
  if (cancelled(i18n)) return null;
  choices.i18n = i18n as string;

  return choices;
}
