import { test, type Page } from '@playwright/test';
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const here = import.meta.dirname;
const axePath = join(here, '../../node_modules/axe-core/axe.min.js');
const out = join(here, process.env.PROBE_OUT ?? 'run');
mkdirSync(out, { recursive: true });

async function open(page: Page) {
  await page.goto(pathToFileURL(join(here, 'page.html')).href);
  await page.addScriptTag({ path: axePath });
}
async function cond(page: Page, browserName: string) {
  return {
    engine: browserName,
    version: page.context().browser()?.version(),
    lang: await page.evaluate(() => navigator.language),
    viewport: page.viewportSize(),
    headless: true,
  };
}
function write(project: string, probe: string, c: unknown, result: unknown) {
  appendFileSync(join(out, `${project}.jsonl`), JSON.stringify({ probe, cond: c, result }) + '\n');
}
const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice', 'experimental'];
async function axe(page: Page, selector = '#root') {
  return page.evaluate(
    async ({ selector, tags }) => {
      // @ts-expect-error axe is injected
      const r = await window.axe.run(selector, { runOnly: { type: 'tag', values: tags } });
      const brief = (xs: { id: string; nodes: unknown[] }[]) => xs.map((x) => `${x.id}×${x.nodes.length}`);
      return { violations: brief(r.violations), incomplete: brief(r.incomplete) };
    },
    { selector, tags: AXE_TAGS },
  );
}
async function roles(page: Page, selectors: string[]) {
  return page.evaluate((sels) => {
    const o: Record<string, unknown> = {};
    for (const s of sels) {
      const el = document.querySelector(s) as (Element & { computedRole?: string; computedName?: string }) | null;
      o[s] = el ? { role: el.computedRole ?? 'n/a', name: el.computedName ?? 'n/a' } : 'missing';
    }
    return o;
  }, selectors);
}

test('P1 bare table', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  for (const n of [500, 1000, 2000, 3000, 5000, 10000, 20000, 50000]) {
    const r = await page.evaluate((n) => (window as any).probe.bare(n), n);
    write(info.project.name, 'P1', c, r);
  }
  const cv = await page.evaluate(() => (window as any).probe.bare(10000, { cv: true }));
  write(info.project.name, 'P1-cv', c, cv);
});

test('P2 space of the rows not drawn', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  for (const kind of ['pseudo', 'tr', 'tr-td', 'transform']) {
    for (const [layout, vary] of [['auto', false], ['fixed', false], ['auto', true], ['fixed', true]] as const) {
      const r = await page.evaluate(({ kind, layout, vary }) => (window as any).probe.space(kind, { layout, vary }), { kind, layout, vary });
      const a = await axe(page);
      const rl = await roles(page, ['table', 'tbody > tr.spacer', 'tbody > tr:not(.spacer)']);
      let axRows: number | null = null;
      if (browserName === 'chromium') {
        const cdp = await page.context().newCDPSession(page);
        const { nodes } = (await cdp.send('Accessibility.getFullAXTree')) as { nodes: { role?: { value?: string }; ignored?: boolean }[] };
        axRows = nodes.filter((n) => !n.ignored && n.role?.value === 'row').length;
        await cdp.detach();
      }
      write(info.project.name, 'P2', c, { ...r, axe: a, roles: rl, axRows });
    }
  }
});

test('P3 a line of another height', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  for (const fractional of [false, true]) for (const correct of [false, true]) {
    for (const anchor of [false, true]) {
      const r = await page.evaluate((o) => (window as any).probe.heights(o), { correct, anchor, fractional });
      write(info.project.name, 'P3', c, r);
    }
  }
});

