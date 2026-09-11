#!/usr/bin/env node
/**
 * Style gate: `req-token-logical` (layout in logical properties, so it mirrors under
 * `dir="rtl"`), `req-token-no-opacity` (no compositing `opacity`),
 * `req-a11y-forced-colors` (the mode's rules really paint), `req-api-icons` (a
 * component paints the box an icon sits in, never the drawing inside it),
 * `req-a11y-motion` (a duration is a token, not a number in a sheet) and `req-a11y-touch`
 * (every touch floor the sheets declare is measured in a browser). Breaking any of them
 * gives no red test — an LTR screenshot looks right, so does `opacity: 0.6`, which quietly undoes
 * `req-token-contrast` ([`lesson-6`](../docs/lessons.md#lesson-6)), so does a
 * forced-colors rule that loses on specificity, because the browser substitutes the
 * colours by itself anyway ([`lesson-70`](../docs/lessons.md#lesson-70)), so does a
 * `150ms` written by hand, which reads exactly like the token it replaced until somebody
 * asks for less motion, and so does a floor nobody measures — it holds the target up
 * perfectly until the day it stops, and then nothing says so.
 *
 *  1. the list of stylesheets is not empty (else points 5 and 6 pass over nothing),
 *  2. COMPILER: everything sass EMITS is visible to the source scanner as well,
 *  3. STYLE SOURCE: every `@Component` takes its styles from a sheet this gate reads,
 *  4. exceptions are named, justified and USED,
 *  5. no physical property of the inline axis,
 *  6. no compositing `opacity`,
 *  7. FORCED COLOURS: a rule of that mode is not outranked by a base rule of the sheet,
 *  8. PAINT: no property that only an `<svg>` understands (`req-api-icons`),
 *  9. MOTION: a duration comes from the motion axis, and the preference is answered by
 *     the token build rather than by a sheet of its own (`req-a11y-motion`),
 * 10. TOUCH FLOOR: every application of the 24 px floor the sheets declare is named by a
 *     browser measurement, and the list of applications is READ OUT OF THE SHEETS
 *     (`req-a11y-touch`).
 *
 * Points 5–9 are the rules; 1–3 watch the DENOMINATOR they run over — an unread sheet
 * is to them what a missing file is to coverage ([`lesson-48`](../docs/lessons.md#lesson-48)).
 * Point 10 carries both halves at once: its first two rules are its own denominator, and
 * they are there because the defect it exists for IS a denominator that was typed in.
 *
 * Usage: node tools/check-styles.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'libs/components';

/**
 * The two trees point 10 reads besides the library's own. The DTCG sources say which custom
 * property carries the touch floor — a question the sheets cannot answer, because
 * `--pct-dialog-close-size` is a floor and says so nowhere in its name — and the e2e specs
 * say which of the floors found is actually measured in a browser.
 *
 * They belong to other projects, and that is on purpose rather than in spite of itself: the
 * promise `req-a11y-touch` makes runs across all three, and a gate that could see only one
 * of them is how the promise came to have two disagreeing lists (plan 4.53).
 */
const TOKENS = 'libs/tokens/src';
const MEASURED = 'apps/sandbox-e2e/src';

const FIXTURES = join(ROOT, 'tools/check-styles.fixtures');
const REFERENCE = '_reference';

/**
 * The exception marker. It names a PROPERTY, not "this line": a comment written for
 * `left` must not quietly cover an `opacity` added beside it half a year later.
 *
 *   /* pct-exception left: <justification> *\/
 */
const EXCEPTION = /pct-exception\s+([-a-zA-Z]+)\s*:\s*([\s\S]*)$/;

/**
 * The minimum length of a justification. A floor against an empty rubber stamp
 * (`/* pct-exception left: because *\/`), not a judge of quality — a machine cannot tell
 * whether a reason is true. Review watches that, and only review; the gate watches that
 * there is something to review and that exceptions can be counted.
 */
const MIN_JUSTIFICATION = 40;

/**
 * Physical properties of the inline axis and their logical counterparts. The BLOCK axis
 * (`top`/`bottom`, `margin-top`, …) is deliberately NOT on the list: `dir="rtl"` mirrors
 * the inline axis alone, and full bidi — that is, vertical writing modes — is an explicit
 * non-goal (`docs/00-axis.md`). A ban on `top` would be noise, and the answer to noise is
 * a rubber-stamp exception on every other rule.
 */
const PHYSICAL = new Map([
  ['left', 'inset-inline-start'],
  ['right', 'inset-inline-end'],
  ['margin-left', 'margin-inline-start'],
  ['margin-right', 'margin-inline-end'],
  ['padding-left', 'padding-inline-start'],
  ['padding-right', 'padding-inline-end'],
  ['scroll-margin-left', 'scroll-margin-inline-start'],
  ['scroll-margin-right', 'scroll-margin-inline-end'],
  ['scroll-padding-left', 'scroll-padding-inline-start'],
  ['scroll-padding-right', 'scroll-padding-inline-end'],
  ['border-left', 'border-inline-start'],
  ['border-right', 'border-inline-end'],
  ['border-left-width', 'border-inline-start-width'],
  ['border-right-width', 'border-inline-end-width'],
  ['border-left-style', 'border-inline-start-style'],
  ['border-right-style', 'border-inline-end-style'],
  ['border-left-color', 'border-inline-start-color'],
  ['border-right-color', 'border-inline-end-color'],
  ['border-top-left-radius', 'border-start-start-radius'],
  ['border-top-right-radius', 'border-start-end-radius'],
  ['border-bottom-left-radius', 'border-end-start-radius'],
  ['border-bottom-right-radius', 'border-end-end-radius'],
  // `direction` in a component sheet kills the whole promise: however logical the other
  // rules are, this one pins the direction down.
  [
    'direction',
    'the direction is inherited from the document — do not pin it in a component',
  ],
]);

/** Properties where it is the VALUE that is physical, not the name. */
const PHYSICAL_BY_VALUE = new Map([
  ['text-align', { wrong: new Set(['left', 'right']), instead: 'start / end' }],
  [
    'float',
    { wrong: new Set(['left', 'right']), instead: 'inline-start / inline-end' },
  ],
  [
    'clear',
    { wrong: new Set(['left', 'right']), instead: 'inline-start / inline-end' },
  ],
]);

/**
 * The `opacity` family. The SVG variants are here for the same reason as `opacity`:
 * `fill-opacity` on a checkbox tick composites in exactly the same way, it just does not
 * carry the name the requirement uses.
 */
const OPACITY = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
]);

/**
 * The properties that carry a duration (`req-a11y-motion`). Their time may only come from
 * the motion axis: the tokens have a second set of values under
 * `@media (prefers-reduced-motion: reduce)`, emitted once by the token build, and a
 * component that writes its own `150ms` opts out of the preference without saying so —
 * the screenshot is identical, the axis still reads right in the browser, and this one
 * component keeps moving for the user who asked it not to.
 *
 * `animation-timing-function` and `transition-timing-function` are deliberately not here:
 * an easing is a shape, not a length, and reduction has nothing to do to it.
 */
