#!/usr/bin/env node
/**
 * The assistive-technology pass: what a screen reader actually SAYS on each sandbox view
 * (`req-a11y-acr`) — the question no gate here can answer, since they end where axe ends.
 * This file is the RECORD half and no longer the walk. Until 2026-09-16 it drove Orca here
 * while `apps/sandbox-e2e/at/walk.ts` drove the other two there, in two languages, and every
 * defect found in one was in the other because the second was a copy (4.66). The walk now has
 * one home and all three readers take it; what is left here is what only a record needs:
 *   1. TRANSCRIBE — the reader's own log read back, each utterance attributed by the clock
 *      stamps the walk wrote on every step (a reader ASKED for its speech carries it already),
 *   2. RECORD — one file per reader under `docs/acr/at/`, per view and per stop, with what
 *      was capped, what was silent and which stack it was taken on.
 *
 * Usage: node tools/at-pass.mjs --render <steps.json> <debug|none> <slug> <reader>
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
// Imported across the boundary and by its `.ts` path on purpose: the parser belongs beside
// the walk that needs it mid-pass, Node 24 strips the types on the way in, and nx's module
// boundaries refuse the other direction — an app may not reach into `tools/`.
import { utterances } from '../apps/sandbox-e2e/at/orca-log.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LOGS = 'docs/acr/at';

/**
 * The walk's marker for a view whose stops outran the budget. It is written by
 * `apps/sandbox-e2e/at/walk.ts` and read here — in two places, which is why it is a constant:
 * a second spelling of it would leave one reader counting capped views and the other printing
 * the note, quietly disagreeing (`lesson-216`).
 */
const CAP_NOTE = /^the cap bit/;

// ── 1 and 2: transcribe, and write the record ─────────────────────────────────

const version = (command, args) => {
  try {
    return execFileSync(command, args, { encoding: 'utf8' })
      .trim()
      .split('\n')[0];
  } catch {
    return 'unknown';
  }
};

/**
 * A step's speech, and WHICH of the two ways to read it is decided by the caller rather than
 * by the shape of the step. It used to be `step.said ?? <the clock>`, which was true only
 * while one of the two walks did not write the field at all: the day all three readers came
 * to share one walk, every Orca step arrived carrying `said: []`, `??` passed the empty array
 * straight through, and a pass of 1968 utterances rendered as thirty-six unread views. The
 * record's own guard refused to write it, which is the second time that guard has earned its
 * place. A reader read from a LOG is read from the log; a reader that was ASKED carries it.
 */
/**
 * One stop's phrases with the POLLER's repetition taken out — the first occurrence of each
 * keeps its place, and a later copy of it goes.
 *
 * A reader driven through Guidepup hands back a log, and NVDA's repeats. The `/breadcrumb`
 * arrival of 2026-09-16 carried **80530 phrases of which 84 were distinct** — the same
 * ~91-phrase sequence over and over, no two neighbours alike, which is a buffer read again
 * and not a reader saying anything twice. Rendered whole it made one line of 3059019
 * characters and a record of 10.9 MB: evidence nobody can read, in a file whose whole purpose
 * is to be quotable, and a repository nobody wants to clone.
 *
 * The cost is real and the header names it: a reader that truly says one thing twice at one
 * stop is recorded saying it once. That is the cheaper of the two errors here — the other one
 * buried the reading under a thousand copies of itself.
 */
const distinct = (phrases) => [...new Set(phrases)];

const spokenOf = (step, said, fromLog) =>
  fromLog
    ? said
        .filter((u) => u.at >= step.from && u.at <= step.to)
        .map((u) => u.said.trim())
        .filter(Boolean)
    : (step.said ?? []);

const render = (stepsFile, debugFile, slug, reader) => {
  const { cap, steps, browser, stack } = JSON.parse(
    readFileSync(stepsFile, 'utf8'),
  );
  // Two kinds of reader, one record. Orca is read out of its own debug file and each
  // utterance attributed to a step by the clock; a reader driven through Guidepup hands
  // back what it said when asked, so its steps arrive already carrying it.
  const said =
    debugFile === 'none' ? [] : utterances(readFileSync(debugFile, 'utf8'));
  // A reader that said NOTHING did not read quietly — it did not read. Rendering that gives
  // a file in which every view is honestly reported unread, and which is a lie all the same,
  // because the sentence that says so blames the views.
  const nothingSpoken =
    debugFile !== 'none' &&
    steps.every((step) => spokenOf(step, said, true).length === 0);
  if (nothingSpoken)
    throw new Error(
      `${debugFile} holds ${said.length} utterance(s) and not one of them lands on a step ` +
        `— the reader started and never attached to the browser. A pass in which every ` +
        `view is unread is not a pass, and rendering it would blame the views.`,
    );
  const spoken = (step) => spokenOf(step, said, debugFile !== 'none');

  const byRoute = new Map();
  for (const step of steps) {
    if (!byRoute.has(step.route)) byRoute.set(step.route, []);
    byRoute.get(step.route).push({ ...step, said: distinct(spoken(step)) });
  }

  const logged = steps.reduce((n, step) => n + spoken(step).length, 0);
  const kept = [...byRoute.values()]
    .flat()
    .reduce((n, row) => n + row.said.length, 0);

  const silent = steps.filter((s) => spoken(s).length === 0).length;
  // A view the reader said nothing on is a hole in the reading, and a record that reports
  // only its totals lets a reader take it for a complete one. They are named.
  // `arrive` speaks of the navigation, not of the view: the reader names the link that was
  // followed. A view is UNREAD when nothing after that did — no stop of the Tab key spoke.
  const mute = [...byRoute.entries()]
    .filter(([, rows]) =>
      rows
        .filter((r) => r.label !== 'arrive')
        .every((r) => r.said.length === 0),
    )
    .map(([route]) => route);
  // Where the unread views SIT, which is the one thing about them this pass measures. It is
  // worth the arithmetic because the alternative is a list of component names, and a reader
  // of that list takes it for a property of those components. Two passes of the same views
  // named 19 and 18 of them and agreed on five: the set is a phase, and the giveaway is a
  // run of positions two apart.
  const order = [...byRoute.keys()];
  const seats = mute.map((route) => order.indexOf(route) + 1);
  const alternating =
    seats.length > 2 &&
    seats.every((n, i) => i === 0 || n - seats[i - 1] === 2);
  // The walk writes the note where the cap bit, and this reads it. Inferring it from a row
  // count held only while every stop spent a unit of the same budget — the shell's own
  // switches no longer do, so the arithmetic that once matched would now quietly say `0`.
  const capped = [...byRoute.entries()].filter(([, rows]) =>
    rows.some((row) => CAP_NOTE.test(String(row.note ?? ''))),
  );

  // Where the reading stops, and it is a different paragraph when it stops nowhere. A file
  // that says "0 views produced no speech: none — those views are unread" is a template
  // talking to itself, and a reader who meets one stops believing the sentences around it.
  const incomplete = mute.length
    ? `**This reading is incomplete, and here is where.** ${mute.length} of the ${byRoute.size} views
produced no speech at all: ${mute.map((r) => `\`${r}\``).join(', ')}. Those views are
**unread**, which is a different thing from read and found silent, and nothing below should
be quoted as evidence about them.

