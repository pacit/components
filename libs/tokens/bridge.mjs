#!/usr/bin/env node
/**
 * The bridge between the DTCG sources and Tokens Studio for Figma (`req-token-bridge`). Two
 * directions, one law: **the sources are the truth, and a name is a decision made here** — the
 * bridge carries values across, never names.
 *
 *   export  src/*.json ─→ dist/tokens-studio/   one file per set in the plugin's DTCG
 *                                                dialect, plus `$themes.json` (a base, and
 *                                                over it the three axes the sets declare:
 *                                                light/dark, full/reduced, comfortable/compact)
 *                                                and `$metadata.json` (the set order the build
 *                                                resolves in),
 *   import  <dir> ─→ src/*.json                  the plugin's export read back: a value or a
 *                                                description a designer changed is written
 *                                                into the source token it belongs to, and
 *                                                nothing else in the file moves.
 *
 * What the import REFUSES, loudly: a set the sources do not have, a token added, a token
 * dropped, a token retyped, a modifier (`$extensions`) — each of those is a decision that
 * belongs in this repository, in the same diff as the stylesheet or the token that reads
 * it (0020: the palette carries no spares). A value that comes back unchanged leaves its
 * source text exactly as it was, so the round trip `import(export(src)) === src` holds byte
 * for byte, and `tools/check-bridge.mjs` holds it.
 *
 * The dialect is the plugin's reading of the DTCG draft: `$type`/`$value`/`$description`,
 * `{a.b.c}` references, a shadow as an object (`offsetX`, `offsetY`, `blur`, `spread`,
 * `color`), a cubic bezier as four numbers. The sources write both as CSS — the build emits
 * them as they stand — so the bridge translates on the way out and on the way back in, and
 * `$comment` keys stay home: they are this repository's notes, not a designer's.
 *
 * The sources are parsed and written by a parser of their own (`parseOrdered` /
 * `stringifyOrdered`), not `JSON.parse` — a JavaScript object puts integer-like keys first
 * whatever the text said, and `primitive.json` has a `$comment` standing between `100` and
 * `200` of a ramp. A round trip through `JSON.parse` would move it, and a bridge that moves
 * a comment is a bridge that rewrites a file it was asked to leave alone.
 *
 * Usage:
 *   node libs/tokens/bridge.mjs export [<dir>]   (default: libs/tokens/dist/tokens-studio)
 *   node libs/tokens/bridge.mjs import <dir>
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const SRC = join(__dirname, 'src');
export const DIST = join(__dirname, 'dist/tokens-studio');

const REF = /^\{([a-z0-9.-]+)\}$/;
const KEEP = new Set(['$type', '$value', '$description']);

export class BridgeRefusal extends Error {}

// ── an ordered JSON ───────────────────────────────────────────────────────────

/** JSON text → nested `Map`s (objects) and arrays, in the text's own key order. */
export const parseOrdered = (text) => {
  let i = 0;
  const fail = (what) => {
    throw new Error(`bridge: ${what} at offset ${i}`);
  };
  const skip = () => {
    while (i < text.length && /\s/.test(text[i])) i++;
  };
  const string = () => {
    if (text[i] !== '"') fail('expected a string');
    const start = i++;
    while (i < text.length) {
      if (text[i] === '\\') i += 2;
      else if (text[i] === '"') return JSON.parse(text.slice(start, ++i));
      else i++;
    }
    fail('unterminated string');
  };
  const value = () => {
    skip();
    const c = text[i];
    if (c === '{') {
      i++;
      const m = new Map();
      skip();
      if (text[i] === '}') return (i++, m);
      for (;;) {
        skip();
        const k = string();
        skip();
        if (text[i] !== ':') fail('expected ":"');
        i++;
        m.set(k, value());
        skip();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === '}') return (i++, m);
        fail('expected "," or "}"');
      }
    }
    if (c === '[') {
      i++;
      const a = [];
      skip();
      if (text[i] === ']') return (i++, a);
      for (;;) {
        a.push(value());
        skip();
        if (text[i] === ',') {
          i++;
          continue;
        }
        if (text[i] === ']') return (i++, a);
        fail('expected "," or "]"');
      }
    }
    if (c === '"') return string();
    for (const [word, v] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ])
      if (text.startsWith(word, i)) return ((i += word.length), v);
    const m = /^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(text.slice(i));
    if (!m) fail('unexpected character');
    i += m[0].length;
    return Number(m[0]);
  };
  const v = value();
  skip();
  if (i !== text.length) fail('trailing characters');
  return v;
};

