#!/usr/bin/env node
/**
 * Token gate: names, tiers, pairs — `req-token-names`, `req-token-tiers` and
 * `req-token-text-pairs` in one pass, because all three rest on THE SAME denominator. A token
 * the gate does not see is unguessable, outside the tiers and unmeasured at once.
 *
 *  1. SET: the names in `dist/pct.css` match an independent walk of the DTCG sources,
 *  2. SURFACE: `dist/tokens.ts` carries exactly the names it should,
 *  3. SCHEMA: every name parses against the dictionary; a component in it is an entrypoint,
 *  4. DICTIONARY: every declared word is used,
 *  5. SNAPSHOT: the versioned list of names matches the current one,
 *  6. TIERS: references point downwards — component → semantic → primitive → literal,
 *  7. PAIRS: every colour the library REALLY paints stands in the contrast policy,
 *  8. NAMES: every `--pct-…` a stylesheet touches is a token of the skin,
 *  9. PALETTE: every primitive is read by a token or by a stylesheet,
 * 10. LAYERS: every number of the stacking order is read from where it lives, and increases,
 * 11. DENSITY: the second axis declares the same names in both scopes, neither under the floor.
 *
 * The order is load-bearing: 5 before 6 and 7 so a snapshot fires on every changed name, 9
 * last because it reads what 7 and 8 measure, and 11 after all of them because it reads a
 * name's tier and a component name's property, which 3 and 6 have already had to accept.
 *
 * Usage: node tools/check-tokens.mjs [--write [<fixture>]]
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { freshInputsFor } from './fresh-inputs.mjs';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = 'libs/tokens';
const COMPONENTS = 'libs/components';
const SNAPSHOT = `${TOKENS}/tokens.snapshot.md`;
const NAMES_POLICY = `${TOKENS}/src/names.policy.json`;
const LEVELS_POLICY = `${TOKENS}/src/levels.policy.json`;
const CONTRAST_POLICY = `${TOKENS}/src/contrast.policy.json`;
const LAYERS_POLICY = `${TOKENS}/src/layers.policy.json`;
const FIXTURES = join(ROOT, 'tools/check-tokens.fixtures');
const REFERENCE = '_reference';

const WRITE = process.argv.includes('--write');

// The token inventory is read from what `libs/tokens` builds, so a write rebuilds it rather
// than trusting a cached one (**C29**).
freshInputsFor(WRITE, ['tokens:build']);
const WRITE_FIXTURE = (() => {
  const next = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && next && !next.startsWith('--') ? next : null;
})();

const cssVar = (path) => '--' + path.replace(/\./g, '-');
const list = (entries) => entries.map((w) => `      ${w}`).join('\n');

/**
 * The two scopes the density axis is emitted under (`req-token-density`), and the third
 * block point 11 measures them against. The selectors are spelt out here rather than derived
 * from the source file names: what a consumer writes in their markup is the SELECTOR, and a
 * gate that inferred it from `density.compact.json` would go on passing after the build
 * started emitting something else.
 */
const DENSITY_SCOPES = {
  comfortable: '[data-pct-density="comfortable"]',
  compact: '[data-pct-density="compact"]',
};

/** A density override lives in a `density.<name>.json` source, the way a theme lives in `semantic.dark.json`. */
const isDensityFile = (file) => /(^|\/)density\.[^/]+\.json$/.test(file);

/**
 * The skin's touch floor — WCAG 2.2 SC 2.5.8, 24 px ([`req-a11y-touch`]). Point 11 names the
 * path here in the open, for the same reason point 10 names `-z-index$` there: it is one
 * fact about this skin, and a reviewer has to be able to see which one the rule leans on.
 */
const FLOOR_TOKEN = 'pct.target.min';

/**
 * The property words that make a metric A CONTROL'S BOX rather than the air around it.
 *
 * They are read through the same dictionary points 3 and 4 police, so what puts a primitive
 * on point 11's list is a component token NAMED `…-height` or `…-size` reading it — and what
 * keeps a primitive off that list is being read only by a `…-padding-y` or a `…-gap`. That
 * distinction is the whole reason the rule can let the space scale shrink and still hold the
 * floor: nobody puts a finger on a margin. Measured on this repository, the list comes out
 * as `pct.control.height.{sm,md,lg}` and `pct.target.min` — the shared control axis
 * (`req-api-size`) and the floor itself, which three close buttons read as their size.
 */
const BOX_PROPERTIES = new Set(['height', 'size']);

/** The first `countOf` entries plus how many are left — a message has to stay readable. */
const shorten = (entries, countOf = 8) =>
  entries.length <= countOf
    ? entries
    : [...entries.slice(0, countOf), `… and ${entries.length - countOf} more`];

// ── the dictionary ───────────────────────────────────────────────────────────────────

/**
 * Matches of a word at the START of the text, longest first. The order matters for nested
 * words: `group-label-fg` has to see the part `group-label` and not `label` — the latter
 * does not start the text anyway — but `font-size-sm` has to see the property `font-size`
 * and not `font`, and there the order does decide.
 */
const prefixesOf = (words, text) =>
  words
    .filter((s) => text === s || text.startsWith(`${s}-`))
    .sort((a, b) => b.length - a.length);

/**
 * `[{part}-]{property}[-{variant}]`. A search with backtracking, because a greedy match
 * can take a word needed later: a name starting with a part that is also a prefix of a
 * property has two readings, and the one that closes completely is the one to take.
 */
const parseComponent = (rest, policy) => {
  const { parts, properties, states, sizes } = policy.component;
  const variants = new Set([...states, ...sizes.list]);

  for (const part of [null, ...prefixesOf(parts, rest)]) {
    const afterPart = part === null ? rest : rest.slice(part.length + 1);
    if (!afterPart) continue; // a part with no property is not a name
    for (const property of prefixesOf(properties, afterPart)) {
      const tail =
        afterPart === property ? '' : afterPart.slice(property.length + 1);
      if (tail === '') return { part, property, variant: null };
      if (variants.has(tail)) return { part, property, variant: tail };
    }
  }
  return null;
};

/** `[on-]{role}[-{variant}]`. */
const parseSemantic = (rest, policy) => {
  const { roles, variants } = policy.semantic;
  const pair = rest.startsWith('on-');
  const withoutPair = pair ? rest.slice(3) : rest;

  for (const role of prefixesOf(roles, withoutPair)) {
    const tail = withoutPair === role ? '' : withoutPair.slice(role.length + 1);
    if (tail === '') return { role, variant: null, pair };
    if (variants.includes(tail)) return { role, variant: tail, pair };
  }
  return null;
};

// ── checks ──────────────────────────────────────────────────────────────────

/**
 * A violation of one of the seven checks — with an identifier, not just a message. The
 * negative control has to verify that a prepared input fired ON ITS OWN point: an input
 * failing for a reason other than the one it declares proves something other than what it
 * declares.
 *
 * The third parameter — `rule` — is the answer to `lesson-50`. A gate's point is not one
 * sentence: point 6 carries nine rules, point 7 six. Comparing the point's identifier alone
 * lets through a case that fired on a NEIGHBOURING rule of the same point — proving
 * something other than what it declares while looking like proof. Measured: disarming five
 * of those rules moves their cases onto neighbouring rules of the same point, and without
 * this field all those runs would be green. A `fixture.json` may therefore add `rule`,
 * and then that has to match too. The field is optional: the cases of points 1–5, whose
 * rules were not split, have nothing to narrow down.
 */
class TokenError extends Error {
  constructor(check, description, rule = null) {
    super(description);
    this.check = check;
    this.rule = rule;
  }
}

/**
 * The full set of checks over a ready input. Throws `TokenError` on the first violation and
 * returns `{ description, snapshot }` — the rendered snapshot comes back even from a checking run,
 * because `--write` has to write exactly what the gate has just counted rather than count a
 * second time down another path.
 */