What this pass can say about that set is where it SITS, and it is not a statement about the
components it names: they are views ${seats.join(', ')} of the walk${
        alternating
          ? ', every other one in an unbroken run — a phase of the pass, which the next pass\ncan name the other half of'
          : ''
      }. No cause is written here, because none was measured; the stack it was taken on is above.`
    : `**Every view spoke.** No view of the ${byRoute.size} went unread, so nothing below is
missing because the reader was not listening. Where this reading ends instead is the cap:
${capped.length} view(s) have more stops than the ${cap} taken, and each says so where it bit.`;

  // What the reading was taken on, and ONLY what this run can see. The Orca version used to
  // be printed unconditionally: the first record from a Windows runner carried a bullet
  // reading `unknown` for a reader it had never invoked, which is a fabricated line in a
  // document whose whole purpose is to be quotable.
  const taken = stack
    ? [stack]
    : [
        version('orca', ['--version']),
        `Firefox ${browser ?? 'unknown'} (the Playwright build), driven on Xvfb at 1280×900, window manager: ${process.env.AT_PASS_WM || 'not recorded'}`,
      ];

  const body = [...byRoute.entries()]
    .map(([route, rows]) => {
      const lines = rows.map(
        (row) =>
          `${row.label.padEnd(7)} ${(row.focus?.what ?? '—').padEnd(52)} ${
            row.said.join(' · ') || '(silence)'
          }`,
      );
      // A cap note is a MARKER the renderer reads, not a line it prints: the sentence below
      // says the same thing with the number in it, and printing both left every capped view
      // carrying one fact in two spellings — the register defect of `lesson-216`, one floor
      // down, in the file that exists to be quoted. Every other note is the walk's own
      // sentence about that view and is printed as written.
      const notes = [
        ...rows
          .filter((r) => r.note && !CAP_NOTE.test(String(r.note)))
          .map((r) => `\n${r.note}.`),
        rows.some((row) => CAP_NOTE.test(String(row.note ?? '')))
          ? `\nThe cap bit here: ${cap} stops of this view's own were read, and it has more.`
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

${taken.map((line) => `- ${line}`).join('\n')}
- ${steps.length} steps over ${byRoute.size} views, at most ${cap} stops of a view's own

A stop reads: the label, what the browser had focused, and what the reader said. \`arrive\` is
the sandbox's own navigation to the view — the document is loaded once, before the first —
\`enter\` is the view's first stop, put under focus outright, and the rest are Tab
stops from there until focus leaves \`main\`. A view with something to OPEN ends on three more:
\`reach\` puts focus on the control that opens it, \`open\` presses the key, and \`close\` presses
Escape — the row every card asking "what does a reader announce when this appears" was waiting
for, and the row beneath it is what leaving sounds like. \`(silence)\` is a stop the reader said nothing
at — ${silent} of ${steps.length} here. ${capped.length} view(s) hit the cap, and each says so.${
    logged > kept
      ? `

**A phrase repeated at one stop is written once.** This reader's log handed back ${logged}
phrases, and ${kept} of them are distinct within their own stop; the rest are the same
sequence read again, cycled rather than repeated, which is the poller and not the reader. The
cost of the rule is stated rather than hidden: a reader that truly said one thing twice at one
stop is recorded here saying it once.`
      : ''
  }

${incomplete}
`;

  mkdirSync(join(ROOT, LOGS), { recursive: true });
  writeFileSync(join(ROOT, LOGS, `${slug}.md`), `${header}\n${body}\n`);
  process.stdout.write(
    `v ${reader}: ${steps.length} steps over ${byRoute.size} views, ` +
      // Counted off the STEPS and not off the log, because only one of the three readers has
      // a log: read the other way, a complete NVDA pass reported `0 utterances`.
      `${kept} utterances${logged > kept ? ` of ${logged} logged` : ''}, ` +
      `${silent} silent stops, ${capped.length} capped ` +
      `→ ${LOGS}/${slug}.md\n`,
  );
};

const [mode, ...rest] = process.argv.slice(2);
if (mode === '--render')
  render(rest[0], rest[1], rest[2], rest.slice(3).join(' '));
else {
  process.stderr.write(
    'usage: --render <steps.json> <debug|none> <slug> <reader>\n',
  );
  process.exit(2);
}