/** The inverse, in the shape prettier gives a JSON file: two spaces, one entry per line. */
export const stringifyOrdered = (v, indent = '') => {
  const inner = indent + '  ';
  if (v instanceof Map) {
    if (v.size === 0) return '{}';
    return (
      '{\n' +
      [...v]
        .map(
          ([k, x]) =>
            `${inner}${JSON.stringify(k)}: ${stringifyOrdered(x, inner)}`,
        )
        .join(',\n') +
      `\n${indent}}`
    );
  }
  if (Array.isArray(v)) {
    if (v.length === 0) return '[]';
    return (
      '[\n' +
      v.map((x) => inner + stringifyOrdered(x, inner)).join(',\n') +
      `\n${indent}]`
    );
  }
  return JSON.stringify(v);
};

/** Every token of a tree: `[path, token]`, path dotted, in the tree's order. */
export const tokensOf = (tree, path = [], out = []) => {
  if (tree instanceof Map && tree.has('$value')) {
    out.push([path.join('.'), tree]);
    return out;
  }
  if (tree instanceof Map)
    for (const [k, v] of tree)
      if (!k.startsWith('$')) tokensOf(v, [...path, k], out);
  return out;
};

// ── the dialect ───────────────────────────────────────────────────────────────

/** The named easings CSS knows, as the four numbers the DTCG writes them with. */
const EASINGS = {
  ease: [0.25, 0.1, 0.25, 1],
  linear: [0, 0, 1, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

const LENGTH =
  /^-?(?:\d+\.?\d*|\.\d+)(?:px|rem|em|%|vw|vh|vmin|vmax|ch|cap|ex)$|^0$/;
const FUNCTION = /^(?:clamp|calc|min|max)\(.+\)$/;
const COLOR = /^#[0-9a-f]{3,8}$|^(?:rgb|rgba|hsl|hsla|color)\(.+\)$/i;
const DURATION = /^(?:\d+\.?\d*|\.\d+)(?:ms|s)$/;

/** Splits a CSS list on spaces outside parentheses — `rgba(15, 23, 42, 0.14)` is one term. */
const terms = (css) => {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of css) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ' ' && depth === 0) {
      if (cur) out.push(cur);
      cur = '';
    } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
};

/** A CSS `box-shadow` (one layer) → the DTCG shadow object; null when it is not one. */
const shadowOut = (css) => {
  const list = terms(css);
  const inset = list.includes('inset');
  const rest = list.filter((t) => t !== 'inset');
  const lengths = rest.filter((t) => LENGTH.test(t));
  const colours = rest.filter((t) => !LENGTH.test(t));
  if (lengths.length < 2 || lengths.length > 4 || colours.length !== 1)
    return null;
  const [offsetX, offsetY, blur = '0px', spread = '0px'] = lengths.map((l) =>
    l === '0' ? '0px' : l,
  );
  return {
    color: colours[0],
    offsetX,
    offsetY,
    blur,
    spread,
    ...(inset ? { inset } : {}),
  };
};

const shadowIn = (o) =>
  `${o.inset ? 'inset ' : ''}${o.offsetX} ${o.offsetY} ${o.blur} ${o.spread} ${o.color}`;

/** A source value → what the plugin reads. References and everything the plugin already reads pass unchanged. */
export const toDialect = (value, type) => {
  if (typeof value === 'string' && REF.test(value)) return value;
  if (type === 'shadow' && typeof value === 'string') {
    const layers = value.split(/,(?![^(]*\))/).map((s) => s.trim());
    const out = layers.map(shadowOut);
    if (out.some((o) => o === null)) return value;
    return out.length === 1 ? out[0] : out;
  }
  if (type === 'cubicBezier' && typeof value === 'string') {
    if (value in EASINGS) return EASINGS[value];
    const m = value.match(/^cubic-bezier\(\s*([^)]+)\)$/);
    if (m) return m[1].split(',').map((n) => Number(n.trim()));
  }
  return value;
};

/** What the plugin wrote → a value the build emits as it stands (CSS). */
export const fromDialect = (value, type) => {
  if (type === 'shadow' && value && typeof value === 'object') {
    const layers = Array.isArray(value) ? value : [value];
    return layers.map(shadowIn).join(', ');
  }
  if (type === 'cubicBezier' && Array.isArray(value)) {
    const named = Object.entries(EASINGS).find(
      ([, n]) => n.length === value.length && n.every((x, i) => x === value[i]),
    );
    return named ? named[0] : `cubic-bezier(${value.join(', ')})`;
  }
  return value;
};

