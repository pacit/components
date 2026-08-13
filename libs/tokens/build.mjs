#!/usr/bin/env node
/**
 * A light DTCG token build -> CSS / SCSS / TS (docs/requirements/tokens.md).
 *
 *  - the DTCG files are the source of truth ($type/$value, {a.b.c} references),
 *  - token -> token references are KEPT as var() in the CSS (req-token-references), so
 *    overriding one variable in a scope cascades by itself,
 *  - light -> :root, dark -> [data-theme="dark"] (semantic overrides),
 *  - light is emitted A SECOND TIME as [data-theme="light"], so a theme can be switched
 *    both ways when nested (a light card inside a dark page); without it „light" is only
 *    the absence of an attribute (req-token-scoped),
 *  - system preferences (`prefers-color-scheme`, `prefers-reduced-motion`) are the same
 *    sets of overrides, only in an @media block instead of under an attribute selector
 *    (req-a11y-motion, req-token-skin),
 *  - the a11y gate: text/background contrast against WCAG 2.2 AA (req-token-text-pairs).
 *
 * Style Dictionary could replace this transform later — the contract (the DTCG files)
 * stays the same.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = join(__dirname, 'src');
const DIST = join(__dirname, 'dist');

// WCAG 2.2 contrast thresholds (defaults). „Large" text = >=18pt (24px) or >=14pt bold
// (~18.66px); SC 1.4.3. UI/non-text (SC 1.4.11) = 3.0 regardless of size.
const WCAG = {
  AA: { normal: 4.5, large: 3.0 },
  AAA: { normal: 7.0, large: 4.5 },
  // SC 1.4.11 — non-text elements (borders, focus ring): 3:1 with no distinction by
  // size, hence both thresholds equal.
  UI: { normal: 3.0, large: 3.0, nonText: true },
};

// --- loading / merging DTCG ---------------------------------------------------
const load = (f) => JSON.parse(readFileSync(join(SRC, f), 'utf8'));
const isToken = (v) => v && typeof v === 'object' && '$value' in v;

function flatten(tree, prefix = [], out = {}) {
  for (const [key, val] of Object.entries(tree)) {
    const path = [...prefix, key];
    if (isToken(val))
      out[path.join('.')] = { type: val.$type, value: val.$value };
    else if (val && typeof val === 'object') flatten(val, path, out);
  }
  return out;
}

const merge = (...trees) => {
  const acc = {};
  for (const t of trees) Object.assign(acc, flatten(t));
  return acc;
};

const cssVar = (dotPath) => '--' + dotPath.replace(/\./g, '-');
const REF = /^\{([^}]+)\}$/;

// a token value as CSS: a reference -> var(), a literal -> as it stands
function toCss(value, all) {
  if (typeof value === 'string') {
    const m = value.match(REF);
    if (m) {
      if (!(m[1] in all))
        throw new Error(`Nieznana referencja tokenu: {${m[1]}}`);
      return `var(${cssVar(m[1])})`;
    }
    return value;
  }
  return String(value);
}

// resolves a reference down to a literal (for the contrast validation)
function resolve(dotPath, all, seen = new Set()) {
  if (!(dotPath in all)) throw new Error(`Brak tokenu: ${dotPath}`);
  if (seen.has(dotPath)) throw new Error(`Cykl referencji: ${dotPath}`);
  seen.add(dotPath);
  const v = all[dotPath].value;
  if (typeof v === 'string') {
    const m = v.match(REF);
    if (m) return resolve(m[1], all, seen);
  }
  return v;
}

// --- kontrast WCAG ------------------------------------------------------------
function luminance(hex) {
  const h = hex.replace('#', '');
  const n =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const ch = [0, 2, 4].map((i) => {
    const c = parseInt(n.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(fgHex, bgHex) {
  const a = luminance(fgHex),
    b = luminance(bgHex);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

// One pair from the policy against the WCAG thresholds of its level.
function evaluateCheck(check, tree) {
  const ratio = contrast(resolve(check.fg, tree), resolve(check.bg, tree));
  const th = WCAG[check.level] ?? WCAG.AA;
  return {
    ratio,
    th,
    passNormal: ratio >= th.normal,
    passLarge: ratio >= th.large,
  };
}

// Validates one theme against the whole policy; returns errors and warnings, prints a report.
function checkTheme(themeName, tree, policy) {
  const errors = [];
  const warnings = [];
  console.log(`\nTheme: ${themeName}`);
  for (const check of policy.checks) {
    const { ratio, th, passNormal, passLarge } = evaluateCheck(check, tree);
    const flag = passNormal
      ? 'OK  '
      : check.severity === 'error'
        ? 'ERR '
        : 'WARN';
    console.log(
      th.nonText
        ? `  [${flag}] ${check.name}: ${ratio.toFixed(2)}:1  ` +
            `UI SC1.4.11(>=${th.normal}) ${passNormal ? 'PASS' : 'FAIL'}`
        : `  [${flag}] ${check.name}: ${ratio.toFixed(2)}:1  ` +
            `normal(${check.level}>=${th.normal}) ${passNormal ? 'PASS' : 'FAIL'} | ` +
            `large(>=${th.large}) ${passLarge ? 'PASS' : 'FAIL'}`,
    );
    if (!passNormal) {
      const note = th.nonText
        ? 'a non-text element below the SC 1.4.11 threshold'
        : passLarge
          ? 'readable for large text, but not for normal text'
          : 'not enough for large text either';
      const msg = `${themeName} / ${check.name}: ${ratio.toFixed(2)}:1 < ${th.normal} — ${note}`;
      if (check.severity === 'error') errors.push(msg);
      else warnings.push(msg);
    }
  }
  return { errors, warnings };
}

/**
 * Extends a set of overrides with every token that depends on them (the transitive closure
 * over references). Keeps the base tree's order, so references in the generated CSS are
 * declared before they are used.
 */
