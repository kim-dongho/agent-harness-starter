/**
 * @fileoverview 모바일 스택 세부 프롬프트
 *
 * React Native, Flutter 등 모바일 스택에 특화된
 * 아키텍처, 상태관리, 네비게이션 옵션을 수집한다.
 */
import * as p from '@clack/prompts';
import {
  PACKAGE_MANAGERS,
  MOBILE_STATE_MANAGEMENT,
  MOBILE_NAVIGATION,
  MOBILE_ARCHITECTURES,
} from '../constants.js';
import { cancelled } from './common.js';
import type { UserChoices } from './types.js';

/**
 * 모바일 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * 스택에 따라 Flutter/React Native 전용 옵션을 필터링하여 표시한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 세부 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptMobile(choices: UserChoices): Promise<UserChoices | null> {
  const architecture = await p.select({
    message: '아키텍처를 선택하세요',
    options: MOBILE_ARCHITECTURES.map((a) => ({ value: a.value, label: a.label })),
  });
  if (cancelled(architecture)) return null;
  choices.architecture = architecture as string;

  const stateOptions = MOBILE_STATE_MANAGEMENT.filter((s) => {
    if (['riverpod', 'bloc', 'provider'].includes(s.value)) return choices.stack === 'flutter';
    if (['redux', 'zustand-rn'].includes(s.value)) return choices.stack === 'react-native';
    return true;
  });
  const stateManagement = await p.select({
    message: '상태관리를 선택하세요',
    options: stateOptions.map((s) => ({ value: s.value, label: s.label })),
  });
  if (cancelled(stateManagement)) return null;
  choices.stateManagement = stateManagement as string;

  const navOptions = MOBILE_NAVIGATION.filter((n) => {
    if (['go-router', 'auto-route'].includes(n.value)) return choices.stack === 'flutter';
    if (['react-navigation', 'expo-router'].includes(n.value)) return choices.stack === 'react-native';
    return true;
  });
  const navigation = await p.select({
    message: '네비게이션을 선택하세요',
    options: navOptions.map((n) => ({ value: n.value, label: n.label })),
  });
  if (cancelled(navigation)) return null;
  choices.navigation = navigation as string;

  if (choices.stack === 'react-native') {
    const packageManager = await p.select({
      message: '패키지 매니저를 선택하세요',
      options: PACKAGE_MANAGERS.map((pm) => ({ value: pm.value, label: pm.label })),
    });
    if (cancelled(packageManager)) return null;
    choices.packageManager = packageManager as string;
  }

  return choices;
}
