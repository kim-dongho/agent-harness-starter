/**
 * @fileoverview 블록체인 스택 세부 프롬프트
 *
 * 블록체인 네트워크 선택 등 블록체인에 특화된 옵션을 수집한다.
 */
import * as p from '@clack/prompts';
import { BLOCKCHAIN_NETWORKS } from '../constants.js';
import { cancelled } from './common.js';
import type { UserChoices } from './types.js';

/**
 * 블록체인 스택 세부 옵션을 프롬프트로 수집한다.
 *
 * @param choices - 기존 선택 결과
 * @returns 네트워크 옵션이 추가된 선택 결과 또는 취소 시 null
 */
export async function promptBlockchain(choices: UserChoices): Promise<UserChoices | null> {
  const network = await p.select({
    message: '네트워크를 선택하세요',
    options: BLOCKCHAIN_NETWORKS.map((n) => ({ value: n.value, label: n.label })),
  });
  if (cancelled(network)) return null;
  choices.network = network as string;

  return choices;
}