function withDependents(overrides, tree) {
  const affected = new Set(Object.keys(overrides));
  let grew = true;
  while (grew) {
    grew = false;
    for (const [path, tok] of Object.entries(tree)) {
      if (affected.has(path)) continue;
      const m = typeof tok.value === 'string' ? tok.value.match(REF) : null;
      if (m && affected.has(m[1])) {
        affected.add(path);
        grew = true;
      }
    }
  }
  // The result in tree order: the overrides take the theme's value, the rest keep their
  // reference (which now points at a re-themed token).
  const out = {};
  for (const [path, tok] of Object.entries(tree)) {
    if (affected.has(path)) out[path] = overrides[path] ?? tok;
  }
  return out;
}

// --- generating ---------------------------------------------------------------
function emitCssBlock(selector, entries, all) {
  const lines = Object.entries(entries).map(
    ([path, tok]) => `  ${cssVar(path)}: ${toCss(tok.value, all)};`,
  );
  return `${selector} {\n${lines.join('\n')}\n}`;
}

/** A conditional block — the same set of overrides, only under a media query. */
function emitMedia(condition, block, comment) {
  const body = block
    .split('\n')
    .map((l) => (l ? `  ${l}` : l))
    .join('\n');
  const head = comment ? `${comment}\n` : '';
  return `${head}@media ${condition} {\n${body}\n}`;
}

