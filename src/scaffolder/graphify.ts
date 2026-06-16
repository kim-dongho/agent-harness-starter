/**
 * Step 4 — Graphify Knowledge Graph 세팅
 *
 * 1. .graphifyrc config 생성 (설치 여부 무관)
 * 2. graphify 미설치 시 자동 설치 (pip → pipx fallback)
 * 3. graphify . → 초기 Knowledge Graph 생성
 * 4. graphify hook install → git post-commit 훅으로 자동 갱신
 * 5. graphify <agent> install → 에이전트 연동
 */
import path from 'node:path';
import { execSync } from 'node:child_process';
import fs from 'fs-extra';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import type { AgentValue } from '../constants.js';
import type { UserChoices } from '../prompts/types.js';

/**
 * Graphify Knowledge Graph를 세팅한다.
 *
 * config 생성, 자동 설치, 초기 그래프 생성, git hook 설정, 에이전트 연동을 수행한다.
 *
 * @param projectDir - 프로젝트 루트 디렉토리 절대 경로
 * @param choices - 사용자 선택 결과
 * @param spinner - clack 스피너 인스턴스
 * @param steps - 진행 단계를 기록하는 문자열 배열
 */
export async function setupGraphify(
  projectDir: string,
  choices: UserChoices,
  spinner: ReturnType<typeof p.spinner>,
  steps: string[],
): Promise<void> {
  spinner.start('Graphify 설정 생성 중...');

  // 1. config 파일 미리 생성
  await writeGraphifyConfig(projectDir);

  // 2. 설치 확인 → 없으면 자동 설치
  const installed = await ensureGraphifyInstalled(spinner);

  // 3. 설치 성공 시 초기화 + hook
  if (installed) {
    spinner.start('Graphify Knowledge Graph 생성 중...');
    try {
      // graphify update: 코드만 AST 분석 (LLM 키 불필요, 빠름)
      execSync('graphify update .', { cwd: projectDir, stdio: 'pipe', timeout: 30000 });
      execSync('graphify hook install', { cwd: projectDir, stdio: 'pipe' });

      const agentCmd = getGraphifyAgentCmd(choices.agent);
      if (agentCmd) execSync(agentCmd, { cwd: projectDir, stdio: 'pipe' });

      // graphify claude install이 루트 CLAUDE.md에 쓰는 내용을 .claude/CLAUDE.md에 합침
      await mergeGraphifyIntoAgentConfig(projectDir, choices.agent);

      spinner.stop('Graphify 세팅 완료 — Knowledge Graph + git hook');
      steps.push(`${pc.green('✓')} Graphify — Knowledge Graph + git hook 자동 갱신`);
    } catch {
      spinner.stop('Graphify config 생성 완료 (초기화 실패)');
      steps.push(`${pc.yellow('⚠')} Graphify — config 생성됨. 수동 실행: graphify . && graphify hook install`);
    }
  } else {
    steps.push(`${pc.yellow('⚠')} Graphify — config 생성됨. 수동 설치 필요: pip install graphifyy`);
  }
}

/** graphify 설치 확인 → 없으면 pip/pipx로 자동 설치 */
async function ensureGraphifyInstalled(spinner: ReturnType<typeof p.spinner>): Promise<boolean> {
  try {
    execSync('graphify --version', { stdio: 'pipe' });
    return true;
  } catch {
    // pip 시도
    spinner.stop('Graphify 미설치 — 자동 설치 시도');
    spinner.start('Graphify 설치 중 (pip)...');
    try {
      execSync('pip install graphifyy', { stdio: 'pipe', timeout: 120000 });
      execSync('graphify install', { stdio: 'pipe', timeout: 30000 });
      spinner.stop('Graphify 설치 완료');
      return true;
    } catch {
      spinner.stop('pip 설치 실패 — pipx 시도');
      // pipx 시도
      spinner.start('Graphify 설치 중 (pipx)...');
      try {
        execSync('pipx install graphifyy', { stdio: 'pipe', timeout: 120000 });
        spinner.stop('Graphify 설치 완료');
        return true;
      } catch {
        spinner.stop('Graphify 설치 실패');
        p.log.warn('수동으로 설치하세요: pip install graphifyy && graphify install');
        return false;
      }
    }
  }
}

/** .graphifyrc + .graphifyignore + .gitignore 업데이트 */
async function writeGraphifyConfig(projectDir: string): Promise<void> {
  await fs.writeJson(path.join(projectDir, '.graphifyrc'), {
    output: 'graphify-out',
    ignore: [
      'node_modules', 'dist', '.next', 'build', 'target',
      '.git', '.turbo', '__pycache__', '.venv',
      '*.lock', '*.log',
    ],
  }, { spaces: 2 });

  // .graphifyignore는 생성하지 않음
  // graphify update는 코드만 AST 분석하므로 별도 제외 불필요

  const gitignorePath = path.join(projectDir, '.gitignore');
  if (await fs.pathExists(gitignorePath)) {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    if (!content.includes('graphify-out')) {
      await fs.appendFile(gitignorePath, '\n# Graphify\ngraphify-out/\n');
    }
  }
}

/** 에이전트별 graphify 연동 커맨드 */
function getGraphifyAgentCmd(agent: AgentValue): string | null {
  switch (agent) {
    case 'claude': return 'graphify claude install';
    case 'gemini': return 'graphify gemini install';
    case 'codex': return 'graphify codex install';
    default: return null;
  }
}

/**
 * graphify <agent> install이 루트에 만든 설정을 에이전트 디렉토리로 합친다.
 * 예: 루트 CLAUDE.md의 graphify 섹션 → .claude/CLAUDE.md에 append
 */
async function mergeGraphifyIntoAgentConfig(projectDir: string, agent: AgentValue): Promise<void> {
  if (agent === 'claude') {
    const rootClaude = path.join(projectDir, 'CLAUDE.md');
    const dotClaude = path.join(projectDir, '.claude', 'CLAUDE.md');

    if (await fs.pathExists(rootClaude)) {
      const graphifyContent = await fs.readFile(rootClaude, 'utf-8');

      if (await fs.pathExists(dotClaude)) {
        // .claude/CLAUDE.md에 append
        const existing = await fs.readFile(dotClaude, 'utf-8');
        if (!existing.includes('graphify')) {
          await fs.writeFile(dotClaude, existing + '\n' + graphifyContent);
        }
      }

      // 루트 CLAUDE.md 삭제 (중복 방지)
      await fs.remove(rootClaude);
    }
  }
  // cursor, gemini 등은 각자 디렉토리에 직접 쓰므로 별도 처리 불필요
}
