#!/usr/bin/env node
/**
 * Bridge gate: does what `libs/tokens/bridge.mjs` sends to Tokens Studio say what the sources
 * say, and does what comes back land where it belongs (`req-token-bridge`)? A design tool's
 * export is the one file a designer trusts without opening the repository, and every way it
 * can lie is quiet: a set left out reads as "no tokens there", a shadow written as one string
 * reads as a shadow the plugin shows blank, a reference into a set the theme does not enable
 * reads as a token with no value in Figma and a perfectly good one in CSS.
 *
 *  1. SETS: the export has one file per source set and no other, `$metadata.json` orders every
 *     set once, `$themes.json` is there,
 *  2. DIALECT: every token's `$type` is one the plugin reads in its DTCG mode, and its `$value`
 *     has the shape that type takes there — a shadow an object, a bezier four numbers, a
 *     length with its unit,
 *  3. REFERENCES: for every theme, every reference in an enabled set resolves in a set that
 *     theme enables — a value CSS resolves and Figma cannot is a token that lies in one place,
 *  4. THEMES: every set is enabled by some theme, a theme's name is unique in its group, and a
 *     theme names only sets that exist, in states the plugin knows,
 *  5. ROUND TRIP: importing the export onto the sources changes nothing, byte for byte — the
 *     bridge translates both ways without loss, and a comment stays where it stood,
 *  6. REFUSAL: a token added, dropped or retyped in the tool, and a modifier, are refused by
 *     the import — measured live by doctoring the export three ways and requiring three
 *     refusals, and on the prepared inputs below by what comes back.
 *
 * A seventh run examines the gate itself (`req-quality-negative-control`): `check-bridge.fixtures/`.
 *
 * Usage: node tools/check-bridge.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  BridgeRefusal,
  dialectProblem,
  exportSets,
  importSets,
  parseOrdered,
  plain,
  setFiles,
  SRC,
  stringifyOrdered,
  tokensOf,
} from '../libs/tokens/bridge.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-bridge.fixtures');
const REFERENCE = '_reference.json';
const STATES = new Set(['enabled', 'source', 'disabled']);
const REF = /\{([a-z0-9.-]+)\}/g;

class BridgeError extends Error {
  constructor(check, message) {
    super(message);
    this.check = check;
  }
}

const readInput = () => ({
  sources: new Map(
    setFiles().map((f) => [f, readFileSync(join(SRC, f), 'utf8')]),
  ),
  exported: exportSets(),
});

/** Every `{…}` inside a value, however deep — a shadow's colour can be a reference too. */
const referencesIn = (value) =>
  [...JSON.stringify(value).matchAll(REF)].map((m) => m[1]);

