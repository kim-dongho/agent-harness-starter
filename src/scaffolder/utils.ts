/**
 * @fileoverview 스캐폴더 공통 유틸리티
 *
 * 템플릿 경로, 스택 라벨 변환, 앱 이름 매핑 등 스캐폴더 전반에서 사용하는 헬퍼 함수를 제공한다.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { STACKS, type StackValue } from '../constants.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** 프로젝트 템플릿 파일이 위치한 디렉토리 절대 경로 */
export const TEMPLATES_DIR = path.resolve(__dirname, '..', '..', 'templates');

/**
 * 스택 식별자를 사람이 읽을 수 있는 라벨로 변환한다.
 *
 * @param stack - 스택 식별자 (예: 'nextjs-app')
 * @returns 스택 라벨 (예: 'Next.js (App Router)')
 */
export function getStackLabel(stack: StackValue): string {
  const all = [
    ...STACKS.frontend.items,
    ...STACKS.backend.items,
    ...STACKS.blockchain.items,
    ...STACKS.mobile.items,
  ];
  return all.find((s) => s.value === stack)?.label ?? stack;
}

/**
 * 모노레포에서 스택을 apps/ 하위 디렉토리명으로 매핑한다.
 *
 * @param stack - 스택 식별자
 * @returns 앱 디렉토리명 (예: 'web', 'api', 'contracts', 'mobile')
 *
 * @example
 * ```ts
 * getAppName('nextjs-app')       // 'web'
 * getAppName('go-gin')           // 'api'
 * getAppName('solidity-hardhat') // 'contracts'
 * ```
 */
export function getAppName(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'web',
    'nextjs-pages': 'web',
    'react-vite': 'web',
    'vue-vite': 'web',
    'nuxt': 'web',
    'sveltekit': 'web',
    'angular': 'web',
    'astro': 'web',
    'remix': 'web',
    'solid-start': 'web',
    'qwik': 'web',
    'go-gin': 'api',
    'go-echo': 'api',
    'go-fiber': 'api',
    'java-spring': 'api',
    'python-fastapi': 'api',
    'python-django': 'api',
    'python-flask': 'api',
    'node-express': 'api',
    'node-nestjs': 'api',
    'node-hono': 'api',
    'node-fastify': 'api',
    'rust-axum': 'api',
    'rust-actix': 'api',
    'kotlin-ktor': 'api',
    'dotnet': 'api',
    'solidity-hardhat': 'contracts',
    'solidity-foundry': 'contracts',
    'solana-anchor': 'contracts',
    'move-sui': 'contracts',
    'move-aptos': 'contracts',
    'ton-tact': 'contracts',
    'cosmwasm': 'contracts',
    'react-native': 'mobile',
    'flutter': 'mobile',
  };
  return map[stack] ?? stack;
}
