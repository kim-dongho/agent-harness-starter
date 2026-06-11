/**
 * @fileoverview `harness metrics` 명령어
 *
 * .harness/metrics.jsonl을 읽어서 메트릭을 집계한다.
 */
import path from 'node:path';
import fs from 'fs-extra';
import pc from 'picocolors';

interface MetricEvent {
  ts: string;
  hook: string;
  event: string;
  file: string;
  codes?: string[];
}

export async function showMetrics(projectDir?: string, days = 7): Promise<void> {
  const root = path.resolve(projectDir ?? process.cwd());
  const metricsPath = path.join(root, '.harness', 'metrics.jsonl');

  if (!await fs.pathExists(metricsPath)) {
    console.log('메트릭 데이터가 없습니다. 하네스를 사용하면 자동으로 수집됩니다.');
    return;
  }

  const content = await fs.readFile(metricsPath, 'utf-8');
  const lines = content.trim().split('\n').filter(Boolean);

  // 기간 필터 — Date 객체로 파싱 (KST/UTC 혼재 대응)
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffMs = cutoff.getTime();

  const events: MetricEvent[] = [];
  for (const line of lines) {
    try {
      const evt = JSON.parse(line) as MetricEvent;
      const evtTime = new Date(evt.ts).getTime();
      if (!isNaN(evtTime) && evtTime >= cutoffMs) events.push(evt);
    } catch { /* 파싱 실패 무시 */ }
  }

  if (events.length === 0) {
    console.log(`최근 ${days}일간 메트릭 데이터가 없습니다.`);
    return;
  }

  // 집계
  const scopeBlocks = events.filter(e => e.hook === 'scope-guard' && e.event === 'block').length;
  const scaffoldBlocks = events.filter(e => e.hook === 'scaffold-guard' && e.event === 'block').length;
  const postWriteErrors = events.filter(e => e.hook === 'post-write' && e.event === 'error');
  const postWriteCleans = events.filter(e => e.hook === 'post-write' && e.event === 'clean');
  const totalPostWrite = postWriteErrors.length + postWriteCleans.length;

  // first-pass: 파일별 첫 이벤트가 clean이면 성공
  const firstByFile = new Map<string, string>();
  for (const evt of events.filter(e => e.hook === 'post-write')) {
    if (!firstByFile.has(evt.file)) firstByFile.set(evt.file, evt.event);
  }
  const firstPassSuccess = [...firstByFile.values()].filter(e => e === 'clean').length;
  const firstPassTotal = firstByFile.size;

  // self-heal: 같은 파일에 error → clean 순서
  const fileTimeline = new Map<string, string[]>();
  for (const evt of events.filter(e => e.hook === 'post-write')) {
    const arr = fileTimeline.get(evt.file) ?? [];
    arr.push(evt.event);
    fileTimeline.set(evt.file, arr);
  }
  let healSuccess = 0;
  let healTotal = 0;
  for (const [, timeline] of fileTimeline) {
    for (let i = 0; i < timeline.length; i++) {
      if (timeline[i] === 'error') {
        healTotal++;
        if (i + 1 < timeline.length && timeline[i + 1] === 'clean') healSuccess++;
      }
    }
  }

  // 에러 코드 빈도
  const codeCounts = new Map<string, number>();
  for (const evt of postWriteErrors) {
    for (const code of evt.codes ?? []) {
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
  }
  const topCodes = [...codeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // 출력
  console.log('');
  console.log(pc.bold(`📊 Harness Metrics (최근 ${days}일)`));
  console.log('─────────────────────────');
  console.log(`scope-guard 차단:    ${pc.red(String(scopeBlocks))}회`);
  console.log(`scaffold-guard 차단:  ${pc.red(String(scaffoldBlocks))}회`);
  console.log(`post-write 에러 감지: ${pc.yellow(String(postWriteErrors.length))}회`);
  if (healTotal > 0) {
    const healPct = Math.round(healSuccess / healTotal * 100);
    console.log(`self-heal 성공:      ${pc.green(`${healSuccess}/${healTotal}`)} (${healPct}%)`);
  }
  if (firstPassTotal > 0) {
    const fpPct = Math.round(firstPassSuccess / firstPassTotal * 100);
    console.log(`first-pass 성공:     ${pc.green(`${firstPassSuccess}/${firstPassTotal}`)} (${fpPct}%)`);
  }

  if (topCodes.length > 0) {
    console.log('');
    console.log(pc.bold('🔥 가장 많은 에러:'));
    for (const [code, count] of topCodes) {
      console.log(`  ${code}: ${count}회`);
    }
  }
  console.log('');
}