const checkBridge = ({ sources, exported }) => {
  // 1. The sets.
  const setNames = [...sources.keys()].map((f) => f.slice(0, -'.json'.length));
  for (const file of sources.keys())
    if (!exported.has(file))
      throw new BridgeError(
        'sets',
        `\`${file}\` is a source set and the export has no file for it — a set left out reads as "no tokens there"`,
      );
  const exportedSets = [...exported.keys()].filter(
    (f) => f.endsWith('.json') && !f.startsWith('$'),
  );
  for (const file of exportedSets)
    if (!sources.has(file))
      throw new BridgeError(
        'sets',
        `the export carries \`${file}\`, which is no source set — the plugin would show tokens the build never emits`,
      );
  if (!exported.has('$metadata.json'))
    throw new BridgeError(
      'sets',
      'the export has no `$metadata.json` — without the set order the plugin resolves duplicates in the order it happens to load',
    );
  const order = JSON.parse(exported.get('$metadata.json')).tokenSetOrder ?? [];
  for (const name of setNames)
    if (order.filter((n) => n === name).length !== 1)
      throw new BridgeError(
        'sets',
        `\`$metadata.json\` orders \`${name}\` ${order.filter((n) => n === name).length} times — every set once`,
      );
  for (const name of order)
    if (!setNames.includes(name))
      throw new BridgeError(
        'sets',
        `\`$metadata.json\` orders \`${name}\`, which is no set`,
      );
  if (!exported.has('$themes.json'))
    throw new BridgeError(
      'sets',
      'the export has no `$themes.json` — the plugin then shows one flat pile of sets, and light and dark are two files with the same names',
    );
  // 2. The dialect.
  const trees = new Map(
    exportedSets.map((f) => [f, parseOrdered(exported.get(f))]),
  );
  for (const [file, tree] of trees)
    for (const [path, token] of tokensOf(tree)) {
      const type = token.get('$type');
      const problem = dialectProblem(type, plain(token.get('$value')));
      if (problem)
        throw new BridgeError(
          'dialect',
          `${file}: \`${path}\` (${JSON.stringify(type)}) — ${problem}; the plugin would show it blank or not at all`,
        );
    }
  // 3. and 4. The themes and their references.
  const themes = JSON.parse(exported.get('$themes.json'));
  if (!Array.isArray(themes) || themes.length === 0)
    throw new BridgeError('themes', '`$themes.json` holds no theme');
  const tokensBySet = new Map(
    [...trees].map(([f, t]) => [
      f.slice(0, -'.json'.length),
      new Set(tokensOf(t).map(([p]) => p)),
    ]),
  );
  for (const theme of themes) {
    if (!theme.id || !theme.name || !theme.group)
      throw new BridgeError(
        'themes',
        `a theme without an id, a name and a group: ${JSON.stringify(theme)}`,
      );
    for (const [name, state] of Object.entries(theme.selectedTokenSets ?? {})) {
      if (!setNames.includes(name))
        throw new BridgeError(
          'themes',
          `theme \`${theme.name}\` names \`${name}\`, which is no set`,
        );
      if (!STATES.has(state))
        throw new BridgeError(
          'themes',
          `theme \`${theme.name}\` puts \`${name}\` in state \`${state}\` — the plugin knows enabled, source and disabled`,
        );
    }
    const twin = themes.find(
      (t) => t !== theme && t.group === theme.group && t.name === theme.name,
    );
    if (twin)
      throw new BridgeError(
        'themes',
        `two themes named \`${theme.name}\` in group \`${theme.group}\` — the plugin cannot tell them apart`,
      );
    const visible = Object.entries(theme.selectedTokenSets ?? {})
      .filter(([, state]) => state !== 'disabled')
      .map(([name]) => name);
    const reachable = new Set(
      visible.flatMap((name) => [...(tokensBySet.get(name) ?? [])]),
    );
    for (const name of visible)
      for (const [path, token] of tokensOf(trees.get(`${name}.json`)))
        for (const ref of referencesIn(plain(token.get('$value'))))
          if (!reachable.has(ref))
            throw new BridgeError(
              'references',
              `theme \`${theme.name}\`: \`${path}\` in \`${name}\` refers to \`{${ref}}\`, which no set the theme enables defines — ` +
                `a value CSS resolves and Figma cannot`,
            );
  }
  for (const name of setNames)
    if (!themes.some((t) => (t.selectedTokenSets ?? {})[name] === 'enabled'))
      throw new BridgeError(
        'themes',
        `no theme enables \`${name}\` — a set no theme enables is a set the designer never sees`,
      );
  // 5. The round trip.
  let back;
  try {
    back = importSets(exported);
  } catch (error) {
    if (!(error instanceof BridgeRefusal)) throw error;
    throw new BridgeError('refusal', error.message);
  }
  for (const [file, text] of back.files)
    if (text !== sources.get(file)) {
      const a = sources.get(file).split('\n');
      const b = text.split('\n');
      const at = b.findIndex((line, i) => a[i] !== line);
      throw new BridgeError(
        'round-trip',
        `importing the export back changes \`${file}\` at line ${at + 1} (${JSON.stringify(b[at] ?? '')}) — ` +
          `a value changed in the tool comes in through \`bridge.mjs import\`, where the build and check-tokens judge it; ` +
          `the export on disk is a mirror, not a draft`,
      );
    }
  // 6. The refusals, measured live: the export doctored three ways, three refusals owed.
  const doctored = (file, edit) => {
    const copy = new Map(exported);
    const tree = parseOrdered(copy.get(file));
    edit(tree);
    copy.set(file, stringifyOrdered(tree) + '\n');
    return copy;
  };
  const first = exportedSets[0];
  const [firstPath, firstToken] = tokensOf(trees.get(first))[0];
  const at = (tree, path) => path.split('.').reduce((m, k) => m.get(k), tree);
  const parentOf = (tree, path) =>
    at(tree, path.split('.').slice(0, -1).join('.'));
  const refusals = [
    [
      'added',
      (t) =>
        parentOf(t, firstPath).set(
          'ghost',
          new Map([
            ['$type', firstToken.get('$type')],
            ['$value', firstToken.get('$value')],
          ]),
        ),
    ],
    [
      'dropped',
      (t) => parentOf(t, firstPath).delete(firstPath.split('.').pop()),
    ],
    [
      'retyped',
      (t) =>
        at(t, firstPath).set(
          '$type',
          firstToken.get('$type') === 'number' ? 'color' : 'number',
        ),
    ],
  ];
  for (const [what, edit] of refusals) {
    let refused = false;
    try {
      importSets(doctored(first, edit));
    } catch (error) {
      if (!(error instanceof BridgeRefusal)) throw error;
      refused = true;
    }
    if (!refused)
      throw new BridgeError(
        'refusal',
        `the import ACCEPTED a token ${what} in the tool (\`${firstPath}\` of \`${first}\`) — a name is a decision made here, and the bridge stopped saying so`,
      );
  }
  return {
    sets: exportedSets.length,
    tokens: [...trees.values()].reduce((n, t) => n + tokensOf(t).length, 0),
    themes: themes.length,
  };
};

