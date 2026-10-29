import { test, type Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// Probes behind the chart decisions (plan-charts, phase 0). Each writes JSONL rows carrying
// the condition it ran under; ids are the ids of the rows in the decision's measurement table.
const here = import.meta.dirname;
const axePath = join(here, '../../node_modules/axe-core/axe.min.js');
const out = join(here, process.env.PROBE_OUT ?? 'run');
mkdirSync(out, { recursive: true });

async function open(page: Page) {
  await page.goto(pathToFileURL(join(here, 'page.html')).href);
  await page.addScriptTag({ path: axePath });
}
async function cond(page: Page, browserName: string, extra: Record<string, unknown> = {}) {
  return {
    engine: browserName,
    version: page.context().browser()?.version(),
    lang: await page.evaluate(() => navigator.language),
    zone: await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone),
    dpr: await page.evaluate(() => devicePixelRatio),
    viewport: page.viewportSize(),
    load: (await import('node:fs')).readFileSync('/proc/loadavg', 'utf8').trim(),
    headless: true,
    ...extra,
  };
}
function write(project: string, probe: string, c: unknown, result: unknown) {
  appendFileSync(join(out, `${project}.jsonl`), JSON.stringify({ probe, cond: c, result }) + '\n');
}
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'experimental'];

test('P1 pinch: svg, svg-transform, canvas', async ({ page, browserName }, info) => {
  await open(page);
  for (const throttle of browserName === 'chromium' ? [1, 4] : [1]) {
    if (throttle > 1) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle });
    }
    const c = await cond(page, browserName, { cpuThrottle: throttle });
    for (let round = 0; round < 2; round++) {
      for (const mode of (process.env.PROBE_MODES ?? 'idle,svg-static,svg,svg-pyramid,svg-pyramid-2,svg-pyramid-int,svg-transform,canvas').split(',')) {
        const r = await page.evaluate((m) => (window as any).probe.pinch(m, 3), mode);
        write(info.project.name, 'P1', c, { round, ...r });
      }
    }
  }
});

test('P2 decimation and the copy into typed arrays', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  const rows = await page.evaluate(() => (window as any).probe.decimation());
  for (const r of rows) write(info.project.name, 'P2', c, r);
});

test('P3 text width: measureText against the SVG text', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  write(info.project.name, 'P3', c, await page.evaluate(() => (window as any).probe.textWidths()));
});