function run() {
  const primitive = load('primitive.json');
  const semanticLight = load('semantic.light.json');
  const semanticDark = load('semantic.dark.json');
  const motionReduced = load('motion.reduced.json');
  // Component tokens: `component.*.json` is auto-discovered — a new component needs no
  // change in this file.
  const componentFiles = readdirSync(SRC)
    .filter((f) => f.startsWith('component.') && f.endsWith('.json'))
    .sort();
  const components = componentFiles.map(load);

  const policy = JSON.parse(
    readFileSync(join(SRC, 'contrast.policy.json'), 'utf8'),
  );
  // The name dictionary. The build needs one thing from it — the list of prefixes kept
  // out of the public TS union — but that list lives THERE and not here, so `check-tokens`
  // can read it instead of guessing what this filter means.
  const nazwy = JSON.parse(
    readFileSync(join(SRC, 'nazwy.policy.json'), 'utf8'),
  );

  const lightTree = merge(primitive, semanticLight, ...components); // :root
  const darkTree = merge(primitive, semanticLight, ...components, semanticDark); // dark over base
  // Custom properties are substituted AT THE POINT OF DECLARATION, not of use: a token
  // `--a: var(--b)` declared in :root inherits an already resolved value, so overriding
  // `--b` in a narrower scope will not change it. The theme block has to receive the
  // transitive closure: the overrides plus everything that uses them (directly or through
  // a chain). Otherwise a scoped theme works on the semantic layer alone
  // (req-token-scoped, lesson-17).
  const darkOverrides = withDependents(flatten(semanticDark), darkTree);
  // The same set of tokens as in dark, with the light values: `light` has to be an active
  // theme rather than the absence of an attribute — otherwise a light card inside a dark
  // page inherits the dark values with nothing to undo them.
  const lightOverrides = Object.fromEntries(
    Object.keys(darkOverrides).map((path) => [path, lightTree[path]]),
  );

  // Reduced motion is orthogonal to the theme — it overrides only the `motion` axis, so
  // it does not collide with the `[data-theme]` blocks. The transitive closure is computed
  // by the same function as for a theme: today the axis has no dependents, but once a
  // component grows its own duration token (`--pct-x-duration:
  // var(--pct-motion-transition-duration)`), it will work with no change to the build.
  const reducedTree = merge(
    primitive,
    semanticLight,
    ...components,
    motionReduced,
  );
  const reducedOverrides = withDependents(flatten(motionReduced), reducedTree);

  // The a11y gate follows the skin policy (WCAG 2.2 thresholds), per theme.
  console.log('Skin contrast validation (policy, WCAG 2.2 thresholds):');
  const results = [
    checkTheme('light', lightTree, policy),
    checkTheme('dark', darkTree, policy),
  ];
  const warnings = results.flatMap((r) => r.warnings);
  const errors = results.flatMap((r) => r.errors);
  if (warnings.length) {
    console.warn(
      `\n! Contrast warnings (${warnings.length}):\n  - ` +
        warnings.join('\n  - '),
    );
  }
  if (errors.length) {
    console.error(
      `\nX A11y gate — FAILED (${errors.length} pairs below the requirement):\n  - ` +
        errors.join('\n  - '),
    );
    process.exit(1);
  }

  mkdirSync(DIST, { recursive: true });
  const base = lightTree; // the CSS/SCSS/TS generation below is unchanged

  // CSS
  const css =
    [
      '/* GENERATED from libs/tokens/src/*.json — do not edit by hand. */',
      emitCssBlock(':root', base, base),
      emitCssBlock('[data-theme="light"]', lightOverrides, lightTree),
      emitCssBlock('[data-theme="dark"]', darkOverrides, darkTree),
      // Automatic dark mode (req-token-skin). `:not([data-theme])` makes the system
      // preference a DEFAULT only: a page that declares a theme explicitly wins both
      // ways (`data-theme="light"` on <html> is the off switch). Nested themes keep
      // working, because the `[data-theme="light"]` block carries the full
      // counter-overrides — the same reason „light" is an active theme here rather than
      // a missing attribute.
      emitMedia(
        '(prefers-color-scheme: dark)',
        emitCssBlock(':root:not([data-theme])', darkOverrides, darkTree),
      ),
      // Reduced motion (req-a11y-motion) — one rule for the whole library.
      emitMedia(
        '(prefers-reduced-motion: reduce)',
        emitCssBlock(':root', reducedOverrides, reducedTree),
      ),
    ].join('\n\n') + '\n';
  writeFileSync(join(DIST, 'pct.css'), css);

  // SCSS (variables pointing at CSS custom properties — for internal use)
  const scss =
    '// GENERATED — SCSS variables pointing at CSS custom properties.\n' +
    Object.keys(base)
      .map((path) => `$${path.replace(/\./g, '-')}: var(${cssVar(path)});`)
      .join('\n') +
    '\n';
  writeFileSync(join(DIST, '_tokens.scss'), scss);

  // TS (typed names of the semantic and component tokens)
  const publicPaths = Object.keys(base).filter(
    (p) => !nazwy.prywatne.prefiksy.some((prefiks) => p.startsWith(prefiks)),
  );
  const tsEntries = publicPaths
    .map((p) => `  '${p}': 'var(${cssVar(p)})',`)
    .join('\n');
  // Two shapes of the same knowledge, because it is used in two ways. `PctTokenName` is
  // the DTCG path (`pct.surface`) — that is how a token is addressed in the sources.
  // `PctCssVar` is the custom-property name (`--pct-surface`) — that is how the browser is
  // asked in tests and in theming code. Without the second type, a typo in
  // `getPropertyValue('--pct-surfce')` returns an empty string, and a test comparing two
  // empty strings passes.
  const cssVarUnion = publicPaths.map((p) => `  | '${cssVar(p)}'`).join('\n');
  const ts =
    '// GENERATED from libs/tokens/src/*.json — do not edit by hand.\n' +
    `export const pctTokens = {\n${tsEntries}\n} as const;\n\n` +
    'export type PctTokenName = keyof typeof pctTokens;\n\n' +
    "/** A token's custom-property name — the way the browser is asked for it. */\n" +
    `export type PctCssVar =\n${cssVarUnion};\n`;
  writeFileSync(join(DIST, 'tokens.ts'), ts);

  console.log(
    `\n✓ Built ${Object.keys(base).length} tokens ` +
      `(+${Object.keys(darkOverrides).length} dark, ` +
      `+${Object.keys(reducedOverrides).length} reduced-motion) ` +
      `-> dist/{pct.css,_tokens.scss,tokens.ts}`,
  );
}

run();
