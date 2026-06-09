/**
 * 수동 프로젝트 생성 라우터
 *
 * CLI 도구가 없거나 실패했을 때 보일러플레이트를 직접 생성한다.
 * 각 스택별 생성 로직은 stacks/ 디렉토리에 분리되어 있다.
 */
import type { StackConfig } from '../prompts/types.js';

import { setupNodeExpress, setupNodeHono, setupNodeFastify } from './stacks/node.js';
import { setupGoGin, setupGoEcho, setupGoFiber } from './stacks/go.js';
import { setupJavaSpring } from './stacks/java.js';
import { setupPythonFastAPI, setupPythonDjango, setupPythonFlask } from './stacks/python.js';
import { setupRustAxum, setupRustActix } from './stacks/rust.js';
import { setupKotlinKtor } from './stacks/kotlin.js';
import { setupDotnet } from './stacks/dotnet.js';
import { setupAngular } from './stacks/angular.js';
import { setupAstro, setupSolidStart, setupQwik } from './stacks/frontend.js';
import {
  setupSolidityHardhat,
  setupSolidityFoundry,
  setupSolanaAnchor,
  setupMoveSui,
  setupMoveAptos,
  setupTonTact,
  setupCosmWasm,
} from './stacks/blockchain.js';

/**
 * CLI 도구 없이 보일러플레이트를 직접 생성한다.
 *
 * 스택에 따라 해당하는 수동 세팅 함수를 호출한다.
 *
 * @param projectDir - 프로젝트 디렉토리 절대 경로
 * @param config - 스택 설정 옵션
 */
export async function manualSetup(projectDir: string, config: StackConfig): Promise<void> {
  switch (config.stack) {
    // Backend — Node
    case 'node-express':
      return await setupNodeExpress(projectDir, config);
    case 'node-hono':
      return await setupNodeHono(projectDir, config);
    case 'node-fastify':
      return await setupNodeFastify(projectDir, config);

    // Backend — Go
    case 'go-gin':
      return await setupGoGin(projectDir, config);
    case 'go-echo':
      return await setupGoEcho(projectDir, config);
    case 'go-fiber':
      return await setupGoFiber(projectDir, config);

    // Backend — Java
    case 'java-spring':
      return await setupJavaSpring(projectDir, config);

    // Backend — Python
    case 'python-fastapi':
      return await setupPythonFastAPI(projectDir, config);
    case 'python-django':
      return await setupPythonDjango(projectDir, config);
    case 'python-flask':
      return await setupPythonFlask(projectDir, config);

    // Backend — Rust
    case 'rust-axum':
      return await setupRustAxum(projectDir);
    case 'rust-actix':
      return await setupRustActix(projectDir);

    // Backend — Kotlin
    case 'kotlin-ktor':
      return await setupKotlinKtor(projectDir);

    // Backend — .NET
    case 'dotnet':
      return await setupDotnet(projectDir);

    // Frontend — CLI 불안정 스택 fallback
    case 'angular':
      return await setupAngular(projectDir, config);
    case 'astro':
      return await setupAstro(projectDir, config);
    case 'solid-start':
      return await setupSolidStart(projectDir, config);
    case 'qwik':
      return await setupQwik(projectDir, config);

    // Blockchain — EVM
    case 'solidity-hardhat':
      return await setupSolidityHardhat(projectDir);
    case 'solidity-foundry':
      return await setupSolidityFoundry(projectDir);

    // Blockchain — Solana / Move / TON / Cosmos
    case 'solana-anchor':
      return await setupSolanaAnchor(projectDir);
    case 'move-sui':
      return await setupMoveSui(projectDir);
    case 'move-aptos':
      return await setupMoveAptos(projectDir);
    case 'ton-tact':
      return await setupTonTact(projectDir);
    case 'cosmwasm':
      return await setupCosmWasm(projectDir);
  }
}