const MOTION = new Set([
  'transition',
  'transition-duration',
  'transition-delay',
  'animation',
  'animation-duration',
  'animation-delay',
]);

/**
 * A time in a value: `150ms`, `.3s`, `0s`. Anchored on what precedes it so that the `s`
 * of a keyframe name or a custom property (`--pct-motion-4s-loop`) is not read as a unit.
 */
const TIME = /(?:^|[\s,(])\.?\d+(?:\.\d+)?m?s\b/i;

/**
 * The preference's own query. A component sheet may not carry it
 * ([0008](../docs/decisions/0008-motion-axis.md)): reduction is a set of token VALUES the
 * build emits once, so a second answer written in a component's own sheet is a rule that
 * has to be found and repeated by every component after it — and the day the two disagree,
 * the one that wins is decided by the cascade rather than by anybody's intent.
 */
const REDUCED = /@media[^{]*prefers-reduced-motion/g;

// ── sheet scanner ────────────────────────────────────────────────────────────

/**
 * The properties only an `<svg>` obeys. A component that reaches for them is painting a
 * drawing it happens to know — and the drawing is the one thing about an icon a consumer
 * may replace, so the rule paints nothing the day they do (`req-api-icons`,
 * [0028](../docs/decisions/0028-an-icon-set-is-a-component.md)). What reaches an icon
 * whoever drew it is `color`, and the drawing paints itself in `currentColor`.
 *
 * `fill-opacity` and `stroke-opacity` are NOT here — they are in `OPACITY` above, where
 * they answer to a promise of their own.
 */
const PAINT = new Set([
  'fill',
  'fill-rule',
  'stroke',
  'stroke-width',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-dasharray',
  'stroke-dashoffset',
  'stroke-miterlimit',
  'paint-order',
]);

/**
 * The scanner: turns a stylesheet's text into a list of declarations and comments, each
 * with a line number. It is not a CSS parser and need not be — the gate asks only about
 * `property: value` pairs and about the comments that carry exceptions.
 *
 * postcss is deliberately NOT used here, though it is among the dependencies: its default
 * parser falls over on SCSS syntax (`//`, a `$variable` outside a rule), and `postcss-scss`
 * would be a new dependency taken on to read seven files written in plain CSS. Something
 * else matters more, though: a scanner of one's own fails the way it was designed to fail,
 * and what it cannot see is caught by point 2 — the comparison against what sass, a real
 * parser, prints from the same sheet.
 *
 * Brackets are counted separately, so that a `;` inside `url(data:…;base64,…)` does not
 * cut a declaration in half.
 */
const scan = (content) => {
  const declarations = [];
  const comments = [];
  let buffer = '';
  let bufferLine = 0;
  let line = 1;
  let parens = 0;
  let i = 0;

  const push = (char) => {
    if (buffer.trim() === '' && char.trim() !== '') bufferLine = line;
    buffer += char;
  };

  /** Closes the buffer: if it looks like a declaration, it lands on the list. */
  const close = () => {
    const m = /^\s*(-{0,2}[A-Za-z_][-\w]*)\s*:\s*([\s\S]*)$/.exec(buffer);
    if (m)
      declarations.push({
        property: m[1].toLowerCase(),
        value: m[2].trim().replace(/\s+/g, ' '),
        line: bufferLine,
      });
    buffer = '';
  };

  while (i < content.length) {
    const char = content[i];
    const next = content[i + 1];

    if (char === '/' && next === '*') {
      const start = line;
      const end = content.indexOf('*/', i + 2);
      const limit = end === -1 ? content.length : end;
      const text = content.slice(i + 2, limit);
      line += (text.match(/\n/g) ?? []).length;
      comments.push({ text, line: start, end: line });
      i = limit + 2;
      continue;
    }

    // An SCSS line comment. It carries no exceptions (sass does not emit it, so point 2
    // would have nothing to compare), but it has to leave the stream.
    if (char === '/' && next === '/') {
      const end = content.indexOf('\n', i);
      i = end === -1 ? content.length : end;
      continue;
    }

    if (char === '"' || char === "'") {
      let j = i + 1;
      while (j < content.length && content[j] !== char) {
        if (content[j] === '\\') j++;
        if (content[j] === '\n') line++;
        j++;
      }
      push(content.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    if (char === '\n') {
      line++;
      push(' ');
      i++;
      continue;
    }

    if (char === '(') parens++;
    if (char === ')') parens = Math.max(0, parens - 1);

    if (parens === 0) {
      // A rule prelude (a selector, an at-rule prelude) is not a declaration.
      if (char === '{') {
        buffer = '';
        i++;
        continue;
      }
      // `}` also closes a declaration with no semicolon at the end of a block.
      if (char === '}' || char === ';') {
        close();
        i++;
        continue;
      }
    }

    push(char);
    i++;
  }

  return { declarations, comments };
};

/**
 * The key of a declaration RELEVANT to either promise — or `null`. The same key is
 * computed for the source and for sass's output, so point 2 compares those two views
 * without looking at the rest of the sheet.
 */
const significantKey = (d) => {
  const value = d.value.toLowerCase();
  if (PHYSICAL.has(d.property)) return `${d.property}:${value}`;
  const valueBased = PHYSICAL_BY_VALUE.get(d.property);
  if (valueBased?.wrong.has(value.split(/\s+/)[0]))
    return `${d.property}:${value}`;
  if (OPACITY.has(d.property) && !binaryOpacity(value))
    return `${d.property}:${value}`;
  // `inset` is physical only with several values: `inset: 0` is symmetric and behaves
  // identically in RTL, and a ban covering it too would produce contentless exceptions.
  if (d.property === 'inset' && value.split(/\s+/).length > 1)
    return `${d.property}:${value}`;
  return null;
};

/**
 * `opacity` is allowed ONLY as a visibility switch: `0` (the element takes no part in the
 * image, so there is no contrast to promise) and `1` (the neutral value, usually undoing a
 * state). Everything in between COMPOSITES with the background, moving the real contrast
 * outside the contrast gate's result (`lesson-6`).
 *
 * A non-literal value (`var(...)`, `calc(...)`) is not binary by definition: the gate does
 * not know what will arrive at runtime, and guessing in the author's favour would be
 * exactly the silence this rule stands against.
 *
 * Deliberately allowed: `transition: opacity …` and a 0 → 1 transition. A transient state
 * is not what `req-token-contrast` speaks about, and a ban covering animations would take
 * away the one standard way of bringing an overlay in.
 */
const binaryOpacity = (value) => {
  const m = /^(\d*\.?\d+)(%?)$/.exec(value.trim());
  if (!m) return false;
  const count = Number(m[1]) / (m[2] === '%' ? 100 : 1);
  return count === 0 || count === 1;
};

// ── the cascade under forced colours ─────────────────────────────────────────

/**
 * Comments out of the text, strings left whole: `content: "/*"` is a string and not the
 * start of a comment, and an attribute selector (`[data-pct-size='sm']`) has to survive
 * intact — the whole of point 7 is about selectors.
 */
const withoutComments = (css) => {
  let out = '';
  let i = 0;
  while (i < css.length) {
    const c = css[i];
    if (c === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      i = end === -1 ? css.length : end + 2;
      out += ' ';
      continue;
    }
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c) j += css[j] === '\\' ? 2 : 1;
      out += css.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    out += c;
    i++;
  }
  return out;
};

/**
 * The rules of a sheet in source order, each with its selectors, its body and whether it
 * stands inside `@media (forced-colors: active)`.
 *
 * Read from SASS'S OUTPUT and not from the source. Point 7 asks about SELECTORS, and in
 * the output nesting, `&` and a mixin's body are already resolved into the text a browser
 * really parses — the same material point 2 compares against. The scanner above returns
 * declarations without the rule they sit in, so it cannot answer this question at all.
 */
const cssRules = (css) => {
  const source = withoutComments(css);
  const rules = [];
  const at = [];
  let prelude = '';
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < source.length && source[j] !== c)
        j += source[j] === '\\' ? 2 : 1;
      prelude += source.slice(i, j + 1);
      i = j + 1;
      continue;
    }
    if (c === '}') {
      at.pop();
      prelude = '';
      i++;
      continue;
    }
    // An at-rule with no block — a STATEMENT, ended by its semicolon. `@charset "UTF-8";`
    // is the one this library really meets: sass writes it above any sheet whose output
    // carries a non-ASCII character, which here means any sheet with an em dash in a
    // comment. Left in the buffer it glues itself to the next selector, the prelude then
    // begins with `@`, and the rule it belongs to is filed as a CONTEXT instead of being
    // read — so the first rule of such a sheet was invisible to point 7 (and would have
    // been to point 10): two of the nineteen touch floors, and every forced-colors
    // comparison against `:host`, silently absent from the measurement.
    if (c === ';') {
      prelude = '';
      i++;
      continue;
    }
    if (c !== '{') {
      prelude += c;
      i++;
      continue;
    }

    const head = prelude.replace(/\s+/g, ' ').trim();
    prelude = '';
    i++;
    // An at-rule with a block (`@media`, `@supports`) is a context; a style rule is read.
    if (head.startsWith('@')) {
      at.push(head);
      continue;
    }
    let depth = 1;
    const start = i;
    while (i < source.length && depth > 0) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') depth--;
      if (depth > 0) i++;
    }
    rules.push({
      selectors: head
        .split(',')
        .map((selector) => selector.trim())
        .filter(Boolean),
      body: source.slice(start, i),
      forced: at.some((rule) => /forced-colors\s*:\s*active/.test(rule)),
      order: rules.length,
    });
    i++;
  }
  return rules;
};