const head = '<caption>Devices</caption><thead><tr><th scope="col">Name</th><th scope="col">Room</th><th scope="col">Power</th></tr></thead>';
const STRUCTURES: Record<string, { html: string; roles: string[] }> = {
  'S1 tbody per group': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}
      <tbody><tr><th scope="rowgroup" colspan="3" id="g1"><button type="button" aria-expanded="true">Kitchen</button> 2 rows</th></tr>
        <tr><td>Lamp</td><td>Kitchen</td><td class="num">12.0</td></tr><tr><td>Boiler</td><td>Kitchen</td><td class="num">900.0</td></tr></tbody>
      <tbody><tr><th scope="rowgroup" colspan="3" id="g2"><button type="button" aria-expanded="false">Hall</button> 3 rows</th></tr></tbody>
      <tbody><tr><th scope="rowgroup" colspan="3" id="g3"><button type="button" aria-expanded="true">Garage</button> 1 row</th></tr>
        <tr><td>Door opener</td><td>Garage</td><td class="num">40.0</td></tr></tbody></table></div>`,
    roles: ['#g1', 'tbody tr:nth-child(2) td', 'table'],
  },
  'S1b group rows as td': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}
      <tbody><tr><td colspan="3" id="g1"><button type="button" aria-expanded="true">Kitchen</button> 2 rows</td></tr>
        <tr><td>Lamp</td><td>Kitchen</td><td class="num">12.0</td></tr><tr><td>Boiler</td><td>Kitchen</td><td class="num">900.0</td></tr></tbody></table></div>`,
    roles: ['#g1'],
  },
  'S2 details row': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}<tbody>
      <tr><td><button type="button" aria-expanded="true" aria-controls="d1">Lamp</button></td><td>Kitchen</td><td class="num">12.0</td></tr>
      <tr id="d1" class="details"><td colspan="3"><dl><dt>Room</dt><dd>Kitchen</dd><dt>Power</dt><dd>12.0 W</dd></dl></td></tr>
      <tr><td><button type="button" aria-expanded="false">Boiler</button></td><td>Kitchen</td><td class="num">900.0</td></tr></tbody></table></div>`,
    roles: ['#d1', '#d1 > td', 'dl'],
  },
  'S3 empty state outside the table': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}<tbody></tbody></table><p role="status">No devices match “xyz”.</p></div>`,
    roles: ['table', 'p'],
  },
  'S3b empty state inside the table': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}<tbody><tr><td colspan="3">No devices match “xyz”.</td></tr></tbody></table></div>`,
    roles: ['table', 'tbody td'],
  },
  'S3c empty table, no message': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table>${head}<tbody></tbody></table></div>`,
    roles: ['table'],
  },
  'S4 aria-rowindex without grid': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table aria-rowcount="1003">${head.replace('<tr>', '<tr aria-rowindex="1">')}<tbody>
      <tr aria-rowindex="502"><td>Lamp</td><td>Kitchen</td><td class="num">12.0</td></tr>
      <tr aria-rowindex="503"><td>Boiler</td><td>Kitchen</td><td class="num">900.0</td></tr></tbody>
      <tfoot><tr aria-rowindex="1003"><td>Total</td><td></td><td class="num">912.0</td></tr></tfoot></table></div>`,
    roles: ['table', 'tbody tr', 'thead tr'],
  },
  'S4b aria-rowindex with grid': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table role="grid" aria-rowcount="1003">${head.replace('<tr>', '<tr aria-rowindex="1">')}<tbody>
      <tr aria-rowindex="502"><td tabindex="0">Lamp</td><td tabindex="-1">Kitchen</td><td tabindex="-1">12.0</td></tr></tbody></table></div>`,
    roles: ['table', 'tbody tr', 'tbody td', 'thead th'],
  },
  'S5 spacer rows aria-hidden': {
    html: `<div class="frame" role="region" aria-label="Devices" tabindex="0"><table aria-rowcount="1001">${head.replace('<tr>', '<tr aria-rowindex="1">')}<tbody>
      <tr aria-hidden="true" class="spacer" style="height:3600px"></tr>
      <tr aria-rowindex="102"><td>Lamp</td><td>Kitchen</td><td class="num">12.0</td></tr>
      <tr aria-hidden="true" class="spacer" style="height:32000px"><td colspan="3"></td></tr></tbody></table></div>`,
    roles: ['tbody tr.spacer', 'tbody tr:not(.spacer)'],
  },
};

test('P4 axe on structures', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  for (const [name, s] of Object.entries(STRUCTURES)) {
    await page.evaluate((html) => { document.getElementById('root')!.innerHTML = html; }, s.html);
    const a = await axe(page);
    const rl = await roles(page, s.roles);
    write(info.project.name, 'P4', c, { structure: name, axe: a, roles: rl });
  }
});

test('P5 scroll ceiling', async ({ page, browserName }, info) => {
  await open(page);
  const c = await cond(page, browserName);
  for (const kind of ['block', 'tr', 'pseudo']) {
    const r = await page.evaluate((k) => (window as any).probe.ceiling(k), kind);
    write(info.project.name, 'P5', c, r);
  }
});