test.describe('P6 pointer and touch', () => {
  test.use({ hasTouch: true });
  test('P6', async ({ page, browserName }, info) => {
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog());
    const c = await cond(page, browserName, { hasTouch: true });
    const box = (await page.locator('#touch').boundingBox())!;
    const read = async () => {
      const r = await page.evaluate(() => {
        const l = (window as any).probe.log as { type: string }[];
        const copy = l.slice();
        l.length = 0;
        return { events: copy, scrollY: Math.round(scrollY) };
      });
      const counts: Record<string, number> = {};
      for (const e of r.events as { on: string; type: string; pointerType?: string; id?: number; ctrl?: boolean }[]) {
        const k = `${e.on}:${e.type}${e.pointerType ? ':' + e.pointerType : ''}${e.type === 'wheel' ? ':ctrl=' + e.ctrl : ''}`;
        counts[k] = (counts[k] ?? 0) + 1;
      }
      const ids = [...new Set((r.events as { id?: number }[]).map((e) => e.id).filter((v) => v !== undefined))];
      return { counts, pointerIds: ids.length, scrollY: r.scrollY };
    };

    // a — a tap through Playwright's own touchscreen, the one call every engine has
    try {
      await page.touchscreen.tap(box.x + 100, box.y + 100);
      write(info.project.name, 'P6a-tap', c, await read());
    } catch (e) {
      write(info.project.name, 'P6a-tap', c, { error: String(e).slice(0, 200) });
    }

    // b — Ctrl + wheel, which is also what a touchpad pinch arrives as; with a passive listener
    // and with one that cancels it, reading the visual viewport's scale after each
    for (const active of [false, true]) {
      await open(page);
      await page.evaluate((a) => (window as any).probe.pointerLog(a), active);
      await page.mouse.move(box.x + 200, box.y + 150);
      await page.keyboard.down('Control');
      await page.mouse.wheel(0, -100);
      await page.keyboard.up('Control');
      await page.waitForTimeout(300);
      const scale = await page.evaluate(() => (window as any).probe.scale());
      write(info.project.name, active ? 'P6b-ctrl-wheel-cancelled' : 'P6b-ctrl-wheel-passive', c, { ...(await read()), viewportScale: scale });
    }
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));

    // c, d, e — real touch sequences, which only Chromium's protocol can drive
    if (browserName !== 'chromium') {
      write(info.project.name, 'P6c-drag-x', c, { unavailable: 'no multi-step touch input outside the Chromium protocol' });
      return;
    }
    const cdp = await page.context().newCDPSession(page);
    const touch = async (type: string, points: { x: number; y: number; id: number }[]) =>
      cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
    const drag = async (from: { x: number; y: number }, to: { x: number; y: number }) => {
      await touch('touchStart', [{ ...from, id: 1 }]);
      for (let i = 1; i <= 10; i++) {
        await touch('touchMove', [{ x: from.x + ((to.x - from.x) * i) / 10, y: from.y + ((to.y - from.y) * i) / 10, id: 1 }]);
      }
      await touch('touchEnd', []);
      await page.waitForTimeout(200);
    };
    const free = (await page.locator('#free').boundingBox())!;
    write(info.project.name, 'P6-layout', c, { touch: box, free, viewport: page.viewportSize() });
    await drag({ x: box.x + 50, y: box.y + 130 }, { x: box.x + 350, y: box.y + 130 });
    write(info.project.name, 'P6c-drag-x', c, await read());
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));
    await drag({ x: box.x + 250, y: box.y + 220 }, { x: box.x + 250, y: box.y + 20 });
    write(info.project.name, 'P6d-drag-y', c, await read());
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));
    await drag({ x: free.x + 250, y: free.y + 220 }, { x: free.x + 250, y: free.y + 20 });
    write(info.project.name, 'P6d-drag-y-control', c, await read());
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));
    await drag({ x: free.x + 50, y: free.y + 130 }, { x: free.x + 350, y: free.y + 130 });
    write(info.project.name, 'P6c-drag-x-control', c, await read());
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));
    {
      const fx = free.x + 250;
      const fy = free.y + 130;
      await touch('touchStart', [{ x: fx - 20, y: fy, id: 1 }, { x: fx + 20, y: fy, id: 2 }]);
      for (let i = 1; i <= 10; i++) {
        await touch('touchMove', [{ x: fx - 20 - i * 10, y: fy, id: 1 }, { x: fx + 20 + i * 10, y: fy, id: 2 }]);
      }
      await touch('touchEnd', []);
      await page.waitForTimeout(200);
      write(info.project.name, 'P6e-pinch-control', c, { ...(await read()), viewportScale: await page.evaluate(() => (window as any).probe.scale()) });
    }
    await open(page);
    await page.evaluate(() => (window as any).probe.pointerLog(false));
    const cx = box.x + 250;
    const cy = box.y + 130;
    await touch('touchStart', [{ x: cx - 20, y: cy, id: 1 }, { x: cx + 20, y: cy, id: 2 }]);
    for (let i = 1; i <= 10; i++) {
      await touch('touchMove', [{ x: cx - 20 - i * 10, y: cy, id: 1 }, { x: cx + 20 + i * 10, y: cy, id: 2 }]);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(200);
    write(info.project.name, 'P6e-pinch', c, await read());
  });
});

test('P8 accessibility shapes of the focus stop', async ({ page, browserName }, info) => {
  await open(page);
  await page.evaluate(() => (window as any).probe.a11y());
  const c = await cond(page, browserName);
  for (const id of ['vA', 'vB', 'vC', 'vD', 'vE', 'vF', 'vG']) {
    const axe = await page.evaluate(
      async ({ selector, tags }) => {
        // @ts-expect-error axe is injected
        const r = await window.axe.run(selector, { runOnly: { type: 'tag', values: tags } });
        const brief = (xs: { id: string; nodes: unknown[] }[]) => xs.map((x) => `${x.id}×${x.nodes.length}`);
        return { violations: brief(r.violations), incomplete: brief(r.incomplete) };
      },
      { selector: `#${id}`, tags: AXE_TAGS },
    );
    const roles = await page.evaluate((id) => {
      return [...document.querySelectorAll(`#${id} [role], #${id} [tabindex]`)].map((el) => {
        const e = el as Element & { computedRole?: string; computedName?: string };
        return { tag: e.tagName.toLowerCase(), role: e.computedRole ?? 'n/a', name: e.computedName ?? 'n/a' };
      });
    }, id);
    const focusable = page.locator(`#${id} [tabindex="0"], #${id} input`).first();
    await focusable.focus();
    await page.keyboard.press('ArrowRight');
    write(info.project.name, 'P8', c, { variant: id, axe, roles });
  }
  write(info.project.name, 'P8-keys', c, await page.evaluate(() => (window as any).probe.keys()));
});