/**
 * Whether a value in the plugin's dialect has the shape its type takes there — the string
 * says what is wrong, null says nothing is. A reference passes for any type; the types are
 * the ones the plugin reads in its DTCG mode, and a `spacing` or a `boxShadow` — the legacy
 * names — is a token the plugin would not show for what it is.
 */
export const TYPES = new Set([
  'color',
  'dimension',
  'duration',
  'number',
  'fontWeight',
  'cubicBezier',
  'shadow',
]);

export const dialectProblem = (type, value) => {
  if (!TYPES.has(type))
    return `\`${type}\` is not a type the plugin reads in its DTCG mode`;
  if (typeof value === 'string' && REF.test(value)) return null;
  const isLength = (v) =>
    typeof v === 'string' && (LENGTH.test(v) || FUNCTION.test(v));
  const shadow = (o) =>
    o && typeof o === 'object' && !Array.isArray(o)
      ? ['offsetX', 'offsetY', 'blur', 'spread'].find((k) => !isLength(o[k]))
        ? `\`${['offsetX', 'offsetY', 'blur', 'spread'].find((k) => !isLength(o[k]))}\` is not a length`
        : typeof o.color !== 'string' ||
            !(COLOR.test(o.color) || REF.test(o.color))
          ? '`color` is not a colour'
          : null
      : 'a shadow is an object with offsetX, offsetY, blur, spread and color';
  switch (type) {
    case 'color':
      return typeof value === 'string' && COLOR.test(value)
        ? null
        : 'not a colour';
    case 'dimension':
      return isLength(value) ? null : 'not a length with a unit';
    case 'duration':
      return typeof value === 'string' && DURATION.test(value)
        ? null
        : 'not a duration in ms or s';
    case 'number':
      return typeof value === 'number' ? null : 'not a number';
    case 'fontWeight':
      return typeof value === 'number' && value >= 1 && value <= 1000
        ? null
        : 'not a weight from 1 to 1000';
    case 'cubicBezier':
      return Array.isArray(value) &&
        value.length === 4 &&
        value.every((n) => typeof n === 'number')
        ? null
        : 'not four numbers';
    case 'shadow':
      return Array.isArray(value)
        ? (value.map(shadow).find(Boolean) ??
            (value.length ? null : 'no layer'))
        : shadow(value);
    default:
      return null;
  }
};

// ── the sets ──────────────────────────────────────────────────────────────────

/** A source file is a set unless it is a policy; the name is the file's stem. */
export const setFiles = (src = SRC) =>
  readdirSync(src)
    .filter((f) => f.endsWith('.json') && !f.endsWith('.policy.json'))
    .sort();

/** The order the build resolves in: the base, then every component, then the overrides. */
export const setOrder = (names) => {
  const rank = (n) =>
    n === 'primitive'
      ? 0
      : n === 'semantic.light'
        ? 1
        : n.startsWith('component.')
          ? 2
          : n === 'semantic.dark'
            ? 3
            : 4;
  return [...names].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
};

/**
 * The axes the sources declare, derived from what the sets DO rather than from a list of the
 * names to leave out of the base. A set file is named `stem` or `stem.qualifier`, and the
 * qualifier is exactly what makes `component.button` look like `semantic.dark` in a directory
 * listing. They are not alike, and the tokens say which is which: `component.button` declares
 * nineteen names no other set has (`pct.button.*`), while `semantic.dark` declares twenty-eight
 * and every one of them already stands in `semantic.light`. A set that only RE-POINTS names
 * another set has already declared adds no layer to the base — it is one OPTION of an axis, and
 * a designer has to switch it on to see it.
 *
 * So: a qualified set that re-points a name an earlier set declares is an option of the axis its
 * stem names — `semantic.dark` of `semantic`, `motion.reduced` of `motion`, `density.compact` of
 * `density`. `semantic.light` carries the same stem as `semantic.dark` and stays in the base,
 * because it declares its names instead of re-pointing them: that axis's other option IS the
 * base, which is the very reason the base cannot be written down as "everything except the sets
 * somebody remembered".
 *
 * "Re-points A name" rather than "re-points every name", deliberately. An axis set that one day
 * grew a token of its own would fall back into the base under the stricter reading, and fall
 * back SILENTLY, which is the one way this must not be wrong (`req-axis`). Read this way it
 * stays an option; and a base set that ever re-pointed something would be pulled OUT of the
 * base, where no theme enables it and point 4 of `tools/check-bridge.mjs` says so out loud.
 *
 * @param {Map<string, Set<string>>} tokens set name -> its token paths, IN RESOLUTION ORDER
 * @returns {Map<string, string[]>} axis stem -> its option sets, in that same order
 */
