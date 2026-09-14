#!/usr/bin/env node
/**
 * The assistive-technology pass: what a screen reader actually SAYS on each sandbox view
 * (`req-a11y-acr`) — the question no gate here can answer, since they end where axe ends.
 * It runs under `tools/at-pass.sh`, which puts a reader on a display of its own; alone:
 *   1. VIEWS — the routes come from the e2e suite's own list, parsed, never copied,
 *   2. DRIVE — each view loaded, the walk taken INTO its main region, then Tab until it leaves,
 *   3. WINDOW — every step carries the clock it began and ended on,
 *   4. TRANSCRIBE — the reader's log read back, each utterance attributed by that clock,
 *   5. RECORD — one file per reader under `docs/acr/at/`, per view and per stop.
 *
 * Step 2 separates a reading of this library from one of the sandbox's chrome: Tab from the
 * top spends thirty-three stops on theme switches and navigation before reaching a component.
 * Clicking a heading inside `main` moves Firefox's focus start — measured, not assumed.
 *
 * Usage: node tools/at-pass.mjs --drive <baseURL> <steps.json>
 *        node tools/at-pass.mjs --render <steps.json> <debug> <slug> <reader name>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VIEWS = 'apps/sandbox-e2e/src/support/views.ts';
const LOGS = 'docs/acr/at';

/** How long a stop is held open for the reader to finish speaking. Measured, not guessed. */
const DWELL_LOAD = 4500;
const DWELL_TAB = 1800;
/** The cap on tab stops per view. It is written into the record wherever it bit (no silent caps). */
const CAP = 12;
/** What counts as a stop of the Tab key, and so as a position inside the view's content. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

const read = (path) => readFileSync(join(ROOT, path), 'utf8');

/** 1. VIEWS — the same list the axe sweep audits, read out of the file that declares it. */
const routes = () => {
  const block = /export const SBX_ROUTES = \[([\s\S]*?)\] as const;/.exec(
    read(VIEWS),
  );
  if (!block) throw new Error(`${VIEWS}: no \`SBX_ROUTES\` array to read`);
  const found = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  if (!found.length) throw new Error(`${VIEWS}: \`SBX_ROUTES\` is empty`);
  return found;
};

/** Seconds since midnight — the clock the reader's own log is stamped in. */
const clock = (date = new Date()) =>
  date.getHours() * 3600 +
  date.getMinutes() * 60 +
  date.getSeconds() +
  date.getMilliseconds() / 1000;

// ── 2 and 3: drive, and stamp every step ──────────────────────────────────────

