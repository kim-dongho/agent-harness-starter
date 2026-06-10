/**
 * Agent Adapter 레지스트리
 *
 * getAdapter(type)로 에이전트별 어댑터를 가져온다.
 */
import type { AgentType, AgentAdapter } from './types.js';
import { claudeAdapter } from './claude.js';
import { cursorAdapter } from './cursor.js';
import { windsurfAdapter } from './windsurf.js';
import { clineAdapter } from './cline.js';
import { copilotAdapter } from './copilot.js';
import { aiderAdapter } from './aider.js';
import { geminiAdapter } from './gemini.js';
import { codexAdapter } from './codex.js';

const registry: Record<AgentType, AgentAdapter> = {
  claude: claudeAdapter,
  cursor: cursorAdapter,
  windsurf: windsurfAdapter,
  cline: clineAdapter,
  copilot: copilotAdapter,
  aider: aiderAdapter,
  gemini: geminiAdapter,
  codex: codexAdapter,
};

export function getAdapter(type: AgentType): AgentAdapter {
  return registry[type];
}

export function getAllAdapterTypes(): AgentType[] {
  return Object.keys(registry) as AgentType[];
}

export type { AgentType, AgentAdapter, HarnessConfig, AdapterOutput, GeneratedFile } from './types.js';