/** The `property: value` pairs of a rule's body — plain CSS, no nested rules to skip. */
const bodyDeclarations = (body) =>
  body
    .split(';')
    .map((piece) => /^\s*(-{0,2}[a-z][-\w]*)\s*:\s*([\s\S]+)$/i.exec(piece))
    .filter((m) => m !== null)
    .map(([, property, raw]) => ({
      property: property.toLowerCase(),
      value: raw.trim().replace(/\s+/g, ' '),
      important: /!\s*important$/i.test(raw),
    }));

/**
 * The simple selectors of ONE compound, each kept as written — a functional pseudo-class
 * carries its argument along (`:not([data-pct-loading])`), so two compounds compare as
 * sets of the same strings.
 */
const simpleSelectors = (compound) => {
  const out = [];
  let i = 0;
  while (i < compound.length) {
    if (compound[i] === '[') {
      const end = compound.indexOf(']', i);
      const stop = end === -1 ? compound.length : end + 1;
      out.push(compound.slice(i, stop));
      i = stop;
      continue;
    }
    let j = i + 1;
    if (compound[i] === ':' && compound[j] === ':') j++;
    while (j < compound.length && /[-\w]/.test(compound[j])) j++;
    if (compound[j] === '(') {
      let depth = 1;
      j++;
      while (j < compound.length && depth > 0) {
        if (compound[j] === '(') depth++;
        else if (compound[j] === ')') depth--;
        j++;
      }
    }
    out.push(compound.slice(i, j));
    i = j;
  }
  return out.filter((simple) => simple.trim() !== '');
};

const FUNCTIONAL = /^(::?[-\w]+)\(([\s\S]*)\)$/;