const drive = async (baseURL, out) => {
  const { firefox } = await import('playwright');
  const browser = await firefox.launch({
    headless: false,
    firefoxUserPrefs: { 'accessibility.force_disabled': 0 },
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });

  /**
   * What the browser gave focus to, where it sits among the view's own stops, and whether it
   * is still inside them. The POSITION is what says whether Tab moved: two radios of one
   * group describe themselves identically, so a description compared with the last one ends
   * the walk on the second of them.
   */
  const focus = () =>
    page.evaluate((selector) => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement)
        return null;
      // `textContent` joins a label to the text under it with no space between them, and a
      // blind cut at a character count leaves half a word behind — a record whose own words
      // break mid-letter cannot be read. `innerText` renders, so its first line is the name.
      const raw =
        el.getAttribute('aria-label') ?? el.innerText ?? el.textContent ?? '';
      const one = raw.trim().split('\n')[0].replace(/\s+/g, ' ').trim();
      const name =
        one.length <= 40 ? one : `${one.slice(0, 40).replace(/\s+\S*$/, '')}…`;
      const tag = el.tagName.toLowerCase();
      const part = el.getAttribute('data-pct-part');
      const main = document.querySelector('main');
      return {
        what: `${tag}${part ? `[${part}]` : ''}${name ? ` "${name}"` : ''}`,
        inMain: !!el.closest('main'),
        at: main ? [...main.querySelectorAll(selector)].indexOf(el) : -1,
      };
    }, FOCUSABLE);

  const steps = [];
  const step = async (route, label, dwell, act) => {
    const from = clock();
    await act();
    await page.waitForTimeout(dwell);
    const at = await focus().catch(() => null);
    steps.push({ route, label, from, to: clock(), focus: at });
    return at;
  };

  const all = routes();
  for (const [index, route] of all.entries()) {
    process.stderr.write(
      `  [${String(index + 1).padStart(2)}/${all.length}] ${route}\n`,
    );
    await step(route, 'arrive', DWELL_LOAD, () =>
      page.goto(`${baseURL}${route}`, { waitUntil: 'load' }),
    );
    // The walk is put on the view's first stop outright. Tabbing to it from the top of the
    // page was tried twice and is the wrong instrument: thirty-three stops of the sandbox's
    // own chrome come first, and walking them at speed floods the reader — it queues, then
    // interrupts itself, and the stops that follow come out silent. A click on the heading
    // moves Firefox's focus start and was tried too; with a reader attached it silently
    // does not take on some views. This takes.
    const entered = await step(route, 'enter', DWELL_TAB, () =>
      page.evaluate((selector) => {
        const first = document.querySelector('main')?.querySelector(selector);
        first?.focus();
      }, FOCUSABLE),
    );
    if (!entered?.inMain)
      steps.at(-1).note =
        'no stop of its own inside `main` — nothing to walk here';

    let previous = entered?.at ?? -1;
    for (let stop = 1; entered?.inMain && stop <= CAP; stop += 1) {
      const at = await step(route, `tab ${stop}`, DWELL_TAB, () =>
        page.keyboard.press('Tab'),
      );
      // Two ways out, and the second is the one that caught a walk reading Firefox's own
      // toolbar aloud: focus left the content, or Tab moved nothing at all, which is what a
      // page whose keyboard focus has gone to the browser looks like from inside it.
      if (!at?.inMain) break;
      if (at.at === previous) {
        steps.at(-1).note = 'Tab moved nothing — focus had left the page';
        break;
      }
      previous = at.at;
    }
  }
  const firefox_ = browser.version();
  await browser.close();
  writeFileSync(
    out,
    `${JSON.stringify({ baseURL, cap: CAP, firefox: firefox_, steps }, null, 2)}\n`,
  );
};

// ── 4 and 5: transcribe, and write the record ─────────────────────────────────

/** Orca stamps every decision it makes; this is the one line kind that is speech. */
const SPOKEN =
  /^(\d\d):(\d\d):(\d\d)\.(\d+) - SPEECH OUTPUT: '(.*?)'(?:\s*\{.*)?$/;

const utterances = (debug) =>
  debug
    .split('\n')
    .map((line) => SPOKEN.exec(line.trim()))
    .filter(Boolean)
    .map((m) => ({
      at:
        Number(m[1]) * 3600 +
        Number(m[2]) * 60 +
        Number(m[3]) +
        Number(`0.${m[4]}`),
      said: m[5],
    }));

const version = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8' })
      .trim()
      .split('\n')[0];
  } catch {
    return 'unknown';
  }
};

