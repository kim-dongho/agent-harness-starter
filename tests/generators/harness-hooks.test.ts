import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { setupHarnessHooks } from '../../src/generators/harness-hooks.js';

const TMP = path.join(os.tmpdir(), 'harness-hooks-test');

async function makeProject(name: string): Promise<string> {
  const dir = path.join(TMP, name);
  await fs.ensureDir(dir);
  await fs.writeJson(path.join(dir, 'harness.config.json'), {
    project: { name, framework: 'unknown', language: 'typescript', packageManager: 'npm' },
    agent: { allowedScopes: ['src/**/*'] },
  });
  return dir;
}

beforeEach(async () => { await fs.ensureDir(TMP); });
afterEach(async () => { await fs.remove(TMP); });

describe('setupHarnessHooks — Claude Code', () => {
  it('hooks 복사 + settings.json 생성', async () => {
    const dir = await makeProject('claude-test');
    const count = await setupHarnessHooks(dir, 'claude');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.claude/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.claude/hooks/post-write.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.claude/settings.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.claude/settings.json'));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
    expect(settings.hooks.Stop).toBeDefined();
  });
});

describe('setupHarnessHooks — Gemini CLI', () => {
  it('hooks 복사 + settings.json 생성', async () => {
    const dir = await makeProject('gemini-test');
    const count = await setupHarnessHooks(dir, 'gemini');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.gemini/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.gemini/hooks/post-write.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.gemini/settings.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.gemini/settings.json'));
    expect(settings.hooks.BeforeTool).toBeDefined();
    expect(settings.hooks.AfterTool).toBeDefined();
    expect(settings.hooks.SessionStart).toBeDefined();
  });

  it('BeforeTool matcher가 write_file|edit_file', async () => {
    const dir = await makeProject('gemini-matcher');
    await setupHarnessHooks(dir, 'gemini');
    const settings = await fs.readJson(path.join(dir, '.gemini/settings.json'));
    expect(settings.hooks.BeforeTool[0].matcher).toBe('write_file|edit_file');
  });
});

describe('setupHarnessHooks — Codex CLI', () => {
  it('hooks 복사 + hooks.json 생성', async () => {
    const dir = await makeProject('codex-test');
    const count = await setupHarnessHooks(dir, 'codex');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.codex/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.codex/hooks.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.codex/hooks.json'));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
  });

  it('matcher가 Bash (file write 미지원)', async () => {
    const dir = await makeProject('codex-matcher');
    await setupHarnessHooks(dir, 'codex');
    const settings = await fs.readJson(path.join(dir, '.codex/hooks.json'));
    expect(settings.hooks.PreToolUse[0].matcher).toBe('Bash');
  });
});

describe('setupHarnessHooks — Cursor', () => {
  it('hooks 복사 + hooks.json 생성', async () => {
    const dir = await makeProject('cursor-test');
    const count = await setupHarnessHooks(dir, 'cursor');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.cursor/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.cursor/hooks.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.cursor/hooks.json'));
    expect(settings.hooks.PreToolUse).toBeDefined();
    expect(settings.hooks.PostToolUse).toBeDefined();
  });
});

describe('setupHarnessHooks — Windsurf', () => {
  it('hooks 복사 + hooks.json 생성', async () => {
    const dir = await makeProject('windsurf-test');
    const count = await setupHarnessHooks(dir, 'windsurf');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.windsurf/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.windsurf/hooks.json'))).toBe(true);
  });
});

describe('setupHarnessHooks — Cline', () => {
  it('hooks 복사 + hooks.json 생성', async () => {
    const dir = await makeProject('cline-test');
    const count = await setupHarnessHooks(dir, 'cline');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.clinerules/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.clinerules/hooks.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.clinerules/hooks.json'));
    expect(settings.hooks.PreToolUse).toBeDefined();
  });
});

describe('setupHarnessHooks — GitHub Copilot', () => {
  it('hooks 복사 + harness.json 생성', async () => {
    const dir = await makeProject('copilot-test');
    const count = await setupHarnessHooks(dir, 'copilot');
    expect(count).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(dir, '.github/hooks/scope-guard.sh'))).toBe(true);
    expect(await fs.pathExists(path.join(dir, '.github/hooks/harness.json'))).toBe(true);
    const settings = await fs.readJson(path.join(dir, '.github/hooks/harness.json'));
    expect(settings.version).toBe(1);
    expect(settings.hooks.preToolUse).toBeDefined();
    expect(settings.hooks.postToolUse).toBeDefined();
    expect(settings.hooks.sessionStart).toBeDefined();
  });
});

describe('setupHarnessHooks — Aider', () => {
  it('hooks 생성하지 않음 (lint-cmd만 지원)', async () => {
    const dir = await makeProject('aider-test');
    const count = await setupHarnessHooks(dir, 'aider');
    expect(count).toBe(0);
    expect(await fs.pathExists(path.join(dir, '.aider/hooks'))).toBe(false);
  });
});

describe('setupHarnessHooks — 공통', () => {
  it('hook 파일이 실행 권한(755)을 가짐', async () => {
    const dir = await makeProject('perm-test');
    await setupHarnessHooks(dir, 'claude');
    const stat = await fs.stat(path.join(dir, '.claude/hooks/scope-guard.sh'));
    expect(stat.mode & 0o755).toBe(0o755);
  });

  it('기존 settings.json이 있으면 hooks만 추가', async () => {
    const dir = await makeProject('merge-test');
    const settingsPath = path.join(dir, '.claude/settings.json');
    await fs.ensureDir(path.dirname(settingsPath));
    await fs.writeJson(settingsPath, { existingKey: 'preserved' });
    await setupHarnessHooks(dir, 'claude');
    const settings = await fs.readJson(settingsPath);
    expect(settings.existingKey).toBe('preserved');
    expect(settings.hooks).toBeDefined();
  });
});
