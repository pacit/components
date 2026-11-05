import { test } from '@playwright/test';
import { appendFileSync } from 'node:fs';

const SECONDS = Number(process.env['PROBE_SECONDS'] ?? 60);
const OUT = process.env['PROBE_OUT'] ?? 'tmp/live-probe/result.jsonl';
const MODES = (process.env['PROBE_MODES'] ?? 'idle,set').split(',');
const SPAN = process.env['PROBE_SPAN'] ?? '600';
const LABEL = process.env['PROBE_LABEL'] ?? 'after';

const pct = (xs: number[], p: number) => {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  return +s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))].toFixed(2);
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

for (const mode of MODES) {
  test(`live ${mode}`, async ({ page, browserName }) => {
    await page.goto(`/live-probe?mode=${mode}&span=${SPAN}`);
    await page.locator('[data-testid=chart-live] path[data-pct-part=series]').first().waitFor({ state: 'attached' });
    await page.waitForTimeout(2000);
    const r = await page.evaluate(async (seconds) => {
      const gc = (globalThis as { gc?: () => void }).gc;
      gc?.();
      const probe = (globalThis as any).__probe;
      await probe.run(seconds);
      gc?.();
      const mem = (performance as any).memory?.usedJSHeapSize ?? 0;
      return { ...probe.results, heapAfterGc: mem, paths: document.querySelectorAll('[data-testid=chart-live] path').length };
    }, SECONDS);
    const row = {
      engine: browserName,
      mode,
      seconds: SECONDS,
      cond: { series: 8, points: 60000, rate: 10, span: +SPAN, code: LABEL, viewport: '1200x800', chart: '900x400', build: 'production' },
      ticks: r.build.length,
      rendered: r.render.length,
      build: { p50: pct(r.build, 50), p95: pct(r.build, 95), max: pct(r.build, 100) },
      render: { p50: pct(r.render, 50), p95: pct(r.render, 95), max: pct(r.render, 100) },
      frames: r.frames.length,
      frame: { p50: pct(r.frames, 50), p95: pct(r.frames, 95), p99: pct(r.frames, 99), max: pct(r.frames, 100) },
      longFrames50: r.frames.filter((f: number) => f > 50).length,
      busyShare: r.render.length ? +((sum(r.build) + sum(r.render)) / (SECONDS * 1000)).toFixed(3) : 0,
      heapMB: { start: +(r.heapStart / 2 ** 20).toFixed(1), end: +(r.heapEnd / 2 ** 20).toFixed(1), afterGc: +(r.heapAfterGc / 2 ** 20).toFixed(1) },
      paths: r.paths,
    };
    appendFileSync(OUT, JSON.stringify(row) + '\n');
    console.log(JSON.stringify(row));
  });
}