export const axesOf = (tokens) => {
  const axes = new Map();
  if (!(tokens instanceof Map)) return axes;
  const declared = new Set();
  for (const [name, paths] of tokens) {
    const own = paths instanceof Set ? paths : new Set();
    const repoints = [...own].some((path) => declared.has(path));
    for (const path of own) declared.add(path);
    const at = String(name).indexOf('.');
    if (at <= 0 || !repoints) continue;
    const stem = String(name).slice(0, at);
    axes.set(stem, [...(axes.get(stem) ?? []), name]);
  }
  return axes;
};

/**
 * The plugin's themes over the sets: a scheme axis, a motion axis and a density axis, every set
 * enabled somewhere. **The base is what the axes leave over** — not a list of names to leave
 * out. `density.compact` was added to the sources on 2026-09-11 and fell straight into that
 * list's blind spot, enabled in the light theme and the dark one at once, so a designer opening
 * Tokens Studio would have read the dense metrics as this library's defaults
 * ([`lesson-190`](../../docs/lessons.md#lesson-190)). A base derived from the sets' own shape
 * has no blind spot to fall into: the next axis is out of it the day its file lands.
 *
 * The words a designer reads stay written here, because they cannot be derived and should not
 * be invented: `density.compact.json` names the option `compact` and nowhere says that the
 * other option of that axis is called `comfortable`. A new axis therefore still owes this
 * function two lines — and it owes them LOUDLY, because until they are written no theme enables
 * its set and point 4 of `tools/check-bridge.mjs` refuses the export. What it no longer owes is
 * a correction to a list it cannot see.
 */
export const themesOf = (order, tokens) => {
  if (!Array.isArray(order) || !(tokens instanceof Map))
    throw new BridgeRefusal(
      "themesOf takes the set order and the sets' token paths — the base is DERIVED from " +
        'which sets only re-point names another set declares, and a caller passing names alone ' +
        'would get the old answer: a base that is correct until the next axis is added',
    );
  const enabled = (...names) =>
    Object.fromEntries(names.map((n) => [n, 'enabled']));
  const options = new Set([...axesOf(tokens).values()].flat());
  const base = order.filter((n) => !options.has(n));
  return [
    {
      id: 'pct.scheme.light',
      name: 'light',
      group: 'scheme',
      selectedTokenSets: enabled(...base),
    },
    {
      id: 'pct.scheme.dark',
      name: 'dark',
      group: 'scheme',
      selectedTokenSets: enabled(...base, 'semantic.dark'),
    },
    {
      id: 'pct.motion.full',
      name: 'full',
      group: 'motion',
      selectedTokenSets: {},
    },
    {
      id: 'pct.motion.reduced',
      name: 'reduced',
      group: 'motion',
      selectedTokenSets: enabled('motion.reduced'),
    },
    {
      id: 'pct.density.comfortable',
      name: 'comfortable',
      group: 'density',
      selectedTokenSets: {},
    },
    {
      id: 'pct.density.compact',
      name: 'compact',
      group: 'density',
      selectedTokenSets: enabled('density.compact'),
    },
  ];
};

/** One set in the plugin's dialect: the tokens' three keys translated, the notes left home. */
const exportTree = (tree, file, path = []) => {
  const out = new Map();
  for (const [k, v] of tree) {
    if (k.startsWith('$')) {
      if (k === '$comment' || k.startsWith('$comment-')) continue;
      if (!KEEP.has(k))
        throw new BridgeRefusal(
          `${file}: \`${[...path, k].join('.')}\` — a key the bridge does not know; it carries $type, $value and $description, and leaves $comment home`,
        );
      out.set(k, k === '$value' ? toDialect(v, tree.get('$type')) : v);
    } else out.set(k, exportTree(v, file, [...path, k]));
  }
  return out;
};

/** `Map<fileName, text>` — the plugin's multi-file layout, ready to be written or read. */
export const exportSets = (src = SRC) => {
  const files = setFiles(src);
  const names = files.map((f) => basename(f, '.json'));
  const order = setOrder(names);
  const out = new Map();
  // The token paths of each set, kept while the file is parsed anyway: `themesOf` derives the
  // base from them, because a set's NAME alone cannot say whether the dot in it separates an
  // axis from an option (`density.compact`) or a tier from a component (`component.button`).
  const paths = new Map();
  for (const file of files) {
    const tree = parseOrdered(readFileSync(join(src, file), 'utf8'));
    paths.set(
      basename(file, '.json'),
      new Set(tokensOf(tree).map(([path]) => path)),
    );
    out.set(file, stringifyOrdered(exportTree(tree, file)) + '\n');
  }
  out.set(
    '$metadata.json',
    JSON.stringify({ tokenSetOrder: order }, null, 2) + '\n',
  );
  out.set(
    '$themes.json',
    JSON.stringify(
      themesOf(order, new Map(order.map((name) => [name, paths.get(name)]))),
      null,
      2,
    ) + '\n',
  );
  return out;
};

