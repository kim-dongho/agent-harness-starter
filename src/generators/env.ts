/**
 * .env.example 동적 생성기
 *
 * 선택한 스택/DB/네트워크에 맞게 환경변수 템플릿을 생성한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import { getStackCategory } from '../constants.js';
import type { UserChoices, StackConfig } from '../prompts/types.js';

/**
 * 스택/DB/네트워크에 맞는 .env.example 파일을 동적으로 생성한다.
 *
 * 모노레포인 경우 각 앱별 환경변수를 섹션으로 구분하여 생성한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 */
export async function generateEnvExample(projectDir: string, choices: UserChoices): Promise<void> {
  const lines: string[] = [];

  if (choices.repoStructure === 'monorepo' && choices.stacks) {
    for (const s of choices.stacks) {
      const appLines = getEnvForStack(s);
      if (appLines.length > 0) {
        const app = getAppName(s.stack);
        lines.push(`# ─── ${app} (${s.stack}) ───`);
        lines.push(...appLines);
        lines.push('');
      }
    }
  } else {
    lines.push(...getEnvForStack(choices));
  }

  // Jira API 키
  if (choices.issueTracker === 'jira') {
    lines.push('');
    lines.push('# ─── Jira ───');
    lines.push('JIRA_URL=https://your-domain.atlassian.net');
    lines.push('JIRA_EMAIL=');
    lines.push('JIRA_TOKEN=');
  }

  // 항상 .env.example 생성 (내용이 없더라도 빈 템플릿)
  if (lines.length === 0) {
    lines.push('# Environment variables');
    lines.push('NODE_ENV=development');
  }
  await fs.writeFile(path.join(projectDir, '.env.example'), lines.join('\n') + '\n');
}

function getEnvForStack(config: StackConfig): string[] {
  const lines: string[] = [];
  const category = getStackCategory(config.stack);

  // Frontend
  if (category === 'frontend') {
    if (['nextjs-app', 'nextjs-pages'].includes(config.stack)) {
      lines.push('NEXT_PUBLIC_API_URL=http://localhost:8080');
    } else {
      lines.push('VITE_API_URL=http://localhost:8080');
    }
  }

  // Backend — 공통
  if (['node-backend', 'go', 'python', 'java', 'rust', 'kotlin', 'dotnet'].includes(category)) {
    lines.push('PORT=8080');

    // DB
    if (config.database === 'postgresql') {
      lines.push('DATABASE_URL=postgresql://postgres:postgres@localhost:5432/app');
    } else if (config.database === 'mysql') {
      lines.push('DATABASE_URL=mysql://root:root@localhost:3306/app');
    } else if (config.database === 'mongodb') {
      lines.push('DATABASE_URL=mongodb://localhost:27017/app');
    } else if (config.database === 'sqlite') {
      lines.push('DATABASE_URL=file:./dev.db');
    }
  }

  // Python 특화
  if (category === 'python') {
    if (config.stack === 'python-django') {
      lines.push('DJANGO_SECRET_KEY=change-me');
      lines.push('DJANGO_DEBUG=true');
    }
  }

  // Blockchain
  if (category === 'blockchain') {
    lines.push('DEPLOYER_PRIVATE_KEY=');

    // 네트워크별 API 키
    if (config.network === 'ethereum') {
      lines.push('ETHERSCAN_API_KEY=');
      lines.push('INFURA_API_KEY=');
    } else if (config.network === 'polygon') {
      lines.push('POLYGONSCAN_API_KEY=');
    } else if (config.network === 'arbitrum') {
      lines.push('ARBISCAN_API_KEY=');
    } else if (config.network === 'base') {
      lines.push('BASESCAN_API_KEY=');
    }

    // 스택별
    if (config.stack === 'solana-anchor') {
      lines.push('SOLANA_RPC_URL=https://api.devnet.solana.com');
      lines.push('ANCHOR_WALLET=~/.config/solana/id.json');
    } else if (['move-sui', 'move-aptos'].includes(config.stack)) {
      lines.push(`${config.stack === 'move-sui' ? 'SUI' : 'APTOS'}_RPC_URL=https://fullnode.devnet.${config.stack === 'move-sui' ? 'sui' : 'aptoslabs'}.io`);
    } else if (config.stack === 'ton-tact') {
      lines.push('TON_API_KEY=');
      lines.push('TON_NETWORK=testnet');
    } else if (config.stack === 'cosmwasm') {
      lines.push('CHAIN_RPC_URL=');
      lines.push('CHAIN_ID=');
    }
  }

  return lines;
}

function getAppName(stack: string): string {
  const map: Record<string, string> = {
    'nextjs-app': 'web', 'nextjs-pages': 'web', 'react-vite': 'web',
    'vue-vite': 'web', 'nuxt': 'web', 'sveltekit': 'web', 'angular': 'web',
    'go-gin': 'api', 'go-echo': 'api', 'java-spring': 'api',
    'python-fastapi': 'api', 'python-django': 'api',
    'node-express': 'api', 'node-nestjs': 'api', 'node-hono': 'api',
    'solidity-hardhat': 'contracts', 'solidity-foundry': 'contracts',
    'solana-anchor': 'contracts', 'move-sui': 'contracts', 'move-aptos': 'contracts',
    'ton-tact': 'contracts', 'cosmwasm': 'contracts',
    'react-native': 'mobile', 'flutter': 'mobile',
  };
  return map[stack] ?? stack;
}
