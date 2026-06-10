/**
 * Agent Adapter 레지스트리
 *
 * getAdapter(type)로 에이전트별 어댑터를 가져온다.
 */
import type { AgentType, AgentAdapter } from './types.js';
import { claudeAdapter } from './agents/claude.js';
import { cursorAdapter } from './agents/cursor.js';
import { windsurfAdapter } from './agents/windsurf.js';
import { clineAdapter } from './agents/cline.js';
import { copilotAdapter } from './agents/copilot.js';
import { aiderAdapter } from './agents/aider.js';
import { geminiAdapter } from './agents/gemini.js';
import { codexAdapter } from './agents/codex.js';

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