/** Nested `Map`s → plain objects, so a value can be compared and translated by shape. */
export const plain = (v) =>
  v instanceof Map
    ? Object.fromEntries([...v].map(([k, x]) => [k, plain(x)]))
    : Array.isArray(v)
      ? v.map(plain)
      : v;

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * The plugin's files back onto the sources. Returns `Map<fileName, text>` of the sources as
 * they should read afterwards — the caller writes them, or compares them — and the list of
 * what changed. Throws `BridgeRefusal` for everything that is not a value or a description.
 */
export const importSets = (files, src = SRC) => {
  const sets = [...files.keys()].filter(
    (f) => f.endsWith('.json') && !f.startsWith('$'),
  );
  const known = new Set(setFiles(src));
  const out = new Map();
  const changed = [];
  for (const file of sets) {
    if (!known.has(file))
      throw new BridgeRefusal(
        `${file}: a set the sources do not have — a set is a file under libs/tokens/src, made here`,
      );
    const source = parseOrdered(readFileSync(join(src, file), 'utf8'));
    const incoming = parseOrdered(files.get(file));
    const ours = new Map(tokensOf(source));
    const theirs = new Map(tokensOf(incoming));
    for (const path of theirs.keys())
      if (!ours.has(path))
        throw new BridgeRefusal(
          `${file}: \`${path}\` is not a token of the sources — a name is a decision made here, in the same diff as the stylesheet that reads it (0020)`,
        );
    for (const path of ours.keys())
      if (!theirs.has(path))
        throw new BridgeRefusal(
          `${file}: \`${path}\` is a token of the sources and the export has lost it — a token leaves through a diff here, not through a plugin`,
        );
    for (const [path, token] of theirs) {
      const mine = ours.get(path);
      for (const k of token.keys())
        if (!KEEP.has(k))
          throw new BridgeRefusal(
            `${file}: \`${path}\` carries \`${k}\` — the bridge carries values and descriptions; a modifier lives in Figma, and the value it produces is what comes in`,
          );
      const type = mine.get('$type');
      if (token.get('$type') !== type)
        throw new BridgeRefusal(
          `${file}: \`${path}\` comes back as \`${token.get('$type')}\` and is \`${type}\` here — a type is a decision made here`,
        );
      const value = plain(token.get('$value'));
      if (!same(toDialect(mine.get('$value'), type), value)) {
        mine.set('$value', fromDialect(value, type));
        changed.push(`${file}: ${path} $value`);
      }
      if (
        token.has('$description') &&
        token.get('$description') !== mine.get('$description')
      ) {
        mine.set('$description', token.get('$description'));
        changed.push(`${file}: ${path} $description`);
      }
    }
    out.set(file, stringifyOrdered(source) + '\n');
  }
  return { files: out, changed };
};

// ── the command line ──────────────────────────────────────────────────────────

const readDir = (dir) =>
  new Map(
    readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => [f, readFileSync(join(dir, f), 'utf8')]),
  );

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [command, arg] = process.argv.slice(2);
  try {
    if (command === 'export') {
      const dir = arg ?? DIST;
      mkdirSync(dir, { recursive: true });
      const files = exportSets();
      for (const [name, text] of files) writeFileSync(join(dir, name), text);
      console.log(
        `✓ ${files.size - 2} sets, $themes.json and $metadata.json → ${dir}`,
      );
    } else if (command === 'import' && arg && existsSync(arg)) {
      const { files, changed } = importSets(readDir(arg));
      for (const [name, text] of files) writeFileSync(join(SRC, name), text);
      console.log(
        changed.length
          ? `✓ ${changed.length} change(s) written into libs/tokens/src — now \`nx run tokens:build\` and \`check-tokens\` judge them:\n  - ${changed.join('\n  - ')}`
          : '✓ nothing changed — the export is the mirror of the sources',
      );
    } else {
      console.error('usage: bridge.mjs export [<dir>] | import <dir>');
      process.exit(2);
    }
  } catch (error) {
    if (!(error instanceof BridgeRefusal)) throw error;
    console.error(`X refused — ${error.message}`);
    process.exit(1);
  }
}
