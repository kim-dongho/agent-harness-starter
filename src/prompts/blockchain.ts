/**
 * @fileoverview 블록체인 스택 세부 프롬프트
 *
 * 현재 블록체인 스택은 별도 세부 옵션 없음.
 * 네트워크 설정은 사용자가 직접 config 파일에서 설정.
 */
import type { UserChoices } from './types.js';

/**
 * 블록체인 스택 세부 옵션을 프롬프트로 수집한다.
 * 현재는 별도 옵션 없이 바로 반환.
 */
export async function promptBlockchain(choices: UserChoices): Promise<UserChoices | null> {
  return choices;
}