const render = (stepsFile, debugFile, slug, reader) => {
  const { cap, steps, firefox } = JSON.parse(readFileSync(stepsFile, 'utf8'));
  const said = utterances(readFileSync(debugFile, 'utf8'));
  const spoken = (step) =>
    said
      .filter((u) => u.at >= step.from && u.at <= step.to)
      .map((u) => u.said.trim())
      .filter(Boolean);

  const byRoute = new Map();
  for (const step of steps) {
    if (!byRoute.has(step.route)) byRoute.set(step.route, []);
    byRoute.get(step.route).push({ ...step, said: spoken(step) });
  }

  const silent = steps.filter((s) => spoken(s).length === 0).length;
  // A view the reader said nothing on is a hole in the reading, and a record that reports
  // only its totals lets a reader take it for a complete one. They are named.
  // `arrive` always speaks — the browser announces the page it loaded. A view is UNREAD when
  // nothing after that did: no stop of the Tab key produced a word.
  const mute = [...byRoute.entries()]
    .filter(([, rows]) =>
      rows
        .filter((r) => r.label !== 'arrive')
        .every((r) => r.said.length === 0),
    )
    .map(([route]) => route);
  // `arrive` + `enter` + `cap` tab stops means the walk was still inside the content when
  // the cap bit. It is written into the view it happened on — a cap nobody can see is a
  // reading that claims to be complete.
  const capped = [...byRoute.entries()].filter(
    ([, rows]) => rows.length === cap + 2,
  );

  const body = [...byRoute.entries()]
    .map(([route, rows]) => {
      const lines = rows.map(
        (row) =>
          `${row.label.padEnd(7)} ${(row.focus?.what ?? '—').padEnd(52)} ${
            row.said.join(' · ') || '(silence)'
          }`,
      );
      const notes = [
        ...rows.filter((r) => r.note).map((r) => `\n${r.note}.`),
        rows.length === cap + 2
          ? `\nThe cap bit here: ${cap} stops read inside \`main\`, and the view has more.`
          : '',
      ].join('');
      return `### \`${route}\`\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`${notes}`;
    })
    .join('\n\n');

  const header = `# ${reader} — assistive-technology log

> **This file is generated.** Do not edit it by hand — \`tools/at-pass.sh\`.

What a screen reader SAYS on arriving at each sandbox view, and at each stop of the Tab key
after it. The automatic audit in \`a11y.spec.ts\` reads the DOM and the composed colours; it
cannot read this, and neither can any gate in \`tools/\`
([\`req-a11y-acr\`](../requirements/a11y.md#req-a11y-acr)).

**What this is evidence of, and what it is not.** It is evidence of what was said, and of
what the browser had given focus to when it was said — the two columns are separate on
purpose, because an announcement that does not match the focus is the defect this file exists
to make visible. It is **not** a judgement that the announcement is adequate: that is a
person's reading of this file, and \`docs/acr/claims.json\` stays \`"recorded": false\` until a
person has made it.

**Taken with**, because a reading is only ever true of one stack:

- ${version('orca', ['--version'])}
- Firefox ${firefox ?? 'unknown'} (the Playwright build), driven on Xvfb at 1280×900, no window manager
- ${steps.length} steps over ${byRoute.size} views, at most ${cap} tab stops each

A stop reads: the label, what the browser had focused, and what the reader said. \`arrive\` is
the load, \`enter\` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves \`main\`. \`(silence)\` is a stop the reader said nothing
at — ${silent} of ${steps.length} here. ${capped.length} view(s) hit the cap, and each says so.

**This reading is incomplete, and here is where.** ${mute.length} of the ${byRoute.size} views
produced no speech at all: ${mute.map((r) => `\`${r}\``).join(', ') || 'none'}. The cause is
in the harness and not in the library — the reader loses the accessible document on some
navigations (\`WEB: Could not get document for event source\` in its own log) and the page's
focus does not hold on a virtual display with no window manager running. Those views are
**unread**, which is a different thing from read and found silent, and nothing below should
be quoted as evidence about them.
`;

  mkdirSync(join(ROOT, LOGS), { recursive: true });
  writeFileSync(join(ROOT, LOGS, `${slug}.md`), `${header}\n${body}\n`);
  process.stdout.write(
    `v ${reader}: ${steps.length} steps over ${byRoute.size} views, ` +
      `${said.length} utterances, ${silent} silent stops, ${capped.length} capped ` +
      `→ ${LOGS}/${slug}.md\n`,
  );
};

const [mode, ...rest] = process.argv.slice(2);
if (mode === '--drive') await drive(rest[0], rest[1]);
else if (mode === '--render')
  render(rest[0], rest[1], rest[2], rest.slice(3).join(' '));
else {
  process.stderr.write(
    'usage: --drive <baseURL> <steps.json> | --render <steps.json> <debug> <slug> <reader>\n',
  );
  process.exit(2);
}