/** Specificity as `[id, class, type]` — the rules a browser decides the cascade by. */
const specificity = (selector) => {
  const total = [0, 0, 0];
  for (const compound of selector.split(/\s*[\s>+~]\s*/).filter(Boolean))
    for (const simple of simpleSelectors(compound)) {
      const fn = FUNCTIONAL.exec(simple);
      if (fn) {
        const name = fn[1].toLowerCase();
        // `:where()` contributes nothing — that is what it is for.
        if (name === ':where') continue;
        // `:host()` and `:host-context()` count themselves AND their argument; `:is()`,
        // `:not()` and `:has()` take the specificity of their strongest argument.
        if (name === ':host' || name === ':host-context') total[1]++;
        const strongest = fn[2]
          .split(',')
          .map((argument) => specificity(argument.trim()))
          .sort((a, b) => b[0] - a[0] || b[1] - a[1] || b[2] - a[2])[0] ?? [
          0, 0, 0,
        ];
        for (const k of [0, 1, 2]) total[k] += strongest[k];
        continue;
      }
      if (simple.startsWith('#')) total[0]++;
      else if (simple.startsWith('::')) total[2]++;
      else if (/^[.[:]/.test(simple)) total[1]++;
      else if (simple !== '*') total[2]++;
    }
  return total;
};

const bySpecificity = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/**
 * The compounds of a selector, each as the SET of its simple selectors. `:host(X)` is
 * flattened into `{ ':host', …X }`, because `:host()` takes a compound and nothing else —
 * that way `:host([disabled])` and `:host([disabled]:not([x]))` compare as sets.
 *
 * `null` for anything but descendant combinators. `>`, `+` and `~` say something about
 * position that a comparison of sets does not carry, and reading them wrong would put the
 * point onto a rule that is fine. The library has none.
 */
const compoundsOf = (selector) => {
  if (/[>+~]/.test(selector)) return null;
  return selector
    .split(/\s+/)
    .filter(Boolean)
    .map((compound) => {
      const out = new Set();
      for (const simple of simpleSelectors(compound)) {
        const fn = FUNCTIONAL.exec(simple);
        if (fn && [':host', ':host-context'].includes(fn[1].toLowerCase())) {
          out.add(fn[1].toLowerCase());
          for (const inner of simpleSelectors(fn[2].trim())) out.add(inner);
          continue;
        }
        out.add(simple);
      }
      return out;
    });
};

/**
 * "Every element `narrow` matches, `wide` matches too" — decided on the text, so it says
 * yes only where it is sure. A selector narrows in two ways: more conditions in a compound
 * (`:host([disabled]:not([x]))` under `:host([disabled])`) and more ancestors
 * (`:host([x]) .box` under `.box`). Both only ever REMOVE elements, so the answer errs in
 * the direction that matters — a missed "yes" costs one unexamined pair, a wrong one would
 * cost a false accusation.
 */
const matchesWithin = (wide, narrow) => {
  const outer = compoundsOf(wide);
  const inner = compoundsOf(narrow);
  if (outer === null || inner === null || outer.length > inner.length)
    return false;
  let index = inner.length - 1;
  for (let k = outer.length - 1; k >= 0; k--) {
    const covers = (compound) =>
      [...outer[k]].every((simple) => compound.has(simple));
    // The rightmost compound is the element the rule paints — it has to line up.
    if (k === outer.length - 1) {
      if (!covers(inner[index])) return false;
      index--;
      continue;
    }
    // An ancestor may sit anywhere further up: `.a .c .b` is inside `.a .b`.
    let found = false;
    while (index >= 0 && !found) {
      if (covers(inner[index])) found = true;
      index--;
    }
    if (!found) return false;
  }
  return true;
};

const BORDER_SIDES = [
  'top',
  'right',
  'bottom',
  'left',
  'inline-start',
  'inline-end',
  'block-start',
  'block-end',
];

/**
 * Shorthands and the longhands they RESET. Written out rather than derived from the name:
 * `border` resets `border-color`, while `border-radius` begins with the same word and
 * resets nothing of the kind — a guessed rule would either accuse or miss. A property
 * outside the list collides with itself alone; the list grows on the day a sheet needs it.
 */
const RESETS = new Map([
  ['background', ['background-color', 'background-image']],
  [
    'border',
    [
      'border-color',
      'border-style',
      'border-width',
      ...BORDER_SIDES.flatMap((side) => [
        `border-${side}`,
        `border-${side}-color`,
        `border-${side}-style`,
        `border-${side}-width`,
      ]),
    ],
  ],
  ['border-color', BORDER_SIDES.map((side) => `border-${side}-color`)],
  ['outline', ['outline-color', 'outline-style', 'outline-width']],
]);

/** Do two declarations fight over the same pixel? */
const overlapping = (a, b) =>
  a === b ||
  (RESETS.get(a) ?? []).includes(b) ||
  (RESETS.get(b) ?? []).includes(a);

// ── the touch floor ───────────────────────────────────────────────────────────

/**
 * The one primitive every touch floor in this library ends at. `req-a11y-touch` promises
 * SC 2.5.8 **outright** — 24×24 CSS pixels of hit area whatever the drawing measures — and
 * `{pct.target.min}` is where that 24 is written down, once.
 */
const FLOOR = 'pct.target.min';

/**
 * The properties by which an element takes a size OF ITS OWN, on either axis. A declaration
 * of one of these whose value names a floor-carrying custom property is what this point
 * calls an APPLICATION of the floor, and an application is what has to be measured.
 *
 * Two exclusions, both deliberate. `max-*` is not here: a maximum built out of the floor
 * CAPS the box at 24 px rather than holding it there, which is the opposite promise, and
 * counting it would send somebody to measure a ceiling. Everything else — `padding`,
 * `margin`, `inset-inline-end`, a `calc()` in a position — is not here either, and
 * `select.scss` is why: the cross is placed by `calc(… - (var(--pct-target-min) - 16px) / 2)`,
 * an offset DERIVED from the floor so that the drawing lands where the pair wants it. That
 * arithmetic holds nothing up, and a rule that read it as a floor would demand a
 * measurement of a margin.
 */
const SIZED = new Set([
  'width',
  'height',
  'min-width',
  'min-height',
  'inline-size',
  'block-size',
  'min-inline-size',
  'min-block-size',
]);

/** A DTCG alias: `{pct.target.min}` and nothing else in the value. */
const ALIAS = /^\{([^}]+)\}$/;

