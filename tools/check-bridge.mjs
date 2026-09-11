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
 *     refusals, and on the prepared inputs below by what comes back,
 *  7. AXES: every set that is an axis OPTION is switchable — the themes that enable it are
 *     some, and not all, of one group's. Three rules: `axis-of-one` (a group with one option
 *     is a switch that cannot be switched back), `axis-in-the-base` (an option no group turns
 *     off is a default, whatever it is called) and `axis-denominator` (a parse that finds no
 *     axis has pronounced on nothing).
 *
 * Point 4 asks whether every set is enabled SOMEWHERE, and a set enabled in the wrong place is
 * enabled somewhere: that is how `density.compact` spent its first hours enabled in the light
 * theme and the dark one at once, with sixteen negative-control cases green beside it
 * ([`lesson-190`](../docs/lessons.md#lesson-190)). Point 7 is the question point 4 does not
 * ask — placement — and it reads the axes out of the sets themselves (`axesOf`) rather than
 * out of `$themes.json`, so the file under test does not get to define what it is measured
 * against.
 *
 * An eighth run examines the gate itself (`req-quality-negative-control`): `check-bridge.fixtures/`.
 *
 * Usage: node tools/check-bridge.mjs
 */
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  axesOf,
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

/**
 * A violation, carrying the point it belongs to and — where the point has more than one
 * sentence — the RULE that fired. A point is not one rule: point 7 has three, and comparing
 * the point's identifier alone would let a prepared input fire on a neighbouring rule and
 * still look like proof of the one it declares (`lesson-50`).
 */
class BridgeError extends Error {
  constructor(check, message, rule = null) {
    super(message);
    this.check = check;
    this.rule = rule;
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
  // Read defensively: a `tokenSetOrder` that is not a list is the same defect as a missing
  // one, and it has to come out as the sentence below rather than as a `TypeError` here —
  // both here and at point 7, which reads the sets in this order.
  const written = JSON.parse(exported.get('$metadata.json')).tokenSetOrder;
  const order = Array.isArray(written) ? written : [];
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
  // 7. The axes, and where their options are allowed to be enabled.
  //
  // The axes are derived from the sets themselves — a qualified set that re-points a name an
  // earlier set already declares is one option of the axis its stem names (`axesOf`) — and
  // read in the order `$metadata.json` gives, because "already declares" is a statement about
  // that order. Deriving them here rather than reading `$themes.json`'s groups is the whole
  // point: a file does not get to define the thing it is measured against.
  const inOrder = new Map(
    order.map((name) => [name, tokensBySet.get(name) ?? new Set()]),
  );
  const axes = axesOf(inOrder);
  const axisOf = new Map(
    [...axes].flatMap(([stem, names]) => names.map((name) => [name, stem])),
  );
  const baseSets = setNames.filter((name) => !axisOf.has(name));
  if (!axes.size || !baseSets.length)
    throw new BridgeError(
      'axes',
      `point 7 examined nothing: the parse found ${axes.size} axis(es) and ${baseSets.length} ` +
        `base set(s) among ${setNames.length} sets — this skin HAS axes (a scheme, a motion ` +
        `and a density one: \`req-token-skin\`, \`req-a11y-motion\`, \`req-token-density\`), ` +
        `and a point that finds none is green because it read nothing, not because the export ` +
        `is right. Open \`libs/tokens/bridge.mjs\` → \`axesOf\` and the set files under ` +
        `\`libs/tokens/src/\`: an axis option is a qualified set that RE-POINTS names another ` +
        `set declares, so a run with no axes means either the files are gone or they have ` +
        `stopped re-pointing anything.`,
      'axis-denominator',
    );
  const enables = (theme, name) =>
    (theme.selectedTokenSets ?? {})[name] === 'enabled';
  const named = (list) => list.map((t) => `\`${t.name}\``).join(', ');
  for (const [name, stem] of axisOf) {
    const on = themes.filter((theme) => enables(theme, name));
    // A set no theme enables is point 4's sentence, already thrown above. Repeating it here
    // would be a second voice on one defect, and the reader would have to decide which of the
    // two to believe.
    if (!on.length) continue;
    const groups = [...new Set(on.map((theme) => theme.group))];
    const siblings = themes.filter((theme) => theme.group === groups[0]);
    // The two rules are kept apart on purpose, and in this order: a group holding a single
    // option is ALSO a group that never turns its option off, so diagnosing it as the latter
    // would send the reader looking for a theme to fix that does not exist.
    if (groups.length === 1 && siblings.length < 2)
      throw new BridgeError(
        'axes',
        `\`${name}\` is the only option of group \`${groups[0]}\` — an axis with one option ` +
          `is not an axis, it is a switch that cannot be switched back: the plugin offers ` +
          `\`${on[0].name}\` and nothing to return to. The \`${stem}\` axis owes a second theme ` +
          `in that group, the one whose sets are the base (\`comfortable\` and \`full\` are the ` +
          `two written today). Open \`libs/tokens/bridge.mjs\` → \`themesOf\`.`,
        'axis-of-one',
      );
    if (groups.length > 1 || siblings.every((theme) => enables(theme, name)))
      throw new BridgeError(
        'axes',
        `\`${name}\` is an option of the \`${stem}\` axis and ${
          groups.length > 1
            ? `${named(on)} enable it, across ${groups.length} groups ` +
              `(\`${groups.join('\`, \`')}\`)`
            : `every theme of group \`${groups[0]}\` enables it (${named(siblings)})`
        } — so it is on whatever a designer picks, which makes it part of the BASE and not an ` +
          `option at all. That is how \`density.compact\` read as this library's default ` +
          `control heights (lesson-190). The base is what the axes leave over: open ` +
          `\`libs/tokens/bridge.mjs\` → \`themesOf\` and enable \`${name}\` in the one theme ` +
          `that names it.`,
        'axis-in-the-base',
      );
  }
  return {
    sets: exportedSets.length,
    tokens: [...trees.values()].reduce((n, t) => n + tokensOf(t).length, 0),
    themes: themes.length,
    axes: [...axes.keys()],
    base: baseSets.length,
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
  problems.push(
    `${error.check}${error.rule ? ` [${error.rule}]` : ''}: ${error.message}`,
  );
}

// ── the negative control ──────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the live export, so the case file holds nothing but its
 * own defect: `drop` loses a file; `sets` patches a token of a set by its dotted path (`null`
 * drops it, a new path adds it, a key set to `null` is removed); `themes` patches a theme by
 * name (its sets, or its name); `dropThemes` loses a theme; `metadata` replaces the set order
 * or drops names from it; `withoutSets` is the repository AS IF those set files had never been
 * written — the source, the exported file, the set order and every theme that names it go
 * together, which is a coherent library with fewer sets rather than an export that lost one
 * (that is `drop`, and point 1 catches it before anything else can).
 */
const buildFixture = (fixtureLive, fx) => {
  const exported = new Map(fixtureLive.exported);
  const sources = new Map(fixtureLive.sources);
  for (const file of fx.drop ?? []) exported.delete(file);
  if (fx.withoutSets?.length) {
    const gone = new Set(fx.withoutSets);
    for (const name of gone) {
      sources.delete(`${name}.json`);
      exported.delete(`${name}.json`);
    }
    if (exported.has('$metadata.json')) {
      const metadata = JSON.parse(exported.get('$metadata.json'));
      metadata.tokenSetOrder = (metadata.tokenSetOrder ?? []).filter(
        (n) => !gone.has(n),
      );
      exported.set('$metadata.json', JSON.stringify(metadata, null, 2) + '\n');
    }
    if (exported.has('$themes.json')) {
      const themes = JSON.parse(exported.get('$themes.json')).map((theme) => ({
        ...theme,
        selectedTokenSets: Object.fromEntries(
          Object.entries(theme.selectedTokenSets ?? {}).filter(
            ([name]) => !gone.has(name),
          ),
        ),
      }));
      exported.set('$themes.json', JSON.stringify(themes, null, 2) + '\n');
    }
  }
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
  if (fx.dropThemes?.length && exported.has('$themes.json')) {
    const themes = JSON.parse(exported.get('$themes.json'));
    for (const name of fx.dropThemes) {
      const at = themes.findIndex((t) => t.name === name);
      if (at < 0)
        throw new Error(`${fx.check}: no theme named \`${name}\` to drop`);
      themes.splice(at, 1);
    }
    exported.set('$themes.json', JSON.stringify(themes, null, 2) + '\n');
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
  return { sources, exported };
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
      // A point is not one sentence (`lesson-50`). A case that declares a rule has to fire on
      // THAT rule: point 7's three would otherwise cover for one another, and a case aimed at
      // the denominator would be satisfied by any of them.
      else if (fx.rule && error.rule !== fx.rule)
        problems.push(
          `${name}: at point ${fx.point} rule \`${error.rule ?? 'none'}\` fired, and \`${fx.rule}\` was meant to — the same point, a different sentence`,
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
    `${summary.base} sets in the base and ${summary.axes.length} axes over it ` +
    `(\`${summary.axes.join('\`, \`')}\`), each option switchable in its own group; ` +
    `the round trip is the identity and three doctored exports were refused. ` +
    `Negative control: the live input passes, ${cases.length} prepared ones rejected on their own points.`,
);