// ── the live run ──────────────────────────────────────────────────────────────

const problems = [];
let live = null;
let summary = null;
try {
  live = readInput();
  summary = checkBridge(live);
} catch (error) {
  if (!(error instanceof BridgeError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the live export, so the case file holds nothing but its
 * own defect: `drop` loses a file; `sets` patches a token of a set by its dotted path (`null`
 * drops it, a new path adds it, a key set to `null` is removed); `themes` patches a theme by
 * name (its sets, or its name); `metadata` replaces the set order or drops names from it.
 */
const buildFixture = (fixtureLive, fx) => {
  const exported = new Map(fixtureLive.exported);
  for (const file of fx.drop ?? []) exported.delete(file);
  for (const [file, patches] of Object.entries(fx.sets ?? {})) {
    const tree = parseOrdered(exported.get(file));
    for (const [path, patch] of Object.entries(patches)) {
      const keys = path.split('.');
      let node = tree;
      for (const k of keys.slice(0, -1)) {
        if (!node.has(k)) node.set(k, new Map());
        node = node.get(k);
      }
      const last = keys[keys.length - 1];
      if (patch === null) node.delete(last);
      else {
        if (!node.has(last)) node.set(last, new Map());
        const token = node.get(last);
        for (const [k, v] of Object.entries(patch))
          if (v === null) token.delete(k);
          else
            token.set(
              k,
              v && typeof v === 'object' && !Array.isArray(v)
                ? new Map(Object.entries(v))
                : v,
            );
      }
    }
    exported.set(file, stringifyOrdered(tree) + '\n');
  }
  if (fx.themes && exported.has('$themes.json')) {
    const themes = JSON.parse(exported.get('$themes.json'));
    for (const [name, patch] of Object.entries(fx.themes)) {
      const theme = themes.find((t) => t.name === name);
      if (!theme)
        throw new Error(`${fx.check}: no theme named \`${name}\` to patch`);
      if (patch.selectedTokenSets)
        Object.assign(theme.selectedTokenSets, patch.selectedTokenSets);
      if (patch.name) theme.name = patch.name;
    }
    exported.set('$themes.json', JSON.stringify(themes, null, 2) + '\n');
  }
  if (fx.metadata && exported.has('$metadata.json')) {
    const metadata = JSON.parse(exported.get('$metadata.json'));
    if (fx.metadata.drop)
      metadata.tokenSetOrder = metadata.tokenSetOrder.filter(
        (n) => !fx.metadata.drop.includes(n),
      );
    if (fx.metadata.add) metadata.tokenSetOrder.push(...fx.metadata.add);
    exported.set('$metadata.json', JSON.stringify(metadata, null, 2) + '\n');
  }
  return { sources: fixtureLive.sources, exported };
};

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();
if (cases.length === 0)
  problems.push(
    `tools/check-bridge.fixtures: no prepared inputs — a gate with no proof that it can fail is one more silent defect (req-quality-negative-control)`,
  );

if (summary) {
  for (const name of cases) {
    const fx = readFixture(name);
    try {
      checkBridge(buildFixture(live, fx));
      problems.push(
        `${name}: the prepared input PASSED and was meant not to — point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
      );
    } catch (error) {
      if (!(error instanceof BridgeError)) throw error;
      if (error.check !== fx.check)
        problems.push(
          `${name}: check \`${error.check}\` fired, and point ${fx.point} (\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
        );
    }
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bridge gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(
  `✓ Bridge gate: ${summary.sets} sets, ${summary.tokens} tokens, ${summary.themes} themes in the plugin's dialect; ` +
    `the round trip is the identity and three doctored exports were refused. ` +
    `Negative control: the live input passes, ${cases.length} prepared ones rejected on their own points.`,
);