const checkTokens = (input) => {
  const {
    policy,
    levels,
    contrast,
    sources,
    sheets,
    css,
    ts,
    snapshot,
    entrypoints,
    layers,
    dependencies,
  } = input;

  // 1. SET — two independent reads of the same list.
  //
  //    Read A reads the TEXT of the generated CSS, that is, what the browser really gets.
  //    Read B walks the DTCG trees in the sources. The independence is the whole value:
  //    were the list to come from the sources alone, a generator losing a token would not
  //    change it by a jot; from the CSS alone, a source file the build does not load would
  //    be invisible.
  //
  //    Hence also the rule "DTCG is a file with a `pct` root" rather than a repetition of
  //    the generator's `component.*.json` pattern: a repeated pattern would stop being a
  //    second sentence about the same thing.
  const zCss = new Set(
    [...css.matchAll(/^\s*(--pct-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
  );
  const fromSources = new Map(); // cssVar -> { path, types, files, values }
  for (const { file, tree } of sources)
    for (const [path, type, value] of leaves(tree)) {
      const name = cssVar(path);
      const entry = fromSources.get(name) ?? {
        path,
        types: new Set(),
        files: [],
        values: [],
      };
      entry.types.add(type);
      entry.files.push(file);
      // Values are collected PER FILE, not one per token: `semantic.dark.json`
      // overrides `semantic.light.json`, and `motion.reduced.json` the primitives of the
      // axis. Point 6 has to look at each of them separately, because a dark theme may
      // point elsewhere than a light one — and that is precisely where a broken tier would
      // be least visible.
      entry.values.push({ file, value });
      fromSources.set(name, entry);
    }

  if (!zCss.size || !fromSources.size)
    throw new TokenError(
      'set',
      `an empty set of names (CSS: ${zCss.size}, DTCG sources: ${fromSources.size}) — ` +
        `every later point would then pass without pronouncing on anything.\n` +
        `    Usual cause: a stale or empty \`${TOKENS}/dist\` (the gate needs ` +
        `\`dependsOn: build\`), or a file list that stopped returning anything.`,
    );

  const missingFromCss = [...fromSources.keys()]
    .filter((n) => !zCss.has(n))
    .sort();
  const missingFromSources = [...zCss]
    .filter((n) => !fromSources.has(n))
    .sort();
  if (missingFromCss.length || missingFromSources.length)
    throw new TokenError(
      'set',
      `the two reads of the same list disagree:\n` +
        (missingFromCss.length
          ? `    in the DTCG sources, not in \`dist/pct.css\` (${missingFromCss.length}):\n` +
            list(shorten(missingFromCss)) +
            '\n'
          : '') +
        (missingFromSources.length
          ? `    in \`dist/pct.css\`, not in the DTCG sources (${missingFromSources.length}):\n` +
            list(shorten(missingFromSources)) +
            '\n'
          : '') +
        `    The first kind is a token the generator does not emit, or a stale \`dist\`; ` +
        `the second is a source file the generator does not load. Either way, this gate's ` +
        `list of names is not the package's list of names.`,
    );

  const ambiguous = [...fromSources]
    .filter(([, w]) => w.types.size > 1)
    .map(
      ([n, w]) =>
        `${n}: ${[...w.types].sort().join(' vs ')} (${w.files.join(', ')})`,
    );
  if (ambiguous.length)
    throw new TokenError(
      'set',
      `${ambiguous.length} tokens have more than one \`$type\` in the sources:\n` +
        list(ambiguous) +
        `\n    The type travels to the consumer in the snapshot and in \`tokens.ts\`; ` +
        `with two values there is nothing to write there.`,
    );

  // A tier comes from the SOURCE FILE, not from the shape of a name. The other way round
  // would infer the tier from the very thing this gate is meant to watch.
  const names = [...fromSources]
    .map(([name, w]) => ({
      name,
      path: w.path,
      type: [...w.types][0],
      values: w.values,
      ...layer(w.files),
    }))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

  const withoutTier = names.filter((n) => n.layer === null);
  if (withoutTier.length)
    throw new TokenError(
      'set',
      `${withoutTier.length} tokens cannot be assigned to a tier:\n` +
        list(shorten(withoutTier.map((n) => `${n.name} (${n.reason})`))) +
        `\n    A tier comes from the source file's name (\`primitive\`, \`semantic.*\`, ` +
        `\`component.<name>\`, \`motion.*\`). A file named otherwise carries tokens nobody ` +
        `knows the kind of — and point 3 asks about the schema PROPER TO A TIER.`,
    );

  // 2. SURFACE — what of that list the consumer sees.
  //
  //    `tokens.ts` carries everything outside the prefixes declared isPrivate. The prefixes
  //    are read from the policy and not from the generator, or the gate would only be
  //    confirming that the generator does what it does.
  const isPrivate = (path) =>
    policy.private.prefixes.some((p) => path.startsWith(p));

  const unusedPrefixes = policy.private.prefixes.filter(
    (p) => !names.some((n) => n.path.startsWith(p)),
  );
  if (unusedPrefixes.length)
    throw new TokenError(
      'surface',
      `${unusedPrefixes.length} isPrivate prefixes cover no token at all: ` +
        unusedPrefixes.map((p) => `\`${p}\``).join(', ') +
        `\n    A dead prefix is not harmless: in the policy it looks like a reach that ` +
        `does not exist, and at the next rename it will stop protecting what it was meant ` +
        `to protect — quietly.`,
    );

  const publicNames = new Set(
    names.filter((n) => !isPrivate(n.path)).map((n) => n.name),
  );
  compareSurfaces(
    'dist/tokens.ts (union PctCssVar)',
    new Set(
      [...ts.matchAll(/^\s*\|\s*'(--pct-[a-z0-9-]+)'/gm)].map((m) => m[1]),
    ),
    publicNames,
    'tokens outside the isPrivate prefixes',
  );
  compareSurfaces(
    'dist/tokens.ts (the pctTokens constant)',
    new Set(
      [...ts.matchAll(/^\s*'([a-z0-9.-]+)':/gm)].map((m) => cssVar(m[1])),
    ),
    publicNames,
    'tokens outside the isPrivate prefixes',
  );

  // 3. SCHEMA — can a name be guessed?
  const wrong = [];
  for (const n of names) {
    const segments = n.path.split('.');
    if (segments[0] !== 'pct') {
      wrong.push(`${n.name}: the path does not start with \`pct\``);
      continue;
    }

    if (n.layer === 'primitive') {
      const [, axis, ...step] = segments;
      if (!policy.primitive.axes.includes(axis))
        wrong.push(
          `${n.name}: the axis \`${axis}\` is not declared ` +
            `(${policy.primitive.axes.join(', ')})`,
        );
      else if (!step.length)
        wrong.push(
          `${n.name}: an axis with no step — an axis alone is not a token`,
        );
      continue;
    }

    if (n.layer === 'semantic') {
      if (segments.length !== 2)
        wrong.push(
          `${n.name}: the semantic tier is FLAT, and this path has ` +
            `${segments.length} segments`,
        );
      else if (!parseSemantic(segments[1], policy))
        wrong.push(
          `${n.name}: does not compose into \`[on-]{role}[-{variant}]\` from the dictionary`,
        );
      continue;
    }

    // component
    if (segments.length !== 3) {
      wrong.push(
        `${n.name}: a component token has the path \`pct.{component}.{rest}\`, and this ` +
          `one has ${segments.length} segments — the nesting disappears in the custom ` +
          `property's name and stops being visible`,
      );
      continue;
    }
    const [, component, rest] = segments;
    if (component !== n.component)
      wrong.push(
        `${n.name}: sits in \`component.${n.component}.json\` and is named after ` +
          `\`${component}\` — the file name and the token's prefix have to be one word`,
      );
    else if (!entrypoints.has(component))
      wrong.push(
        `${n.name}: \`${component}\` is not an entrypoint of the package ` +
          `(\`${COMPONENTS}/${component}/ng-package.json\` does not exist)`,
      );
    else if (!parseComponent(rest, policy))
      wrong.push(
        `${n.name}: \`${rest}\` does not compose into ` +
          `\`[{part}-]{property}[-{variant}]\` from the dictionary`,
      );
  }
  if (wrong.length)
    throw new TokenError(
      'schema',
      `${wrong.length} names outside the schema (req-token-names):\n` +
        list(shorten(wrong, 12)) +
        `\n    A name outside the dictionary breaks nothing today — it breaks the promise ` +
        `that a sibling name can be guessed without opening the documentation. If the word ` +
        `is genuinely new, add it to \`${NAMES_POLICY}\`: it is to be a line in the diff.`,
    );

  // 4. DICTIONARY — is every declared word used?
  //
  //    Point 3 closes on itself in a circle: a name outside the schema stops being one as
  //    soon as its word is added to the dictionary. A machine cannot settle that and this
  //    point does not pretend to — it watches a narrower thing: the dictionary is to be a
  //    record of words USED, not a dump where one more entry changes nothing because
  //    nobody looks there anyway.
  //
  //    A name that does NOT parse is skipped here rather than assumed impossible. In a
  //    normal run point 3 has already rejected it and this loop will not see it — but the
  //    negative control disarms the points one by one, and then it will. The first version
  //    read `p.part` directly, trusting the previous point: switching point 3 off turned
  //    the gate into a `TypeError`, and the negative control lost the ability to examine
  //    the point it was meant to examine. Exactly the defect `check-typecheck` had — a
  //    dependency between points is normal, writing it so that breaking it produces no
  //    sentence is not.
  const uses = new Map();
  const record = (category, word) => {
    if (word === null || word === undefined) return;
    uses.set(category, (uses.get(category) ?? new Set()).add(word));
  };
  for (const n of names) {
    const segments = n.path.split('.');
    if (n.layer === 'primitive') record('primitives.axes', segments[1]);
    else if (n.layer === 'semantic') {
      const p = parseSemantic(segments[1], policy);
      if (!p) continue;
      record('semantic.roles', p.role);
      record('semantic.variants', p.variant);
    } else {
      const p = segments.length === 3 && parseComponent(segments[2], policy);
      if (!p) continue;
      record('component.parts', p.part);
      record('component.properties', p.property);
      if (p.variant !== null)
        record(
          policy.component.states.includes(p.variant)
            ? 'component.states'
            : 'component.sizes',
          p.variant,
        );
    }
  }
  const declared = {
    'primitives.axes': policy.primitive.axes,
    'semantic.roles': policy.semantic.roles,
    'semantic.variants': policy.semantic.variants,
    'component.parts': policy.component.parts,
    'component.properties': policy.component.properties,
    'component.states': policy.component.states,
    'component.sizes': policy.component.sizes.list,
  };
  const dead = Object.entries(declared).flatMap(([category, words]) =>
    words
      .filter((s) => !(uses.get(category)?.has(s) ?? false))
      .map((s) => `${category}: \`${s}\``),
  );
  if (dead.length)
    throw new TokenError(
      'dictionary',
      `${dead.length} declared words are used by no token:\n` +
        list(shorten(dead, 12)) +
        `\n    An unused word is either a reserve for the future — and then the future ` +
        `will add it itself, visibly — or the trace of a token that is gone. Either way it ` +
        `widens the set of names point 3 lets through without widening the set of names ` +
        `anybody has seen.`,
    );

  // 5. SNAPSHOT — the versioned list a change is measured against. The rendered snapshot
  // travels ON THE ERROR rather than being computed a second time by `--write`. A second
  // path computing the same thing is a second sentence about it — and two such sentences
  // drift apart exactly when nobody is looking.
  const content = renderSnapshot(names, isPrivate);
  const divergence = (description) =>
    Object.assign(new TokenError('snapshot', description), {
      snapshot: content,
    });

  if (snapshot === null)
    throw divergence(
      `no \`${SNAPSHOT}\` — run \`node tools/check-tokens.mjs --write\`.\n` +
        `    Without a snapshot this gate measures the schema but not CHANGE: renaming a ` +
        `token to another valid name then passes without a trace and breaks the ` +
        `consumer's skin.`,
    );
  if (snapshot !== content) {
    const old = snapshotRows(snapshot);
    const fresh = snapshotRows(content);
    const removed = [...old].filter((w) => !fresh.has(w));
    const added = [...fresh].filter((w) => !old.has(w));
    throw divergence(
      `the snapshot of token names has drifted from the generated ones:\n` +
        (removed.length
          ? `    gone from the skin (${removed.length}):\n` +
            list(shorten(removed)) +
            '\n'
          : '') +
        (added.length
          ? `    added to the skin (${added.length}):\n` +
            list(shorten(added)) +
            '\n'
          : '') +
        (!removed.length && !added.length
          ? `    the list of names is the same — the heading or the row order drifted.\n`
          : '') +
        `    A token's name is the theme's public API: a token that has gone takes the ` +
        `consumer's override with it and gives not one red test. If the change is ` +
        `deliberate — \`node tools/check-tokens.mjs --write\`.`,
    );
  }

  // 6. TIERS — the reference graph points downwards (req-token-tiers).
  //
  //    The promise is not order for order's sake but the theme author's LEVER: the
  //    semantic tier is the only one they have to know, so a component token reaching
  //    below it takes their control away quietly — the skin still builds, the tests are
  //    still green, and overriding `--pct-primary` simply does not work on one button.
  //
  //    Colour has NOT ONE exception here: above it the semantic tier exists and is
  //    complete. The exception concerns the dimension axes, above which there is no
  //    semantics, and it is narrowed from both sides at once (see `levels.policy.json`):
  //    an axis has to be declared, has to be used and must carry no colour token. The last
  //    of these matters most — without it, adding `blue` to the list would disarm the very
  //    rule the point exists for, and look like a single word in the diff.
  const tierViolations = [];
  const byPath = new Map(names.map((n) => [n.path, n]));
  const primitiveAxis = (path) => path.split('.')[1];

  const sharedAxes = levels['shared-axes'].axes;
  const colouredAxes = sharedAxes.filter((axis) =>
    names.some(
      (n) =>
        n.layer === 'primitive' &&
        n.type === 'color' &&
        primitiveAxis(n.path) === axis,
    ),
  );
  if (colouredAxes.length)
    throw new TokenError(
      'levels',
      `${colouredAxes.length} axes declared as shared carry colour tokens: ` +
        colouredAxes.map((o) => `\`${o}\``).join(', ') +
        `\n    The exception for shared axes exists because there is no semantic tier ` +
        `above a dimension. Above colour there is one, and it is mandatory. A colour axis ` +
        `on this list does not widen the exception — it deletes the rule point 6 exists for.`,
      'axis-coloured',
    );

  const usedAxes = new Set();
  for (const n of names)
    if (n.layer === 'component')
      for (const { value } of n.values) {
        const pointsAt = referenceOf(value);
        const target = pointsAt === null ? null : byPath.get(pointsAt);
        if (target?.layer === 'primitive')
          usedAxes.add(primitiveAxis(pointsAt));
      }
  const deadAxes = sharedAxes.filter((axis) => !usedAxes.has(axis));
  if (deadAxes.length)
    throw new TokenError(
      'levels',
      `${deadAxes.length} axes declared as shared are used by no component token: ` +
        deadAxes.map((o) => `\`${o}\``).join(', ') +
        `\n    The same construction as a dead word in the name dictionary (point 4): an ` +
        `unused axis widens the set of references point 6 lets through without widening the ` +
        `set of references anybody wrote. An axis absent from the sources altogether looks ` +
        `the same — and fires here the same way.`,
      'axis-dead',
    );

  for (const n of names)
    for (const { file, value } of n.values) {
      const where = `${n.name} (${file.split('/').pop()})`;
      const pointsAt = referenceOf(value);

      if (pointsAt === null) {
        // A literal. For a dimension that is fine — the component token IS the lever
        // then (`--pct-checkbox-size: 18px` is overridden directly). For a colour it is
        // not: a colour typed in bypasses the ramp and the semantic tier at once, so
        // nothing but the token itself can re-theme it.
        if (n.type === 'color' && n.layer !== 'primitive')
          tierViolations.push({
            rule: 'colour-literal',
            description:
              `${where}: a colour written inline (${JSON.stringify(value)}) ` +
              `in the \`${n.layer}\` tier — it bypasses the ramp and the semantics at once`,
          });
        continue;
      }

      const target = byPath.get(pointsAt);
      if (!target) {
        // Unreachable with a green build (the generator throws "Unknown reference"), but
        // reading `target.layer` directly would give a `TypeError` here instead of a
        // sentence — the defect this repository has caught four times already, each time in a
        // gate written in awareness of the previous one.
        tierViolations.push({
          rule: 'reference-to-nowhere',
          description: `${where}: points at a token that does not exist, \`${pointsAt}\``,
        });
        continue;
      }

      if (n.layer === 'primitive') {
        tierViolations.push({
          rule: 'primitive-not-literal',
          description:
            `${where}: the primitive tier is the FLOOR and has to be a literal, ` +
            `and this token points at \`${pointsAt}\` (${target.layer})`,
        });
        continue;
      }

      if (n.layer === 'semantic') {
        // A semantic alias (`surface-disabled` -> `surface-100`) is fine: both sides
        // belong to the tier a theme author knows in full anyway.
        if (target.layer === 'component')
          tierViolations.push({
            rule: 'upward-reference',
            description:
              `${where}: the semantic tier points UPWARDS, at the component token ` +
              `\`${pointsAt}\` — overriding one component's token then re-themes the whole skin`,
          });
        continue;
      }

      // component
      if (target.layer === 'component') {
        tierViolations.push({
          rule: 'sideways-reference',
          description:
            `${where}: points at ANOTHER component's token \`${pointsAt}\` — overriding one ` +
            `component would then change the other (req-token-override promises exactly ` +
            `the opposite)`,
        });
        continue;
      }
      if (target.layer !== 'primitive') continue; // semantic — as it should be

      if (n.type === 'color')
        tierViolations.push({
          rule: 'colour-under-semantics',
          description:
            `${where}: a component colour points straight at the primitive \`${pointsAt}\` — ` +
            `the semantic tier above colour exists and has no exception`,
        });
      else if (!sharedAxes.includes(primitiveAxis(pointsAt)))
        tierViolations.push({
          rule: 'axis-undeclared',
          description:
            `${where}: points at a primitive of the axis \`${primitiveAxis(pointsAt)}\`, which ` +
            `\`${LEVELS_POLICY}\` does not declare as shared (today: ${sharedAxes.join(', ')})`,
        });
    }
  if (tierViolations.length)
    throw new TokenError(
      'levels',
      `${tierViolations.length} references outside the tier model (req-token-tiers):\n` +
        list(
          shorten(
            tierViolations.map((z) => `[${z.rule}] ${z.description}`),
            12,
          ),
        ) +
        `\n    The model has three floors and one direction: component → semantic → ` +
        `primitive → literal. Breaking it breaks nothing in this repository — it breaks a ` +
        `theme built from outside, and quietly, because the skin still builds.`,
      // The error's rule is the rule of the FIRST violation — with one defect (that is,
      // in every fixture) it is the only violation, and with many one has to start
      // somewhere anyway.
      tierViolations[0].rule,
    );

  // 7. PAIRS — every colour the library PAINTS is measured (req-token-text-pairs).
  //
  //    The denominator is not the list of names ending in `-bg` and `-fg` but what the
  //    stylesheets really paint. The difference is measurable, not theoretical: a button in
  //    the outline variant paints its background with `var(--pct-surface-100)` and its
  //    label with `var(--pct-primary)` — two SEMANTIC tokens no rule based on component
  //    token names would see. Both once stood outside the policy, and that is exactly
  //    the shape of `lesson-33`: a contrast gate examines only what somebody wrote into it.
  //
  //    The `on-*` rule works the other way round: it reads NAMES, because a pair declared
  //    and never painted leaves no trace in a stylesheet. Two reads, two different
  //    blindnesses.
  // `byName` stands before the reading and not inside it: a composite value's `var()` takes
  // a role from the skin's `$type` rather than from the property carrying it.
  const byName = new Map(names.map((n) => [n.name, n]));
  const { painted, assignments } = paintedColours(sheets, byName);

  // Point 7's denominator is measured on the RESULT, not on the input. The first version
  // asked only about the number of stylesheets — and passed green, printing "0 colours
  // painted in 7 stylesheets": the declaration pattern required a leading dash, so it saw
  // custom properties alone and not `background:`. That is `lesson-48` inside a point
  // written so as not to repeat it, and the same mistake once more: the non-emptiness check
  // stood on the INPUT's side while the MEASUREMENT was empty. Zero pairs to check is
  // always zero violations.
  if (!sheets.length || !painted.size || !contrast.checks?.length)
    throw new TokenError(
      'pairs',
      `an empty denominator for point 7 (sheets: ${sheets.length}, ` +
        `colours painted: ${painted.size}, ` +
        `policy entries: ${contrast.checks?.length ?? 0}) — without any of these three ` +
        `this point passes without pronouncing on anything.\n` +
        `    Usual causes: a list of stylesheets that stopped returning anything ` +
        `(lesson-48 — a git pathspec is not a shell glob), or a declaration scanner that ` +
        `stopped recognising them.`,
      'denominator',
    );

  const wPolicy = new Set(
    contrast.checks.flatMap((c) => [cssVar(c.fg), cssVar(c.bg)]),
  );

  const pairViolations = [];
  for (const [token, role] of [...painted].sort()) {
    const n = byName.get(token);
    const role_ = [...role].sort().join(', ');
    // Each of the three rules reads its OWN precondition (`!n`, `n?.type`) instead of
    // trusting the previous one. The dependency between them is natural — a token outside
    // the skin has no type — but written with a bare `continue` it turned disarming the
    // first rule into a `TypeError` instead of a message, and the negative control lost
    // the ability to examine the other two. The same defect four times over; the
    // fifth time, and the second time INSIDE one point.
    if (!n)
      pairViolations.push({
        rule: 'token-outside-theme',
        description:
          `${token}: painted (${role_}) and absent from the skin's tokens — ` +
          `there is nothing to measure`,
      });
    if (n && n.type !== 'color')
      pairViolations.push({
        rule: 'not-a-colour',
        description: `${token}: painted as a colour (${role_}), and in DTCG carries \`$type: ${n.type}\``,
      });
    if (n && n.type === 'color' && !wPolicy.has(token))
      pairViolations.push({
        rule: 'unmeasured',
        description: `${token}: painted (${role_}) and stands in no pair of the policy`,
      });
  }
  if (pairViolations.length)
    throw new TokenError(
      'pairs',
      `${pairViolations.length} colours are painted with no entry in \`${CONTRAST_POLICY}\`:\n` +
        list(
          shorten(
            pairViolations.map((z) => `[${z.rule}] ${z.description}`),
            12,
          ),
        ) +
        `\n    A pair with no entry is not counted, so a colour outside the policy is a ` +
        `colour the contrast gate HAS NO OPINION about — and that looks exactly like a ` +
        `green run (lesson-33). Choosing the partner stays a human decision: the machine ` +
        `sees that a colour is unmeasured, it does not see what it lies on.` +
        (assignments
          ? `\n    Note: a stylesheet can also bring a token in by assigning to another ` +
            `custom property — those are expanded, so \`--pct-x: var(--pct-y)\` gives ` +
            `\`y\` the role of \`x\`.`
          : ''),
      pairViolations[0].rule,
    );

  // The `on-*` rule reads NAMES rather than stylesheets — and that is its whole value: a
  // pair declared and never painted leaves no trace in a stylesheet, so the previous
  // rule's measurement is blind to it by construction.
  const withoutSurface = [];
  const dead_ = [];
  const referenced = new Set(
    names.flatMap((n) => n.values.map(({ value }) => referenceOf(value))),
  );
  for (const n of names) {
    if (n.layer !== 'semantic') continue;
    if (!n.path.startsWith('pct.on-')) continue;
    const role = n.path.slice('pct.on-'.length);
    if (!byPath.has(`pct.${role}`))
      withoutSurface.push(
        `${n.name}: a pair for a \`--pct-${role}\` that does not exist — the \`on-\` ` +
          `prefix promises text FOR a surface, and that surface is not there`,
      );
    else if (!referenced.has(n.path) && !painted.has(n.name))
      dead_.push(
        `${n.name}: used by no token and no stylesheet — a declared pair with no ` +
          `surface for anything to stand on`,
      );
  }
  const pairError = (entries, rule, tail) =>
    new TokenError(
      'pairs',
      `${entries.length} \`on-*\` pairs do not hold their side of the contract:\n` +
        list(shorten(entries)) +
        `\n    The \`on-\` prefix is no ornament: it is the only place where the skin ` +
        `declares a text/background pair outright. ${tail}`,
      rule,
    );
  if (withoutSurface.length)
    throw pairError(
      withoutSurface,
      'on-without-surface',
      `Text for a surface that does not exist is a name promising a pair where not even ` +
        `one side is there.`,
    );
  if (dead_.length)
    throw pairError(
      dead_,
      'on-dead',
      `A dead pair looks like coverage and is not — exactly like a dead word in the ` +
        `dictionary (point 4).`,
    );

  // 8. NAMES — a custom property that looks like a token and is not.
  //
  //    Point 7 sees a misspelt name only where a COLOUR is painted: `min-height:
  //    var(--pct-button-heigth)` passes it and the declaration then simply does nothing,
  //    because CSS has no undefined variable to report ([`lesson-69`](../docs/lessons.md)).
  //    A declaration of such a name is the same defect from the other side: an override
  //    that reaches nothing.
  const touched = touchedTokens(sheets);
  const strangers = [];
  for (const [token, { kind, file }] of touched) {
    if (byName.has(token)) continue;
    strangers.push({
      rule: kind === 'read' ? 'read-unknown' : 'declared-unknown',
      description: `${token}: ${kind} in \`${file}\` and absent from the skin`,
    });
  }
  if (strangers.length)
    throw new TokenError(
      'names',
      `${strangers.length} custom properties look like tokens and are not:\n` +
        list(
          shorten(
            strangers.map((z) => `[${z.rule}] ${z.description}`),
            12,
          ),
        ) +
        `\n    The prefix is the promise: \`--pct-…\` says "this is the library's token", ` +
        `and a browser reading one that stands nowhere paints nothing and reports nothing.`,
      strangers[0].rule,
    );

  // 9. PALETTE — every primitive is read by somebody (req-token-tiers).
  //
  //    The tier model says which way a reference may point and says nothing about a floor
  //    tile nobody stands on. A primitive nothing reads still ships in `pct.css` to every
  //    consumer, stands in no type (the ramps are private —
  //    `docs/decisions/0019-primitives-are-not-the-contract.md`) and answers no override:
  //    the same construction as a dead word in the dictionary (point 4), a dead private
  //    prefix (point 2) and a dead `on-` pair (point 7), one tier lower.
  //
  //    A rule and not an exception for the palette, because the palette here is not a
  //    designer's full ramp: the steps are already gapped — blue has no 100 and no 900,
  //    slate no 300, 400 or 600, red no 500 — so a step stands here because something asked
  //    for it (`docs/decisions/0020-the-palette-carries-no-spares.md`).
  //
  //    A primitive has TWO kinds of reader and the rule needs both. The three `motion`
  //    primitives are referenced by NO token — motion has neither a semantic tier nor a
  //    component token above it, the stylesheets read the axis directly — so a rule reading
  //    references alone would have called the live half of an axis dead (lesson-74). A
  //    declaration counts as a touch just as a read does: `touched` records both, and a
  //    component stylesheet declaring a primitive is a different defect from this one.
  //
  //    What CANNOT keep a step alive is another primitive: the tier's floor has to be a
  //    literal, and point 6 rejects a primitive holding a reference before this point counts
  //    it as a reader — so two dead steps cannot hold each other up.
  const primitives = names.filter((n) => n.layer === 'primitive');
  const orphans = primitives.filter(
    (n) => !referenced.has(n.path) && !touched.has(n.name),
  );
  if (orphans.length)
    throw new TokenError(
      'palette',
      `${orphans.length} primitives are read by no token and no stylesheet:\n` +
        list(shorten(orphans.map((n) => `${n.name} (${n.type})`))) +
        `\n    A step nobody reads is not a reserve for the future — it is a name the ` +
        `skin declares, a consumer downloads and nothing answers. A step a design really ` +
        `needs arrives WITH the first token or stylesheet that reads it: one line in a ` +
        `diff, instead of a palette that grows where nobody looks.`,
      'primitive-dead',
    );

  // 10. LAYERS — the stacking order (`req-token-layers`). Three numbers stood in three files
  //     with no rule between them: a toast at 1100 "above the CDK overlay container", a
  //     drawer at 900 "below" it, and the container's own number — the dependency's — in
  //     neither file, no policy and no gate, so the fourth component to need a layer would
  //     pick its number by opening two token files and inferring the middle (plan 4.21).
  //     The order is a LIST in `layers.policy.json`; every number in it is read from where
  //     it lives — a token from the sources, the dependency's from the stylesheet the
  //     applications load, on every run, because a fact about a dependency stops holding at
  //     a bump and not at a change here (lesson-122) — and a `z-index` token the list does
  //     not place fires, so a new layer is a line here and not a guess.
  const placed = new Map();
  for (const name of layers.order ?? []) {
    const spec = layers.layers?.[name];
    if (spec === undefined)
      throw new TokenError(
        'layers',
        `the order in ${LAYERS_POLICY} names the layer \`${name}\`, and the policy ` +
          `defines no such layer — an order over a name with no number holds nothing`,
        'layer-undefined',
      );
    let value;
    if (typeof spec.value === 'number') value = spec.value;
    else if (typeof spec.token === 'string') {
      const entry = fromSources.get(cssVar(spec.token));
      const literal = entry?.values
        .map((v) => v.value)
        .find((v) => typeof v === 'number');
      if (literal === undefined)
        throw new TokenError(
          'layers',
          `layer \`${name}\` is the token \`${spec.token}\`, and the sources carry no ` +
            `number under that name — a layer whose number cannot be read is a layer the ` +
            `order does not hold`,
          'layer-unread',
        );
      value = literal;
    } else if (typeof spec.file === 'string') {
      const text = dependencies[spec.file];
      const found = text === null ? null : zIndexOf(text, spec.selector);
      if (found === null)
        throw new TokenError(
          'layers',
          `layer \`${name}\` is \`${spec.selector}\` in \`${spec.file}\` (${spec.dependency}), ` +
            `and ${text === null ? 'the file is not there' : 'no rule for that selector carries a z-index'} — ` +
            `the dependency's number is read on every run so that a bump moves this order ` +
            `rather than a comment, and today it cannot be read at all`,
          'layer-unread',
        );
      value = found;
    } else
      throw new TokenError(
        'layers',
        `layer \`${name}\` names neither a value, a token nor a dependency's file`,
        'layer-undefined',
      );
    placed.set(name, value);
  }
  for (const name of Object.keys(layers.layers ?? {}))
    if (!placed.has(name))
      throw new TokenError(
        'layers',
        `the policy defines the layer \`${name}\` and the order does not place it`,
        'layer-undefined',
      );
  const inOrder = [...placed.keys()].map(
    (name) => `${name} ${placed.get(name)}`,
  );
  const zIndexTokens = names
    .map((n) => n.name)
    .filter((name) => /-z-index$/.test(name));
  const orderedTokens = new Set(
    Object.values(layers.layers ?? {})
      .filter((spec) => typeof spec.token === 'string')
      .map((spec) => cssVar(spec.token)),
  );
  const outside = zIndexTokens.filter((name) => !orderedTokens.has(name));
  if (outside.length)
    throw new TokenError(
      'layers',
      `${outside.length} z-index token(s) stand in no layer of ${LAYERS_POLICY}:\n` +
        `${list(outside)}\n    A stacking number outside the order is the number picked by ` +
        `opening two token files and inferring the middle — say where it stands instead`,
      'z-index-outside-the-order',
    );
  for (let i = 1; i < layers.order.length; i++) {
    const below = layers.order[i - 1];
    const above = layers.order[i];
    if (!(placed.get(above) > placed.get(below)))
      throw new TokenError(
        'layers',
        `the order says \`${below}\` < \`${above}\` and the numbers say ` +
          `${placed.get(below)} and ${placed.get(above)}:\n${list(inOrder)}\n` +
          `    The order is the promise and the numbers are read from where they live — ` +
          `one of them moved, in a token or in the dependency`,
        'order-broken',
      );
  }

  // 11. DENSITY — the second axis (`req-token-density`). Two scopes, one set of names, and a
  //     floor neither of them may cross.
  //
  //     The axis is built like the theme and not like the size input: `data-pct-density` on
  //     a subtree re-points metric tokens the components ALREADY read, so switching density
  //     costs no component a line (0074). That construction has two ways of going wrong
  //     quietly, and this point is those two — behind a denominator rule, because an axis
  //     that stopped being emitted agrees with both of them by having nothing left to
  //     disagree about.
  //
  //     The first is asymmetry. `[data-pct-density="comfortable"]` exists for the same
  //     reason `[data-theme="light"]` does — a roomy island inside a dense page needs
  //     counter-overrides — so a name declared in one scope and not the other is a metric
  //     that can be switched one way and not back. Nothing turns red: the token keeps the
  //     value it inherited, the page merely stays dense where it was asked to stop being.
  //
  //     The second is the floor. Density crosses the touch threshold SOONER than the size
  //     axis does — that is the requirement's own warning — and a compact scale is exactly
  //     the kind of change somebody tunes by eye until it looks right. So: the floor itself
  //     may not be re-pointed downwards, and no primitive the skin reads as a control's box
  //     may come out under it. What the two rules cannot do is see a LAYOUT, which is why
  //     the requirement's control is a browser measurement
  //     (`apps/sandbox-e2e/src/density.spec.ts`) and this point is the shape of the mistake
  //     rather than the whole of it.
  const densityFiles = sources.map((s) => s.file).filter(isDensityFile);
  const densityFileSet = new Set(densityFiles);

  /** A token's value in one density: the override where there is one, the base otherwise. */
  const valueIn = (token, dense) => {
    let base;
    let override;
    for (const { file, value } of token.values)
      if (densityFileSet.has(file)) override = value;
      else base = value;
    return dense ? (override ?? base) : base;
  };

  /**
   * A token resolved down to a number of pixels in one density, or `null` when the chain
   * ends anywhere else — a `rem`, a `clamp()`, a missing base. `null` is not "fine": the
   * denominator rule below refuses to rule on a metric it cannot read.
   */
  const pixelsIn = (path, dense, seen = new Set()) => {
    if (seen.has(path)) return null;
    seen.add(path);
    const token = byPath.get(path);
    if (token === undefined) return null;
    const value = valueIn(token, dense);
    if (typeof value !== 'string') return null;
    const pointsAt = referenceOf(value);
    if (pointsAt !== null) return pixelsIn(pointsAt, dense, seen);
    const px = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
    return px === null ? null : Number(px[1]);
  };

  // Which primitives the skin reads as a control's box — derived from the name dictionary,
  // not typed in. See `BOX_PROPERTIES`.
  const boxes = new Map();
  for (const n of names) {
    if (n.layer !== 'component') continue;
    const segments = n.path.split('.');
    const parsed =
      segments.length === 3 ? parseComponent(segments[2], policy) : null;
    if (!parsed || !BOX_PROPERTIES.has(parsed.property)) continue;
    for (const { value } of n.values) {
      const pointsAt = referenceOf(value);
      if (pointsAt === null) continue;
      if (byPath.get(pointsAt)?.layer !== 'primitive') continue;
      boxes.set(pointsAt, [...(boxes.get(pointsAt) ?? []), n.name]);
    }
  }

  const comfortableNames = declarationsUnder(css, DENSITY_SCOPES.comfortable);
  const compactNames = declarationsUnder(css, DENSITY_SCOPES.compact);
  const rootNames = declarationsUnder(css, ':root');
  const floorPx = pixelsIn(FLOOR_TOKEN, false);
  const unreadable = [...boxes.keys()]
    .filter(
      (path) => pixelsIn(path, false) === null || pixelsIn(path, true) === null,
    )
    .sort();

  if (
    !densityFiles.length ||
    comfortableNames === null ||
    compactNames === null ||
    rootNames === null ||
    !compactNames.size ||
    !boxes.size ||
    floorPx === null ||
    unreadable.length
  )
    throw new TokenError(
      'density',
      `an empty or unreadable denominator for point 11 (density sources: ` +
        `${densityFiles.length}, names under \`${DENSITY_SCOPES.comfortable}\`: ` +
        `${comfortableNames?.size ?? 'no such block'}, under ` +
        `\`${DENSITY_SCOPES.compact}\`: ${compactNames?.size ?? 'no such block'}, ` +
        `boxes the skin reads: ${boxes.size}, the floor \`${FLOOR_TOKEN}\`: ` +
        `${floorPx === null ? 'not a pixel literal' : `${floorPx}px`}` +
        (unreadable.length
          ? `, unreadable boxes: ${unreadable.join(', ')}`
          : '') +
        `) — with any of these missing the point passes without pronouncing on anything.\n` +
        `    The density axis is not optional furniture: it is a promise the skin makes to ` +
        `a consumer's markup (\`req-token-density\`), and an axis that quietly stopped ` +
        `being emitted looks exactly like one that was never asked for.`,
      'density-denominator',
    );

  const onlyCompact = [...compactNames]
    .filter((name) => !comfortableNames.has(name))
    .sort();
  const onlyComfortable = [...comfortableNames]
    .filter((name) => !compactNames.has(name))
    .sort();
  const outsideRoot = [...compactNames]
    .filter((name) => !rootNames.has(name))
    .sort();
  if (onlyCompact.length || onlyComfortable.length || outsideRoot.length)
    throw new TokenError(
      'density',
      `the density scopes do not declare the same names:\n` +
        (onlyCompact.length
          ? `    only under \`${DENSITY_SCOPES.compact}\` (${onlyCompact.length}):\n` +
            list(shorten(onlyCompact)) +
            '\n'
          : '') +
        (onlyComfortable.length
          ? `    only under \`${DENSITY_SCOPES.comfortable}\` (${onlyComfortable.length}):\n` +
            list(shorten(onlyComfortable)) +
            '\n'
          : '') +
        (outsideRoot.length
          ? `    declared by a density scope and not by \`:root\` (${outsideRoot.length}):\n` +
            list(shorten(outsideRoot)) +
            '\n'
          : '') +
        `    A metric one scope re-points and the other does not can be switched one way ` +
        `and not back: a roomy panel inside a dense page inherits the dense value with ` +
        `nothing to undo it, and nothing anywhere turns red. That is the same construction ` +
        `\`[data-theme="light"]\` exists for, one axis over.`,
      'density-unpaired',
    );

  const floorDense = pixelsIn(FLOOR_TOKEN, true);
  if (floorDense === null || floorDense < floorPx)
    throw new TokenError(
      'density',
      `the touch floor \`${cssVar(FLOOR_TOKEN)}\` is ` +
        `${floorDense === null ? 'no longer a pixel literal' : `${floorDense}px`} under ` +
        `\`${DENSITY_SCOPES.compact}\` and ${floorPx}px under \`:root\`.\n` +
        `    Density may shrink everything except the line it is shrinking towards. ` +
        `Lowering the floor makes every OTHER rule about it pass by construction — ` +
        `including the one below and including the browser measurement — which is why it ` +
        `is a sentence of its own rather than a number in a table (\`req-a11y-touch\`).`,
      'density-floor-lowered',
    );

  const underFloor = [...boxes.keys()]
    .sort()
    .filter((path) => pixelsIn(path, true) < floorPx)
    .map(
      (path) =>
        `${cssVar(path)}: ${pixelsIn(path, true)}px under compact, ` +
        `${pixelsIn(path, false)}px under :root (read as a box by ` +
        `${shorten(boxes.get(path), 3).join(', ')})`,
    );
  if (underFloor.length)
    throw new TokenError(
      'density',
      `${underFloor.length} metric(s) the skin reads as a control's box fall below the ` +
        `${floorPx}px touch floor under \`${DENSITY_SCOPES.compact}\`:\n` +
        list(underFloor) +
        `\n    This is the corner \`req-token-density\` was written around: density crosses ` +
        `the threshold SOONER than the size axis does, so \`compact\` at size \`sm\` is the ` +
        `smallest anything here gets. A control that cannot hold 24px there is a control ` +
        `the compact scope may not have, not a number to round up until the test goes green.`,
      'density-below-floor',
    );

  const publicCount = publicNames.size;
  return {
    description:
      `${names.length} tokens (${publicCount} public, ` +
      `${names.length - publicCount} private), ` +
      `${primitives.length} primitives each with a reader, ` +
      `${entrypoints.size} entrypoints, ` +
      `${painted.size} colours painted and ${touched.size} names touched across ` +
      `${sheets.length} stylesheets, ` +
      `${contrast.checks.length} pairs in the policy, ` +
      `${placed.size} layers in order (${inOrder.join(' < ')}), ` +
      `${compactNames.size} names on the density axis with ${boxes.size} boxes ` +
      `above the ${floorPx}px floor`,
    snapshot: content,
  };
};

/**
 * The custom properties a TOP-LEVEL block declares, or `null` when the stylesheet has no
 * such block. Anchored to the start of a line, which is what keeps it out of the `@media`
 * blocks: the generator indents those by two spaces, so `:root` here is the page's `:root`
 * and never the one under `prefers-reduced-motion`.
 *
 * A textual read, like point 10's, and for the same reason — this is the generator's own
 * output, one selector to one block, and a parser would be a second sentence about a format
 * this file already knows.
 */
const declarationsUnder = (cssText, selector) => {
  const head = `\n${selector} {\n`;
  const start = cssText.indexOf(head);
  if (start === -1) return null;
  const from = start + head.length;
  const end = cssText.indexOf('\n}', from);
  if (end === -1) return null;
  return new Set(
    [...cssText.slice(from, end).matchAll(/^\s*(--pct-[a-z0-9-]+)\s*:/gm)].map(
      (m) => m[1],
    ),
  );
};

/**
 * The `z-index` a stylesheet gives a selector, or `null`: the first rule whose selector list
 * carries it exactly. A textual read of the dependency's CSS rather than a parser, because
 * the file is the prebuilt one both applications load and its rules are one selector to one
 * block; a rule that carried the selector in a longer list would still be found.
 */
const zIndexOf = (cssText, selector) => {
  for (const m of cssText.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const selectors = m[1].split(',').map((x) => x.trim());
    if (!selectors.includes(selector)) continue;
    const z = m[2].match(/z-index\s*:\s*(-?\d+)/);
    if (z) return Number(z[1]);
  }
  return null;
};

/**
 * The compiled CSS with its comments taken out, which is how every reader in this file
 * receives it. Sass keeps a loud comment (`/* … *\/`) in its output, and the declaration
 * scanner below is a regular expression: prose is text like any other to it, so a comment
 * carrying `word:` reads as a declaration whose value runs to the next `;` — and the real
 * declaration under it disappears into that value. The measurement and the reason for the
 * SPACE it leaves behind stand at the call site.
 *
 * Not a parser, and the difference is the item's own fork: a parser would also settle the
 * `;` inside a data URI, which is the same pattern's other blind spot. No stylesheet in this
 * library holds one, and a rule covering nothing is what this file refuses four times over,
 * so it waits for the first — with its case.
 */
const withoutComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, ' ');

/**
 * What the stylesheets REALLY paint with which token — from sass's output, not from the
 * source text (the same reason as point 2 in `check-styles`: a property composed by a mixin
 * or an interpolation reaches the browser without standing in the text anywhere).
 *
 * There are three roles because WCAG has three thresholds: background and text (SC 1.4.3)
 * and outline (SC 1.4.11). A property outside that list brings no colour into a contrast
 * judgement — `transition: background-color …` names a property rather than painting with it.
 *
 * TWO READINGS, and the difference is what a property name can promise. Where the whole
 * value is a colour the property alone decides, and every `var()` under it is a colour.
 * Where the value is COMPOSITE — a shadow's offsets and its colour side by side — the
 * property decides nothing and the skin's `$type` decides instead. The second reading
 * arrived with the first face this point could not see: the reader keyed on the property
 * name, so a ring under `box-shadow` painted a colour the denominator never held, and a
 * gradient under `background-image` counted only where a second stylesheet happened to
 * spell the shorthand. The policy entries covering both were there because a person put
 * them there (plan 4.39, [`lesson-168`](../docs/lessons.md)).
 *
 * Assignments to another custom property (`--pct-button-height: var(--pct-button-height-sm)`
 * — the size axis pattern) are EXPANDED to a fixed point: the token on the right inherits
 * the roles of the token on the left. Without that, `--pct-button-bg: var(--pct-surface-100)`
 * in a stylesheet would hide the surface from the denominator, and it would look like no
 * problem at all. It is not the size axes alone and has not been since the badge: `[tone]`
 * swaps its triple by assigning `--pct-badge-bg: var(--pct-badge-bg-danger)`, so the fixed
 * point carries a real colour role through an assignment — which is the expansion earning
 * its keep rather than an exception to it.
 */
/**
 * A value with the AMOUNT slots of every `color-mix()` cut out of it.
 *
 * The point's model was "every `var(--pct-…)` in a `background`/`color`/`border` declaration
 * names a colour", and that was true until a component needed a translucent surface. A colour
 * literal is refused above the primitive tier and an alpha has no tier of its own, so the veil
 * of `pct-dialog` is a colour token and a SECOND token holding how much of it there is:
 *
 *     background: color-mix(in srgb, var(--pct-dialog-backdrop-bg) var(--pct-dialog-backdrop-alpha), transparent);
 *
 * Read whole, that declaration paints a `dimension` as a colour and rule `not-a-colour` fires
 * on a stylesheet doing nothing wrong. The exemption is deliberately narrow: only inside a
 * `color-mix()`, and only for a `var()` standing immediately after another one — that is the
 * `<color> <percentage>` pair the function is defined in terms of, and nothing else in CSS
 * puts two `var()`s side by side inside it. Everywhere outside `color-mix()` the old model
 * stands, so `background: var(--pct-space-3)` still fires.
 */
const withoutMixAmounts = (value) => {
  let out = value;
  for (;;) {
    const start = out.indexOf('color-mix(');
    if (start < 0) return out;
    // The call's own parentheses, counted — `var()` inside it has parentheses of its own.
    let depth = 0;
    let end = start;
    for (let i = start + 'color-mix'.length; i < out.length; i++) {
      if (out[i] === '(') depth++;
      else if (out[i] === ')' && --depth === 0) {
        end = i + 1;
        break;
      }
    }
    if (end <= start) return out; // unbalanced — leave it to the CSS parser to complain
    const call = out
      .slice(start, end)
      // The second of two adjacent `var()`s is the amount; the first is the colour.
      .replace(
        /(var\(\s*--pct-[a-z0-9-]+\s*\))(\s+)var\(\s*--pct-[a-z0-9-]+\s*\)/g,
        '$1$2',
      );
    out =
      out.slice(0, start) +
      call.replace('color-mix(', 'mixed(') +
      out.slice(end);
  }
};

const paintedColours = (sheets, byName) => {
  // A value the point reads as a colour outright: every `var()` standing in one names a
  // colour, and a dimension there is the defect `not-a-colour` exists for.
  //
  // "Outright" is the point's MODEL and not a fact about CSS, and the difference is the
  // limit of this table. Three of these are shorthands whose value holds slots that are not
  // colours — `border: 1px solid …` carries a width and a style, `background` a position and
  // a repeat, and the value of `background-image` is an IMAGE whose colour STOPS are the
  // colours in it. Put a token in one of those slots (`border: var(--pct-space-2) solid …`,
  // or a gradient stop written as `var(--pct-a) var(--pct-space-6)`) and the point calls a
  // dimension a colour on correct CSS. Not one stylesheet in the library does — every width,
  // style and stop position here is a literal — so this is a stated limit rather than a
  // defect, and the shape is already solved one function over: `withoutMixAmounts` cuts
  // exactly such a slot out of a `color-mix()`, and is where the answer goes if a stylesheet
  // ever asks. `background-image` joins the list on the same terms as `background`, which
  // has carried them since the first version of this point.
  const ROLE = [
    [/^background(-color|-image)?$/, 'background'],
    [/^(color|fill|stroke|caret-color|-webkit-text-fill-color)$/, 'text'],
    [
      /^border(-(block|inline)(-(start|end))?)?(-color)?$|^outline(-color)?$/,
      'outline',
    ],
  ];
  // A COMPOSITE value holds lengths and a colour side by side, both legal: `box-shadow:
  // inset 0 0 0 1px var(--pct-date-day-border-today)` is an offset, a spread and a colour
  // in one declaration. So here the property name no longer says what a `var()` IS, and
  // the skin's own `$type` has to — a colour takes the role, everything else is left where
  // it stands.
  //
  // Why this property and not the shorthands above it, which are composite too: because the
  // library really does put a non-colour token in this one. Every width and stop position in
  // a `border` or a gradient here is a literal, and eight stylesheets write
  // `box-shadow: var(--pct-…-shadow)` where the token is the WHOLE shadow. A model can stay
  // a model until an input contradicts it; this is the input.
  //
  // `outline` and not `background`, because a shadow the library paints as a ring is a
  // non-text boundary under SC 1.4.11 — the role a `border-color` takes one line up. The
  // word is a DESCRIPTION and not a threshold: the roles here are printed in the violation
  // and nothing else reads them, and what a pair is measured against is the `level` a
  // person wrote beside it in the policy. The eight drop shadows would take the same word
  // if they ever carried a colour token, and it would fit neither of them.
  //
  // What this reading does NOT buy, measured against the flat alternative and written down
  // rather than left to be found. Inside these properties the
  // rules `not-a-colour` and `token-outside-theme` cannot fire, and the three things that
  // buys are not equal: a length in a length slot is CORRECT and had to stop firing; a name
  // outside the skin is caught by point 8 anyway (`touchedTokens` reads every property);
  // but a token of the skin with a non-colour `$type` standing in the COLOUR slot —
  // `box-shadow: 0 0 0 var(--pct-space-2) var(--pct-space-3)` — is caught by nothing here,
  // and the browser answers it by dropping the declaration. That last one is not a LOSS and
  // the difference is worth the word: before this reading the property was not walked at
  // all, so nothing caught it then either. It is the one thing the new reading still cannot
  // say, and the price of a value CSS lets an author write in any order.
  //
  // What is NOT given up is the rule that matters — a colour with no pair in the policy is
  // still `unmeasured`.
  //
  // One property and not two: `text-shadow` has the same value shape and no reader in the
  // library, and a pattern covering nothing is what this file refuses four times over (a
  // dead prefix, a dead word, a dead `on-` pair, a dead primitive). It arrives with the
  // first stylesheet that paints one, together with its case — the palette's own rule, one
  // floor up (`0020`).
  //
  // A `$type: shadow` token — `--pct-popover-panel-shadow` and its seven siblings — is a
  // whole shadow rather than a colour, and its own colour goes unmeasured by decision
  // rather than by oversight: the library's panels separate themselves with
  // `border-strong` precisely because a shadow does not, and forced colours takes a shadow
  // away in two engines of three (`lesson-119`: `none` in chromium and firefox, the author's
  // own value in webkit). That sentence stands in three of the component token files —
  // `component.menu.json`, `component.popover.json` and `component.toast.json`.
  const COMPOSITE = [[/^box-shadow$/, 'outline']];
  const direct = new Map(); // token -> Set(role)
  const assignments = new Map(); // target token -> Set(tokens on the right)

  for (const { css } of sheets)
    for (const [, property, rawValue] of css.matchAll(
      /^\s*(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gm,
    )) {
      const value = withoutMixAmounts(rawValue);
      const used = [...value.matchAll(/var\(\s*(--pct-[a-z0-9-]+)/g)].map(
        (m) => m[1],
      );
      if (!used.length) continue;
      if (property.startsWith('--')) {
        const entry = assignments.get(property) ?? new Set();
        for (const t of used) entry.add(t);
        assignments.set(property, entry);
        continue;
      }
      const role = ROLE.find(([pattern]) => pattern.test(property))?.[1];
      if (role) {
        for (const t of used)
          direct.set(t, (direct.get(t) ?? new Set()).add(role));
        continue;
      }
      const composite = COMPOSITE.find(([pattern]) =>
        pattern.test(property),
      )?.[1];
      if (!composite) continue;
      for (const t of used)
        if (byName.get(t)?.type === 'color')
          direct.set(t, (direct.get(t) ?? new Set()).add(composite));
    }

  const painted = new Map([...direct].map(([t, r]) => [t, new Set(r)]));
  for (let changed = true; changed;) {
    changed = false;
    for (const [pointsAt, sources] of assignments) {
      const role = painted.get(pointsAt);
      if (!role) continue;
      for (const t of sources) {
        const sofar = painted.get(t) ?? new Set();
        const before = sofar.size;
        for (const r of role) sofar.add(r);
        painted.set(t, sofar);
        if (sofar.size !== before) changed = true;
      }
    }
  }
  return { painted, assignments: assignments.size > 0 };
};

/**
 * Every `--pct-…` a stylesheet touches, and how: `read` for a `var(--pct-…)`, `declared` for
 * one the sheet sets itself (the size axis does that). Read from sass's output for the same
 * reason as `paintedColours`. A name both declared and read counts as declared — the stronger
 * statement of the two, and the one whose rule names the defect more precisely.
 */
const touchedTokens = (sheets) => {
  const out = new Map();
  for (const { file, css } of sheets)
    for (const [, property, value] of css.matchAll(
      /^\s*(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gm,
    )) {
      for (const [, token] of value.matchAll(/var\(\s*(--pct-[a-z0-9-]+)/g))
        if (!out.has(token)) out.set(token, { kind: 'read', file });
      if (property.startsWith('--pct-'))
        out.set(property, { kind: 'declared', file });
    }
  return out;
};

/** One surface compared against the list it is meant to carry. */
const compareSurfaces = (where, ma, shouldHold, what) => {
  const missing = [...shouldHold].filter((n) => !ma.has(n)).sort();
  const surplus = [...ma].filter((n) => !shouldHold.has(n)).sort();
  if (!missing.length && !surplus.length) return;
  throw new TokenError(
    'surface',
    `${where} does not carry what it should (${what}):\n` +
      (missing.length
        ? `    missing (${missing.length}):\n` + list(shorten(missing)) + '\n'
        : '') +
      (surplus.length
        ? `    surplus (${surplus.length}):\n` + list(shorten(surplus)) + '\n'
        : '') +
      `    A consumer sees the tokens through these artifacts, not through the DTCG ` +
      `sources. A token with no entry in \`tokens.ts\` is not protected from a typo in ` +
      `\`getPropertyValue\` (lesson-43), and a surplus token promises a declaration the ` +
      `skin does not hold.`,
  );
};

/** DTCG leaves: `[path, $type, $value]` for every node carrying a `$value`. */
function* leaves(tree, prefix = []) {
  for (const [key, value] of Object.entries(tree)) {
    if (key.startsWith('$')) continue;
    if (!value || typeof value !== 'object') continue;
    const path = [...prefix, key];
    if ('$value' in value) yield [path.join('.'), value.$type, value.$value];
    else yield* leaves(value, path);
  }
}

/** The DTCG path a `{a.b.c}` value points at — or `null` for a literal. */
const referenceOf = (value) =>
  typeof value === 'string'
    ? (value.match(/^\{([^}]+)\}$/)?.[1] ?? null)
    : null;

/**
 * A token's tier from the names of the files it stands in. `motion.reduced.json` overrides
 * the primitives of the motion axis, `density.compact.json` those of the space and control
 * axes and `semantic.dark.json` the semantics, so a token is sometimes in two files; one
 * tier has to come out of them.
 */
const layer = (files) => {
  const names = files.map((p) =>
    p
      .split('/')
      .pop()
      .replace(/\.json$/, ''),
  );
  const found = new Set();
  let component = null;
  for (const name of names) {
    if (
      name === 'primitive' ||
      name.startsWith('motion.') ||
      name.startsWith('density.')
    )
      found.add('primitive');
    else if (name.startsWith('semantic.')) found.add('semantic');
    else if (name.startsWith('component.')) {
      found.add('component');
      component = name.slice('component.'.length);
    } else found.add(`?${name}`);
  }
  if (found.size !== 1 || [...found][0].startsWith('?'))
    return {
      layer: null,
      component: null,
      reason:
        found.size > 1
          ? `two tiers at once: ${files.join(', ')}`
          : `unrecognised file: ${files.join(', ')}`,
    };
  return { layer: [...found][0], component, reason: null };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * The snapshot is markdown, but its content is a code block with no column padding. Not
 * aesthetics: a markdown table run through prettier pads its columns to the longest cell,
 * so one long token rewrites the WHOLE file and the diff stops showing what really changed
 * — losing the only function this file exists for.
 */
const renderSnapshot = (names, isPrivate) =>
  [
    '# Token name snapshot',
    '',
    '> **This file is generated.** Do not edit it by hand —',
    '> `node tools/check-tokens.mjs --write`. The `check-tokens` gate rejects a drift.',
    '',
    "A token's name is the theme's public API exactly as an input's name is a component's",
    'public API — with the difference that changing it gives not one red test, because the',
    'library renames both sides at once: the token and the stylesheet using it. The consumer',
    'is left with an override pointing nowhere.',
    '',
    'This file is the list a change is measured against. A drift does not mean "an error" —',
    'it means "a change of public API that is to be visible in review".',
    '',
    'Columns: the custom property name · `$type` from DTCG · the tier · whether it is in',
    'the public `PctCssVar` union (see `private.prefixes` in',
    '[`src/names.policy.json`](src/names.policy.json)).',
    '',
    '```',
    ...names.map((n) =>
      [n.name, n.type, n.layer, isPrivate(n.path) ? 'private' : 'public'].join(
        ' ',
      ),
    ),
    '```',
    '',
  ].join('\n');

/** The data rows alone — for computing the difference, with no heading. */
const snapshotRows = (content) =>
  new Set(content.split('\n').filter((w) => w.startsWith('--pct-')));

// ── input from disk ───────────────────────────────────────────────────────────

const read = (root, path) => readFileSync(join(root, path), 'utf8');

/**
 * An input built from a file list — the same shape for the repository and for a fixture.
 * `dist/` is read outside that list, because it is gitignored: for the repository it
 * comes from `dependsOn: build`, for a fixture from a run of that same `build.mjs`.
 */
const collectInput = (root, files) => {
  const dist = join(root, TOKENS, 'dist');
  for (const file of ['pct.css', 'tokens.ts'])
    if (!existsSync(join(dist, file)))
      throw new TokenError(
        'set',
        `no \`${TOKENS}/dist/${file}\` — this gate reads artifacts, not the sources ` +
          `alone.\n    The target needs a \`dependsOn\` on the token build.`,
      );

  const sources = files
    .filter((p) => p.startsWith(`${TOKENS}/src/`) && p.endsWith('.json'))
    .map((file) => ({ file, tree: JSON.parse(read(root, file)) }))
    // DTCG is recognised by the `pct` ROOT and not by a file-name pattern repeated from
    // the generator — see the comment at point 1.
    .filter(({ tree }) => tree && typeof tree === 'object' && 'pct' in tree);

  // The library's stylesheets — `libs/components` alone, and only those written by hand.
  // `libs/components/themes/` carries the generated skin, copied there as an asset of the
  // package: a stylesheet landing in that directory would be measured as if the library
  // painted with every token of the skin at once.
  //
  // The comments come out before anybody reads the CSS, and that one call is the whole of
  // point 4.40. A loud comment SURVIVES sass, and the declaration scanner of points 7 and 8
  // is a regular expression with no notion of one: a comment whose prose contains `word:`
  // parses as a property whose value runs to the next `;`, so it swallows the real
  // declaration standing under it. Measured over the library rather than deduced — four
  // declarations were read under the wrong property, `left: 50%` in `checkbox.scss` and
  // `radio.scss` (as `improvement`), `container-type` in `container.scss` (as `stage`) and
  // the `max-block-size` of `menu.scss` (as `screen`) — and all four carry dimensions, so
  // nothing was red. What was lost is the PROPERTY, which is precisely the question point 7
  // asks: the day a swallowed line paints a colour, the point counts nothing and stays green.
  //
  // A space and not an empty string: a comment can end in the middle of a line, and the
  // scanner requires a declaration to BEGIN one. Replacing the comment with a space keeps
  // every newline that stood outside it, so a declaration that followed one on its own line
  // still starts a line, and a comment between a property and its colon leaves a space the
  // pattern already allows.
  //
  // `check-styles` does the opposite on purpose and reads the same output WITH its comments:
  // its exceptions are written as `/* pct-exception left: … */`. One repository, two gates,
  // and the same text is evidence to one and noise to the other — which is why the strip
  // stands here, at this gate's own input, and not in a shared reader.
  const sheets = files
    .filter(
      (p) =>
        p.startsWith(`${COMPONENTS}/`) &&
        p.endsWith('.scss') &&
        !p.startsWith(`${COMPONENTS}/themes/`),
    )
    .map((file) => ({
      file,
      css: withoutComments(
        sass.compile(join(root, file), { style: 'expanded' }).css,
      ),
    }));

  // The dependency's stylesheet a layer names, read from THIS root: the repository's
  // `node_modules` for the live run, the copy `buildFixture` lays down for a prepared one.
  const layers = JSON.parse(read(root, LAYERS_POLICY));
  const dependencies = Object.fromEntries(
    Object.values(layers.layers ?? {})
      .filter((spec) => typeof spec.file === 'string')
      .map((spec) => [
        spec.file,
        existsSync(join(root, spec.file)) ? read(root, spec.file) : null,
      ]),
  );

  return {
    policy: JSON.parse(read(root, NAMES_POLICY)),
    levels: JSON.parse(read(root, LEVELS_POLICY)),
    contrast: JSON.parse(read(root, CONTRAST_POLICY)),
    layers,
    dependencies,
    sources,
    sheets,
    css: read(root, `${TOKENS}/dist/pct.css`),
    ts: read(root, `${TOKENS}/dist/tokens.ts`),
    snapshot: existsSync(join(root, SNAPSHOT)) ? read(root, SNAPSHOT) : null,
    entrypoints: new Set(
      files
        .filter((p) =>
          new RegExp(`^${COMPONENTS}/[^/]+/ng-package\\.json$`).test(p),
        )
        .map((p) => p.split('/')[2]),
    ),
  };
};

/**
 * Files from the GIT INDEX, not from a glob over the disk — the same reason as in
 * `check-styles`, `check-zoneless` and `check-typecheck`: the index is an independent record
 * of what the repository really carries, and it cuts out the generated things by itself.
 *
 * The pathspec is a DIRECTORY and the filtering sits in JS: a git pathspec is not a shell
 * glob, and without `:(glob)` a star crosses `/`, so a pattern with a star can return ZERO
 * files rather than an error (lesson-48).
 */
const repoFiles = () =>
  execFileSync('git', ['ls-files', '-z', TOKENS, COMPONENTS], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, the deletions from
 * `fixture.json`, then the REAL `build.mjs` from the repository — and finally the case's
 * files once more, so that a case can replace the artifact in `dist/` too.
 *
 * That last layer is the only way to have a negative control for points 1 and 2: were a
 * fixture always given a `dist/` generated from its own sources, the artifact would agree
 * with them by definition and neither point could fire. The generator we run is the
 * repository's and not a copy of it in the fixtures — otherwise the control would be
 * checking a stale sentence about what the build does.
 *
 * A prepared `tokens.ts` sits in the repository as `tokens.ts.txt` and becomes
 * `.ts` only here — the same move as in `check-styles` and for the same reason:
 * a `.ts` file in `tools/` belongs to no compiler program, so it would fire
 * `check-typecheck` (point 1 — a file with no project). One gate's fixture must not be
 * another's defect. Measured, not foreseen: the typecheck gate fired on
 * it on the first run after the file was added to the git index.
 */
const buildFixture = (name, fx) => {
  const pointsAt = mkdtempSync(join(tmpdir(), 'pct-check-tokens-'));
  const overlay = () =>
    cpSync(join(FIXTURES, name), pointsAt, {
      recursive: true,
      filter: (src) => !src.endsWith('fixture.json'),
    });

  cpSync(join(FIXTURES, REFERENCE), pointsAt, { recursive: true });
  if (name !== REFERENCE) overlay();
  for (const path of fx.drop ?? [])
    rmSync(join(pointsAt, path), { recursive: true, force: true });

  cpSync(join(ROOT, TOKENS, 'build.mjs'), join(pointsAt, TOKENS, 'build.mjs'));
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: join(pointsAt, TOKENS),
    stdio: 'pipe',
  });
  if (name !== REFERENCE) overlay();
  // The dependency's stylesheet point 10 reads: the REAL one from the repository, so the
  // reference re-probes the dependency exactly as the live run does, unless the case brings
  // a doctored one in `fixture.json` (`dependencies: { [file]: css }`) — a `node_modules`
  // path is nothing git would track, so the doctored text lives in the case's descriptor.
  const layersPolicy = join(pointsAt, LAYERS_POLICY);
  if (existsSync(layersPolicy))
    for (const spec of Object.values(
      JSON.parse(readFileSync(layersPolicy, 'utf8')).layers ?? {},
    )) {
      if (typeof spec.file !== 'string') continue;
      const doctored = fx.dependencies?.[spec.file];
      const target = join(pointsAt, spec.file);
      if (doctored !== undefined) {
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, doctored);
      } else if (existsSync(join(ROOT, spec.file))) {
        mkdirSync(dirname(target), { recursive: true });
        cpSync(join(ROOT, spec.file), target);
      }
    }
  for (const file of globSync('**/*.ts.txt', { cwd: pointsAt }))
    renameSync(
      join(pointsAt, file),
      join(pointsAt, file.replace(/\.txt$/, '')),
    );
  return pointsAt;
};

const fixtureInput = (directory) =>
  collectInput(
    directory,
    globSync('**/*.{json,scss}', { cwd: directory })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let description = null;

// The maintenance path: rewrite a fixture's snapshot and exit. It does not mix with a
// checking run, because it is not checking — it is composing the reference input from the
// same renderer the repository is measured with.
if (WRITE_FIXTURE) {
  const directory = buildFixture(WRITE_FIXTURE, {});
  const pointsAt = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    checkTokens(fixtureInput(directory));
    console.log(`✓ ${WRITE_FIXTURE}: the snapshot was already current.`);
  } catch (error) {
    if (!(error instanceof TokenError) || error.check !== 'snapshot')
      throw error;
    writeFileSync(pointsAt, error.snapshot);
    console.log(`✓ Rewrote ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const result = checkTokens(collectInput(ROOT, repoFiles()));
  description = result.description;
} catch (error) {
  if (!(error instanceof TokenError)) throw error;
  // `--write` exists so that a snapshot drift can be accepted with one command. Every
  // other point stays an error under it too: rewriting the snapshot is no answer to a name
  // from outside the schema.
  if (WRITE && error.check === 'snapshot') {
    writeFileSync(join(ROOT, SNAPSHOT), error.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== REFERENCE)
  .map((d) => d.name)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-tokens.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every "rejected" would be false — this
// control would become the very thing it stands against.
{
  const directory = buildFixture(REFERENCE, {});
  try {
    checkTokens(fixtureInput(directory));
  } catch (error) {
    if (!(error instanceof TokenError)) throw error;
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
    checkTokens(fixtureInput(directory));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof TokenError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
    // A point is not one sentence (lesson-50). A case declaring a rule has to fire on
    // THAT rule and not on a neighbouring rule of the same point — otherwise the point's
    // identifier confirms nothing but itself.
    else if (fx.rule && error.rule !== fx.rule)
      problems.push(
        `${name}: at point ${fx.point} rule \`${error.rule}\` fired, and \`${fx.rule}\` — the same point, a different sentence`,
      );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Token gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Tokens: ${description}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
