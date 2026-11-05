import { test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('profile set', async ({ page }) => {
  const span = process.env['PROBE_SPAN'] ?? '600';
  await page.goto(`/live-probe?mode=set&span=${span}`);
  await page.locator('[data-testid=chart-live] path[data-pct-part=series]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(2000);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 200 });
  await cdp.send('Profiler.start');
  await page.evaluate(() => (globalThis as any).__probe.run(5));
  const { profile } = await cdp.send('Profiler.stop');
  const self = new Map<string, number>();
  const byId = new Map(profile.nodes.map((n: any) => [n.id, n]));
  const dt = profile.timeDeltas as number[];
  const counts = new Map<number, number>();
  profile.samples.forEach((id: number, i: number) => counts.set(id, (counts.get(id) ?? 0) + (dt[i] ?? 0)));
  for (const [id, us] of counts) {
    const n: any = byId.get(id);
    const f = n.callFrame;
    const key = `${f.functionName || '(anon)'} ${f.url.split('/').pop()}:${f.lineNumber}`;
    self.set(key, (self.get(key) ?? 0) + us);
  }
  const top = [...self].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([k, us]) => `${(us / 1000).toFixed(1).padStart(8)} ms  ${k}`);
  writeFileSync(`tmp/live-probe/profile-${span}.txt`, top.join('\n') + '\n');
  writeFileSync(`tmp/live-probe/profile-${span}.cpuprofile`, JSON.stringify(profile));
  console.log(top.join('\n'));
});