/** Every `var(--name` in a value, in order. The fallback after the comma is not a name. */
const VARIABLES = /var\(\s*(--[-\w]+)/g;

/**
 * Every `$value` in the token sources, by its dotted path — as a LIST per name, not as one
 * value. The axis files (`density.compact.json`, `semantic.dark.json`, `motion.reduced.json`)
 * re-declare names that already exist, so a single map would let the last file read decide
 * what a name is, and a name whose base declaration carries the floor would drop out of the
 * scan because an axis re-points it. Reading every declaration errs the other way: a name
 * that carries the floor ANYWHERE carries it here, and the scan stays the wider of the two.
 */
const tokenValues = (files) => {
  const values = new Map();
  const put = (name, value) =>
    values.set(name, [...(values.get(name) ?? []), value]);
  const walk = (node, path) => {
    if (node === null || typeof node !== 'object' || Array.isArray(node))
      return;
    if (Object.hasOwn(node, '$value')) {
      put(path.join('.'), node.$value);
      return;
    }
    for (const [name, child] of Object.entries(node)) {
      if (name.startsWith('$')) continue;
      walk(child, [...path, name]);
    }
  };
  for (const file of files) {
    let parsed;
    try {
      parsed = JSON.parse(file.content);
    } catch (error) {
      throw new StyleError(
        'touch-floor',
        `${file.file}: this gate cannot read the token source (${error.message}) — and a ` +
          `token file it cannot read is a set of floors it cannot find, which would leave ` +
          `point 10 ruling on a smaller tree than the library really has`,
        'tokens',
      );
    }
    walk(parsed, []);
  }
  return values;
};

/**
 * The custom properties that carry the floor: `--pct-target-min` itself and every token
 * whose value chain of aliases ends at it.
 *
 * Derived rather than listed, and that is the whole point of this check. A name is not what
 * makes a floor — `--pct-dialog-close-size` says nothing about touch targets and is one,
 * because `component.dialog.json` points it at `{pct.target.min}`; `--pct-checkbox-size` is
 * named like a size and is not one. A list of names in a spec was what this repository had,
 * and it disagreed with the sheets by seven entries (plan 4.53).
 */
const floorVariables = (values) => {
  const carries = (name, seen) => {
    if (name === FLOOR) return values.has(FLOOR);
    if (seen.has(name)) return false;
    return (values.get(name) ?? []).some((value) => {
      const alias = typeof value === 'string' ? ALIAS.exec(value.trim()) : null;
      return (
        alias !== null && carries(alias[1].trim(), new Set([...seen, name]))
      );
    });
  };
  const out = new Set();
  for (const name of values.keys())
    if (carries(name, new Set())) out.add(`--${name.split('.').join('-')}`);
  return out;
};

/**
 * Every application of the floor in the sheets: one entry per ELEMENT the floor is declared
 * on, keyed as `<sheet> <selector>`.
 *
 * The element and not the token, because a token is applied in as many places as a sheet
 * likes: `--pct-pagination-item-target-min` holds up the pager's buttons AND its ellipsis,
 * and `--pct-target-min` bare holds up the field's control, the toast's action and the
 * select's cross — three components, one name. A denominator counted by name reports six
 * of those nine as one, which is how this defect stayed invisible.
 *
 * Selectors come from SASS'S OUTPUT, for point 7's reason: nesting and `&` are resolved
 * there into the text a browser really parses. Line numbers come from the source, by
 * matching the declaration back to it, because a line number is what navigates a person —
 * and where the two cannot be matched the sheet is named alone rather than guessed at.
 */
const floorApplications = (sheets, variables) => {
  const found = new Map();
  for (const sheet of sheets) {
    const source = scan(sheet.content).declarations;
    const used = new Set();
    const lineOf = (declaration) => {
      const hit = source.find(
        (candidate) =>
          candidate.property === declaration.property &&
          candidate.value.toLowerCase() === declaration.value.toLowerCase() &&
          !used.has(candidate.line),
      );
      if (!hit) return null;
      used.add(hit.line);
      return hit.line;
    };
    for (const rule of cssRules(sheet.css))
      for (const declaration of bodyDeclarations(rule.body)) {
        if (!SIZED.has(declaration.property)) continue;
        const names = [...declaration.value.matchAll(VARIABLES)]
          .map((m) => m[1])
          .filter((name) => variables.has(name));
        if (!names.length) continue;
        const line = lineOf(declaration);
        for (const selector of rule.selectors) {
          const key = `${sheet.file} ${selector}`;
          const entry = found.get(key) ?? {
            key,
            file: sheet.file,
            selector,
            lines: [],
            declarations: [],
          };
          if (line !== null && !entry.lines.includes(line))
            entry.lines.push(line);
          entry.declarations.push(
            `${declaration.property}: ${declaration.value}`,
          );
          found.set(key, entry);
        }
      }
  }
  return [...found.values()];
};

/**
 * What a measurement claims to measure: `applies: '<sheet> <selector>'`, written beside the
 * case in the e2e spec.
 *
 * The claim is read out of the test's TEXT and not out of its result, because what this
 * point rules on is coverage rather than correctness — whether the browser then reads 24 px
 * is the spec's own business, and it fails there loudly. What the gate contributes is the
 * half a spec cannot know: the list of things there are to measure.
 */
const APPLIES = /\bapplies\s*:\s*(['"])([^'"\n]+)\1/g;

const measurementClaims = (files) =>
  files.flatMap((file) =>
    [...file.content.matchAll(APPLIES)].map((m) => ({
      key: m[2].trim().replace(/\s+/g, ' '),
      where: `${file.file}:${file.content.slice(0, m.index).split('\n').length}`,
    })),
  );

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the nine checks. It carries the check's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN
 * point — a sheet failing for a reason other than the one written into it proves
 * something other than what it declares.
 *
 * `rule` is the finer address, for a point that holds more than one: point 9 refuses a
 * duration and refuses a second answer to the motion preference, and an input built for
 * the second one would be satisfied by the first firing — that is, by the rule it exists
 * for having stopped working. A fixture names it when it has one to name.
 */
class StyleError extends Error {
  constructor(check, description, rule) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

/**
 * The full set of checks over a ready input:
 *   `sheets`     — `[{ file, content, css }]`, where `css` is sass's output,
 *   `components`  — `[{ file, className, sheets, inline }]` from the decorators,
 *   `declarations`  — the number of `@Component(` occurrences in the sources (the parser's
 *                   denominator),
 *   `tokens`     — `[{ file, content }]`, the DTCG sources, for point 10's question of
 *                   which custom property carries the floor,
 *   `measurements` — `[{ file, content }]`, the e2e specs, read for the applications they
 *                   claim to measure.
 * Throws `StyleError` on the first violation: the checks run from the denominator to the
 * rules, so a rule after a collapsed denominator would have nothing to examine anyway.
 */
const checkStyles = ({
  sheets,
  components,
  declarations,
  tokens,
  measurements,
}) => {
  // 1. The list of stylesheets is not empty.
  if (!sheets.length)
    throw new StyleError(
      'sheets',
      `no stylesheet found (${PROJECT}/**/*.scss) — points 5 and 6 would then always ` +
        `pass, having nothing to read`,
    );

  const scans = new Map(sheets.map((a) => [a.file, scan(a.content)]));

  // 2. The compiler: sass emits nothing relevant that the scanner cannot see in the
  //    source. This is the scanner's own denominator — a declaration produced by a mixin,
  //    an interpolation or a nested property reaches the browser without standing in the
  //    source text, so the rules would pass over it without a trace.
  for (const sheet of sheets) {
    const inSources = new Set(
      scans
        .get(sheet.file)
        .declarations.map(significantKey)
        .filter((k) => k !== null),
    );
    const hidden = [
      ...new Set(
        scan(sheet.css)
          .declarations.map(significantKey)
          .filter((k) => k !== null && !inSources.has(k)),
      ),
    ];
    if (hidden.length)
      throw new StyleError(
        'compiler',
        `${sheet.file}: sass emits declarations absent from the source text:\n` +
          list(hidden) +
          `\n    They reach the browser, and the rules of points 5 and 6 pass over them ` +
          `without a trace. Usual cause: a mixin, an interpolation (\`padding-#{$x}\`) or ` +
          `a nested property. Write them out — or teach the scanner to read them.`,
      );
  }

  // 3. Style source: every `@Component` is styled by a sheet this gate reads.
  //
  //    A non-empty set first — for the same reason as point 1, only on the other side of
  //    the comparison. Comparing numbers (`recognised N of M`) is blind to zero: with both
  //    sides empty they are equal, and the point passes having said nothing. The first
  //    version of this gate passed exactly that way — the git pathspec returned zero
  //    sources and the result read "0 components" (`lesson-48`).
  if (!components.length)
    throw new StyleError(
      'style-source',
      `no \`@Component\` found in the sources (${PROJECT}) — the comparison against the ` +
        `decorator count would then always pass, because zero equals zero.\n` +
        `    Usual cause: the list of source files stopped returning anything.`,
    );

  if (components.length !== declarations)
    throw new StyleError(
      'style-source',
      `the parser recognised ${components.length} of ${declarations} \`@Component\` ` +
        `decorators — the rest would drop out of the measurement without a trace. Usual ` +
        `cause: a decorator written otherwise than prettier formats it (\`@Component({\` ` +
        `and \`})\` in column zero).`,
    );

  const known = new Set(sheets.map((a) => a.file));
  const withoutStylesheet = components.flatMap((k) => {
    if (k.inline)
      return [
        `${k.file}: ${k.className} has \`styles: […]\` in its decorator — this gate reads sheets, not decorators`,
      ];
    return k.sheets
      .filter((a) => !known.has(a))
      .map(
        (a) =>
          `${k.file}: ${k.className} takes its styles from \`${a}\`, outside the sheet list`,
      );
  });
  if (withoutStylesheet.length)
    throw new StyleError(
      'style-source',
      `${withoutStylesheet.length} components take their styles from beyond this gate's reach:\n` +
        list(withoutStylesheet) +
        `\n    Those styles travel to the consumer like every other, and points 5 and 6 ` +
        `pronounce them "clean" only because they cannot see them.`,
    );

  // 4. Exceptions: named, justified, used.
  //
  //    An exception holds ONLY for an adjacent declaration — on the same line, or on the
  //    line directly below the comment. Without that, a reason describing one rule would
  //    spread over a whole block, and moving code would leave a valid exception standing
  //    above something else entirely.
  const justified = new Set();
  const exceptionProblems = [];
  for (const sheet of sheets) {
    const { declarations, comments } = scans.get(sheet.file);
    for (const comment of comments) {
      const m = EXCEPTION.exec(comment.text);
      if (!m) continue;
      const [, property, rawJustification] = m;
      const justification = rawJustification.replace(/\*+\s*$/, '').trim();
      if (justification.length < MIN_JUSTIFICATION) {
        exceptionProblems.push(
          `${sheet.file}:${comment.line}: an exception for \`${property}\` with no ` +
            `justification (${justification.length} of ${MIN_JUSTIFICATION} characters) — ` +
            `a rubber stamp, not a reason`,
        );
        continue;
      }
      const matched = declarations.filter(
        (d) =>
          d.property === property.toLowerCase() &&
          (d.line === comment.line || d.line === comment.end + 1),
      );
      if (!matched.length) {
        exceptionProblems.push(
          `${sheet.file}:${comment.line}: an exception for \`${property}\` is ` +
            `adjacent to no declaration of that property — either the code moved and the ` +
            `exception was left behind, or the property named is not the one below`,
        );
        continue;
      }
      for (const d of matched) justified.add(`${sheet.file}:${d.line}`);
    }
  }
  if (exceptionProblems.length)
    throw new StyleError(
      'exception',
      `${exceptionProblems.length} exceptions are not exceptions:\n` +
        list(exceptionProblems) +
        `\n    Notation: /* pct-exception <property>: <why it is safe exactly here> */`,
    );

  // 5. Logical properties (`req-token-logical`).
  const physical = [];
  // 6. No compositing `opacity` (`req-token-no-opacity`).
  const translucent = [];
  // 8. No painting of an icon's insides (`req-api-icons`).
  const painted = [];
  // 9. Motion takes its time from the axis (`req-a11y-motion`).
  const hurried = [];

  for (const sheet of sheets)
    for (const d of scans.get(sheet.file).declarations) {
      if (justified.has(`${sheet.file}:${d.line}`)) continue;
      const where = `${sheet.file}:${d.line}`;

      const logical = PHYSICAL.get(d.property);
      if (logical) {
        physical.push(`${where}: \`${d.property}\` — use \`${logical}\``);
        continue;
      }
      const valueBased = PHYSICAL_BY_VALUE.get(d.property);
      const first = d.value.toLowerCase().split(/\s+/)[0];
      if (valueBased?.wrong.has(first)) {
        physical.push(
          `${where}: \`${d.property}: ${first}\` — use \`${valueBased.instead}\``,
        );
        continue;
      }
      if (d.property === 'inset' && d.value.split(/\s+/).length > 1) {
        physical.push(
          `${where}: \`inset: ${d.value}\` — several values set the inline axis ` +
            `physically; use \`inset-block-*\` / \`inset-inline-*\``,
        );
        continue;
      }
      if (OPACITY.has(d.property) && !binaryOpacity(d.value)) {
        translucent.push(`${where}: \`${d.property}: ${d.value}\``);
        continue;
      }
      if (PAINT.has(d.property)) {
        painted.push(`${where}: \`${d.property}: ${d.value}\``);
        continue;
      }
      if (MOTION.has(d.property) && TIME.test(d.value))
        hurried.push(`${where}: \`${d.property}: ${d.value}\``);
    }

  if (physical.length)
    throw new StyleError(
      'logical',
      `${physical.length} physical properties of the inline axis (req-token-logical):\n` +
        list(physical) +
        `\n    A physically described layout does NOT mirror under \`dir="rtl"\`, and no ` +
        `LTR screenshot shows it. If this one is safe, say why: ` +
        `/* pct-exception <property>: <reason> */`,
    );

  if (translucent.length)
    throw new StyleError(
      'opacity',
      `${translucent.length} \`opacity\` declarations compositing with the background (req-token-no-opacity):\n` +
        list(translucent) +
        `\n    The contrast gate computes on the palette's values, so it cannot see the ` +
        `compositing — this is the way back to before lesson-6. Express the state with a ` +
        `colour token of its own. Only \`0\` and \`1\` are allowed (a visibility switch).`,
    );

  // 7. Forced colours (`req-a11y-forced-colors`): a declaration inside
  //    `@media (forced-colors: active)` is not outranked by a base rule of the same sheet.
  //
  //    `@media` adds NO specificity, so `:host([disabled])` in the mode's block loses to
  //    `:host([disabled]:not([data-pct-loading]))` outside it: the rule looks like it
  //    handles the mode and paints nothing. Nothing goes red over that — chromium and
  //    firefox substitute the colours themselves, so the result comes out right whichever
  //    rule won, and the difference shows only in webkit (`lesson-56`) — and everywhere
  //    from the day any part of the library takes `forced-color-adjust: none`.
  //
  //    Sheet by sheet, which is how a browser sees them: component styles are scoped by
  //    the encapsulation shim, so a rule of `field.scss` never meets one of `select.scss`.
  //    The shim appends an attribute selector to every compound, and under the containment
  //    above the narrower selector never has fewer compounds than the wider one — so the
  //    shim can only widen the difference measured here, never close it.
  const outranked = [];
  let forcedDeclarations = 0;
  for (const sheet of sheets) {
    const declarations = [];
    for (const rule of cssRules(sheet.css))
      for (const selector of rule.selectors)
        for (const d of bodyDeclarations(rule.body))
          declarations.push({
            ...d,
            selector,
            forced: rule.forced,
            order: rule.order,
            spec: specificity(selector),
          });
    forcedDeclarations += declarations.filter((d) => d.forced).length;

    /** Which of two declarations for ONE element the browser applies. */
    const wins = (a, b) => {
      if (a.important !== b.important) return a.important;
      const difference = bySpecificity(a.spec, b.spec);
      return difference === 0 ? a.order > b.order : difference > 0;
    };

    for (const forced of declarations.filter((d) => d.forced))
      for (const base of declarations.filter((d) => !d.forced)) {
        if (!overlapping(forced.property, base.property)) continue;
        if (
          !matchesWithin(forced.selector, base.selector) &&
          !matchesWithin(base.selector, forced.selector)
        )
          continue;
        if (!wins(base, forced)) continue;
        // Another rule of the mode may already cover exactly the elements the base rule
        // takes: `.option { background: Canvas }` gives way to `[data-pct-selected]`, and
        // the block says so itself with `[data-pct-selected] { background: SelectedItem }`.
        // That is a block written out state by state, not a hole in the mode.
        const covered = declarations.some(
          (other) =>
            other.forced &&
            other !== forced &&
            overlapping(other.property, base.property) &&
            matchesWithin(other.selector, base.selector) &&
            wins(other, base),
        );
        if (covered) continue;
        outranked.push(
          `${sheet.file}: \`${forced.property}: ${forced.value}\` on ` +
            `\`${forced.selector}\` (${forced.spec.join(',')}) gives way to ` +
            `\`${base.property}\` on \`${base.selector}\` (${base.spec.join(',')})`,
        );
      }
  }

  if (outranked.length)
    throw new StyleError(
      'forced-colors',
      `${outranked.length} declarations of forced-colors mode that never paint ` +
        `(req-a11y-forced-colors):\n` +
        list(outranked) +
        `\n    \`@media\` adds no specificity of its own — inside it a rule beats the ` +
        `base sheet by its own selector alone. Repeat the base rule's selector, or narrow ` +
        `it further. Nothing here turns a test red: chromium and firefox substitute the ` +
        `colours anyway, so the mode looks handled everywhere but webkit (lesson-56).`,
    );

  // 8. The drawing paints itself (`req-api-icons`).
  if (painted.length)
    throw new StyleError(
      'paint',
      `${painted.length} declarations paint the inside of an icon (req-api-icons):\n` +
        list(painted) +
        `\n    These properties are obeyed by an \`<svg>\` and by nothing else, so the rule ` +
        `holds only for as long as the drawing is the one we wrote — and a consumer who ` +
        `registers a set through \`PCT_ICONS\` gets an unpainted icon with every test still ` +
        `green. Set \`color\` on the \`pct-icon\` and let the drawing take it through ` +
        `\`currentColor\`. If this one really is safe, say why: ` +
        `/* pct-exception <property>: <reason> */`,
    );

  // 9. Motion on the axis (`req-a11y-motion`): a duration written into a component sheet
  //    is a component that keeps its own time. The e2e gate of that promise measures the
  //    TOKENS — `150ms` with no preference, `0.01ms` with it — and a literal beside them
  //    is invisible to it: the axis reads right in the browser and this one component
  //    still moves for the user who asked it not to.
  if (hurried.length)
    throw new StyleError(
      'motion',
      `${hurried.length} declarations time themselves (req-a11y-motion):\n` +
        list(hurried) +
        `\n    Only the motion axis carries a second set of values under ` +
        `\`prefers-reduced-motion\`, so a duration written here opts this component out of ` +
        `the preference — and nothing turns red: the token gate measures the tokens, the ` +
        `screenshot is identical either way. Use ` +
        `\`var(--pct-motion-transition-duration)\` or \`var(--pct-motion-loop-duration)\`. ` +
        `If this one really is safe, say why: /* pct-exception <property>: <reason> */`,
      'literal',
    );

  const reduced = sheets.flatMap((sheet) =>
    [...sheet.css.matchAll(REDUCED)].map(
      () => `${sheet.file}: \`@media (prefers-reduced-motion: …)\``,
    ),
  );
  if (reduced.length)
    throw new StyleError(
      'motion',
      `${reduced.length} component sheets answer the motion preference themselves ` +
        `(req-a11y-motion, decision 0008):\n` +
        list(reduced) +
        `\n    The preference is answered once, in the token build, by a second set of ` +
        `values for the motion axis — every component inherits it by using the token and ` +
        `no component has to remember the rule. A sheet with its own query is a second ` +
        `answer to the same question, and which of them the user gets is then decided by ` +
        `the cascade.`,
      'query',
    );

  // 10. The touch floor (`req-a11y-touch`): every application of it is measured in a
  //     browser, and the list of applications is read out of the sheets.
  //
  //     The promise is a NUMBER IN A LAYOUT — 24 CSS pixels of hit area, whatever the
  //     drawing measures — so nothing but a browser can hold it. What a gate over the
  //     sources can do is the half a browser cannot: say how many there are to measure.
  //     Until this point existed that half was typed into the spec by hand, and the two
  //     lists disagreed by seven of nineteen without a single test going red — found only
  //     because a second sweep was written over the same promise and the two were compared
  //     (plan 4.53). A floor nobody measures is not a floor that is wrong; it is a floor
  //     whose deletion nothing would report, which is the whole of `req-axis`.
  const floors = floorVariables(tokenValues(tokens));
  if (!floors.size)
    throw new StyleError(
      'touch-floor',
      `not one token resolves to \`{${FLOOR}}\` in ${tokens.length} token ` +
        `${tokens.length === 1 ? 'source' : 'sources'} — so this point would find no floor ` +
        `in any sheet and pass having measured nothing (req-a11y-touch).\n` +
        `    Usual cause: the token sources stopped being read (a moved directory, a ` +
        `narrowed pattern), or \`${FLOOR}\` was renamed and the sheets go on naming the ` +
        `variables it used to feed.`,
      'tokens',
    );

  const applications = floorApplications(sheets, floors);
  if (!applications.length)
    throw new StyleError(
      'touch-floor',
      `${floors.size} tokens carry the touch floor and not one stylesheet applies it ` +
        `(req-a11y-touch) — the comparison below would then hold over an empty set, which ` +
        `is the state this point exists to make impossible.\n` +
        `    An application is a declaration of \`${[...SIZED].join('`, `')}\` whose value ` +
        `names one of those tokens. Usual cause: the last one was deleted, or a sheet now ` +
        `writes \`24px\` where it used to name the token — and then the promise is kept by ` +
        `a literal nobody can re-point.`,
      'denominator',
    );

  const claims = measurementClaims(measurements);
  const named = new Set(claims.map((claim) => claim.key));
  const unmeasured = applications.filter((a) => !named.has(a.key));
  if (unmeasured.length)
    throw new StyleError(
      'touch-floor',
      `${unmeasured.length} of ${applications.length} applications of the touch floor are ` +
        `measured by nobody (req-a11y-touch):\n` +
        list(
          unmeasured.map(
            (a) =>
              `${a.file}${a.lines.length ? `:${a.lines.join(', ')}` : ''}: ` +
              `\`${a.selector}\` — ${a.declarations.join('; ')}`,
          ),
        ) +
        `\n    Each of these holds a hit area at 24 px and nothing reads the box it ` +
        `produces, so deleting it turns no test red. Measure it in ` +
        `\`apps/sandbox-e2e/src/target-min.spec.ts\` — a case that reads the rendered ` +
        `rectangle with everything else disarmed — and write the address above beside it ` +
        `as \`applies: '<sheet> <selector>'\`, exactly as it is printed here.`,
      'unmeasured',
    );

  const applied = new Set(applications.map((a) => a.key));
  const adrift = claims.filter((claim) => !applied.has(claim.key));
  if (adrift.length)
    throw new StyleError(
      'touch-floor',
      `${adrift.length} measurements name an application no stylesheet declares ` +
        `(req-a11y-touch):\n` +
        list(adrift.map((claim) => `${claim.where}: \`${claim.key}\``)) +
        `\n    A case pointed at a floor that is not there measures whatever the element ` +
        `happens to be holding — its padding, its type — and reports the promise kept by ` +
        `something a consumer may re-tune ([\`lesson-174\`](../docs/lessons.md#lesson-174)). ` +
        `Either the sheet's selector moved and the claim has to follow it, or the floor is ` +
        `gone and the case with it.`,
      'stale',
    );

  const exceptions = justified.size;
  return (
    `${sheets.length} stylesheets, ${components.length} components, ` +
    `${exceptions} justified ${exceptions === 1 ? 'exception' : 'exceptions'}, ` +
    `${forcedDeclarations} forced-colors declarations, ` +
    `${applications.length} touch floors all measured`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * The component decorator. The parser anchors in column zero, because that is the
 * formatting `nx format:check` enforces, and the counter watches that a drift from that
 * assumption stays visible — a component the parser does not recognise is to drop out of
 * the measurement LOUDLY, not quietly.
 *
 * So the counter must NOT repeat the parser's anchor, and that is the whole point here.
 * The first version had `/^@Component\(/gm` in both places: moving a decorator by one
 * space put out the parser and the counter at once, both sides agreed on seven and the
 * gate ended green, having stopped measuring a whole component (`lesson-48`). Indentation
 * is therefore allowed here, and only occurrences in comments are filtered out —
 * `core/src/texts.ts` has `@Component(` in a JSDoc example, that is, on a line starting
 * with an asterisk.
 */
const COMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const COMPONENT_COUNT = /^[ \t]*@Component\(/gm;

const readComponents = (root, files) => {
  const components = [];
  let declarations = 0;
  for (const file of files) {
    const content = readFileSync(join(root, file), 'utf8');
    declarations += (content.match(COMPONENT_COUNT) ?? []).length;
    for (const [, body, className] of content.matchAll(COMPONENT)) {
      const sheets = [
        ...body.matchAll(/styleUrls?\s*:\s*(?:\[([^\]]*)\]|(['"])([^'"]*)\2)/g),
      ].flatMap(([, array, , single]) =>
        single !== undefined
          ? [single]
          : [...array.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]),
      );
      components.push({
        file,
        className,
        inline: /^\s*styles\s*:/m.test(body),
        sheets: sheets.map((a) =>
          relative(root, resolve(join(root, dirname(file)), a))
            .split('\\')
            .join('/'),
        ),
      });
    }
  }
  return { components, declarations };
};

/** A file with its text, for the two inputs point 10 reads without compiling anything. */
const withContent = (root, paths) =>
  paths.map((file) => ({
    file,
    content: readFileSync(join(root, file), 'utf8'),
  }));

/** An input built from a file list — the same shape for the repo and for a fixture. */
const collectInput = (
  root,
  sheetPaths,
  sourcePaths,
  tokenPaths,
  specPaths,
) => ({
  sheets: sheetPaths.map((file) => ({
    file,
    content: readFileSync(join(root, file), 'utf8'),
    // Sass's output, that is, what the browser really gets. The `expanded` style keeps
    // `/* */` comments, so point 2's comparison looks at the same material on both sides.
    css: sass.compile(join(root, file), { style: 'expanded' }).css,
  })),
  tokens: withContent(root, tokenPaths),
  measurements: withContent(root, specPaths),
  ...readComponents(root, sourcePaths),
});

/**
 * All the project's files from the GIT INDEX, not from a glob over the disk. The reason is
 * the same as in `check-zoneless` and `check-typecheck`: the index is an independent
 * record of what the repository really carries, and it cuts out generated things by itself
 * — `libs/components/themes/` is written by the token build on every run and is gitignored,
 * so there is nothing here to exclude it with.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS. Not a matter of taste: a git
 * pathspec is not a shell glob — without `:(glob)` a star crosses `/`, so
 * `libs/components/*​/src/**​/*.ts` asks for one directory too many and does not match
 * `button/src/button.ts`. It then returns ZERO files rather than an error. The first
 * version of this gate passed green with such a pattern, measuring zero components
 * (`lesson-48`).
 */
const indexedFiles = (pathspec) =>
  execFileSync('git', ['ls-files', '-z', pathspec], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * The sources searched for `@Component`. Specs are left out on purpose: they define host
 * components with a template and styles written into the decorator, and those travel
 * nowhere — point 3 would fire on every rendering test.
 */
const isSource = (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts');

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, the deletions
 * from `fixture.json` last. The case directory then holds NOTHING BUT the defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * Component sources sit in the repository as `*.ts.txt` and become `*.ts` only here. The
 * reason is hard and already written down in `tsconfig.root.json`: a `.ts` file in `tools/`
 * belongs to no compiler program, so it would fire `check-typecheck` (point 1 — a file
 * with no project). One gate's fixture must not be another's defect. The composition goes
 * to a temporary directory OUTSIDE the repository, so no gate ever sees the intermediate
 * material.
 */
const buildFixture = (name, fx) => {
  const destination = mkdtempSync(join(tmpdir(), 'pct-check-styles-'));
  cpSync(join(FIXTURES, REFERENCE), destination, { recursive: true });
  cpSync(join(FIXTURES, name), destination, {
    recursive: true,
    filter: (src) => basename(src) !== 'fixture.json',
  });
  for (const path of fx.drop ?? [])
    rmSync(join(destination, path), { recursive: true, force: true });
  for (const file of globSync('**/*.ts.txt', { cwd: destination }))
    renameSync(
      join(destination, file),
      join(destination, file.replace(/\.txt$/, '')),
    );
  return destination;
};

const files = (directory, pattern) =>
  globSync(pattern, { cwd: directory })
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * A prepared input's four lists. The two point 10 reads have directories of their own —
 * `tokens/` and `e2e/` — rather than a pattern over the whole tree: a case is built by
 * copying files onto a copy of the reference, and a glob wide enough to pick up
 * `fixture.json` would let a case's own declaration walk into the material it declares.
 */
const fixtureInput = (directory) =>
  collectInput(
    directory,
    files(directory, '**/*.scss'),
    files(directory, '**/*.ts').filter(isSource),
    files(directory, 'tokens/**/*.json'),
    files(directory, 'e2e/**/*.spec.ts'),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

try {
  const files = indexedFiles(PROJECT);
  description = checkStyles(
    collectInput(
      ROOT,
      files.filter((p) => p.endsWith('.scss')),
      files.filter(isSource),
      indexedFiles(TOKENS).filter((p) => p.endsWith('.json')),
      indexedFiles(MEASURED).filter((p) => p.endsWith('.spec.ts')),
    ),
  );
} catch (error) {
  if (!(error instanceof StyleError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-styles.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were the base defective itself, every case would
// fire because of it and not because of its own defect — every "rejected" would be
// false, and this control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkStyles(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof StyleError)) throw error;
    problems.push(
      `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
        `every prepared case now fires because of it.\n    ${error.message}`,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

for (const name of cases) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, name, 'fixture.json'), 'utf8'),
  );
  const directory = buildFixture(name, fx);
  try {
    checkStyles(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof StyleError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
    else if (fx.rule && error.rule !== fx.rule)
      problems.push(
        `${name}: point ${fx.point} fired on rule \`${error.rule ?? '—'}\` and the case ` +
          `is built for \`${fx.rule}\` — one point, two rules, and the one this input ` +
          `exists to prove is the one that stayed silent`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Style gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Styles: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
