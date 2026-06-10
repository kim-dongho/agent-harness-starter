/**
 * @fileoverview 스택 규칙 로더
 *
 * `templates/rules/stack/` 디렉토리에서 스택별 규칙 md 파일을 읽는다.
 * 어댑터가 이 함수를 호출해서 스택 특화 규칙을 가져온다.
 */
import path from 'node:path';
import fs from 'fs-extra';

/**
 * 스택별 규칙 파일을 읽어서 하나의 문자열로 합친다.
 *
 * 파일 분리가 불가능한 에이전트(Aider, Gemini)에서 사용한다.
 *
 * @param templatesDir - templates 루트 디렉토리 절대 경로
 * @param stackDirs - 로드할 스택 디렉토리 이름 배열 (예: ['react', 'nextjs', 'general-ts'])
 * @returns 모든 스택 규칙을 합친 문자열 (빈 경우 빈 문자열)
 */
export async function loadStackRules(templatesDir: string, stackDirs: string[]): Promise<string> {
  const parts: string[] = [];

  for (const dir of stackDirs) {
    const dirPath = path.join(templatesDir, 'rules', 'stack', dir);
    if (!(await fs.pathExists(dirPath))) continue;

    const files = await fs.readdir(dirPath);
    for (const file of files.sort()) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      parts.push(content.trim());
    }
  }

  return parts.join('\n\n');
}

/**
 * 스택별 규칙 파일을 디렉토리별로 분리하여 반환한다.
 *
 * 파일 분리 가능한 에이전트(Claude, Cursor 등)에서 사용한다.
 * 각 스택 디렉토리의 md 파일들을 합쳐서 디렉토리명을 키로 반환한다.
 *
 * @param templatesDir - templates 루트 디렉토리 절대 경로
 * @param stackDirs - 로드할 스택 디렉토리 이름 배열
 * @returns 디렉토리명 → 합쳐진 규칙 문자열 맵 (예: { react: '# React Rules\n...', 'general-ts': '...' })
 */
export async function loadStackRulesByDir(templatesDir: string, stackDirs: string[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};

  for (const dir of stackDirs) {
    const dirPath = path.join(templatesDir, 'rules', 'stack', dir);
    if (!(await fs.pathExists(dirPath))) continue;

    const parts: string[] = [];
    const files = await fs.readdir(dirPath);
    for (const file of files.sort()) {
      if (!file.endsWith('.md')) continue;
      const content = await fs.readFile(path.join(dirPath, file), 'utf-8');
      parts.push(content.trim());
    }
    if (parts.length > 0) {
      result[dir] = parts.join('\n\n');
    }
  }

  return result;
}
