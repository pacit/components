#!/usr/bin/env node
/**
 * Reach gate: is there a tracked file nothing in the repository reads (`req-project-reach`),
 * or a file a task reads and no hash is bound to: one nx leaves out, or a dotenv file it loads?
 *
 *  1. DENOMINATOR: the git index, its readable text, the declared roots, a listing per project,
 *  2. every root of the policy is one existing file,
 *  3. every entry of the register still grants reach to something,
 *  4. every `check-<x>.fixtures/` tree has the gate that walks it,
 *  5. REACH: every tracked file is reached from a root,
 *  6. HASHED: nx's own file set holds every tracked file the working tree holds,
 *  7. ENVIRONMENT: no dotenv file lies where nx loads one into a task's environment.
 *
 * Point 5 walks FROM THE ROOTS, since "does any other file mention this one" calls a dead
 * island alive ([`lesson-61`](../docs/lessons.md#lesson-61),
 * [`lesson-113`](../docs/lessons.md#lesson-113)). Points 6 and 7 read what no `inputs` entry
 * can name, so the target runs uncached. Negative control: `check-reach.fixtures/`.
 *
 * Usage: node tools/check-reach.mjs
 */
import { lstatSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURES = join(ROOT, 'tools/check-reach.fixtures');
const REFERENCE = '_reference.json';
const POLICY = 'tools/reach.policy.json';

/**
 * Files whose content is not text. They stay in the DENOMINATOR — a baseline screenshot
 * nothing reads is dead exactly like a dead script — but they mention nothing, so the
 * walk never reads them. The list is by extension rather than by sniffing bytes: a file
 * this gate cannot decode has to be a deliberate entry, not a guess of a heuristic.
 */
const BINARY = /\.(?:png|jpe?g|gif|ico|webp|avif|woff2?|ttf|otf|pdf|zip|gz)$/i;

/**
 * A token that could be a path: letters, digits and the characters a path is written
 * with. Three characters minimum, because `.`, `/` and two-letter words carry no name.
 * The extraction is deliberately blind to syntax — a path lives in JSON, in an import,
 * in a YAML step and in a sentence of prose, and a parser per format would be four
 * parsers and one blind spot.
 */
const TOKEN = /[A-Za-z0-9_@.*/-]{3,}/g;

/**
 * Endings an import specifier drops. `./button` in TypeScript is `button.ts`, and
 * `@pacit/components/button` is that directory's `index.ts` — without these completions
 * every source file in the library would look unreached, since almost nothing names them
 * with the extension.
 *
 * `.scss` is the same idiom one language over: sass `@use '../../hero-edge'` opens
 * `hero-edge.scss`, and until the docs app grew a stylesheet shared between two pages
 * (2026-09-04) nothing in the repository wrote that line, so the gate had never needed to
 * follow it. Sass's own `_` prefix is deliberately NOT completed here: a partial named
 * `_hero-edge.scss` would be reachable through a spelling no other tool in this repository
 * uses, and the shared sheet is plainly named instead.
 */
const COMPLETIONS = ['.ts', '.mjs', '.mts', '.scss', '/index.ts'];

/**
 * A violation of one of the seven points. It carries the point's identifier, so the
 * negative control can require a prepared input to fire ON ITS OWN point — a case that
 * fires elsewhere proves something other than what it declares (`lesson-50`).
 */
class ReachError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

// ── the reach relation ────────────────────────────────────────────────────────

/**
 * A glob turned into a regular expression. `project.json` describes its inputs with
 * patterns — one entrypoint directory per component, each holding an `ng-package.json` —
 * and a pattern is how that file names those files, the only naming they ever get. A
 * pattern cannot be quoted in a block comment without closing it, which is why this
 * paragraph describes one instead of showing it. `matchesGlob` would do the
 * same job, but it is called once per file per pattern, and the corpus holds thousands of
 * distinct patterns; one compiled expression per pattern is the difference between a
 * gate of a second and a gate of a minute.
 */
const globToRegExp = (glob) => {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` crosses directories, a lone `**` swallows the rest of the path.
        if (glob[i + 2] === '/') {
          out += '(?:.*/)?';
          i += 2;
        } else {
          out += '.*';
          i += 1;
        }
      } else out += '[^/]*';
    } else if (c === '?') out += '[^/]';
    else if ('\\^$.|+()[]{}'.includes(c)) out += `\\${c}`;
    else out += c;
  }
  return new RegExp(`^${out}$`);
};

/**
 * The paths a single token names. Five ways, and each one is a way a file is really
 * pointed at somewhere in this repository:
 *
 *   a pattern (`libs/tokens/src/*.json`), a path from the repository root
 *   (`docs/plan.md`), a path relative to the mentioning file (`../lessons.md`), an
 *   import with the extension left off (`./button`), and a bare name.
 *
 * The bare name counts only when it is UNIQUE in the index. Eight files called
 * `SKILL.md` are eight files a sentence saying "SKILL.md" does not choose between — and
 * a copied tree is exactly the case where names stop being unique, so a generous reading
 * here would blind the gate to the thing it exists for.
 */
const targetsOf = (token, from, index) => {
  const t = token
    .replace(/^\{workspaceRoot\}\//, '')
    .replace(/^!+/, '')
    .replace(/^\.?\//, '')
    .replace(/[.,:;)\]`'"]+$/, '');
  if (t.length < 3) return [];

  if (t.includes('*')) {
    // A pattern names files only inside the directory it names. `libs/tokens/src/**/*.json`
    // points at the DTCG sources and at nothing else; `**/*.md` and `{workspaceRoot}/**/*`
    // point at a kind of file, not at any file — and they are common, because that is how
    // `inputs` say "everything". Reading them as mentions would reach the whole repository
    // from one cache declaration: measured, `**/*.md` in `check-texts.mjs` alone kept the
    // vendored `.opencode` tree alive. Hence the rule: a directory segment before the first
    // wildcard, or the pattern names nobody.
    const anchor = t.slice(0, t.indexOf('*'));
    if (!anchor.includes('/')) return [];
    return index.byGlob(t);
  }

  const found = [];
  const here = normalize(join(dirname(from), t))
    .split('\\')
    .join('/');
  for (const candidate of [t, here]) {
    if (index.tracked.has(candidate)) found.push(candidate);
    for (const ending of COMPLETIONS)
      if (index.tracked.has(candidate + ending)) found.push(candidate + ending);
  }
  if (!found.length && !t.includes('/')) {
    const sharing = index.byName.get(t);
    if (sharing?.length === 1) found.push(sharing[0]);
  }
  return found;
};

/** The lookups every token resolution needs, built once over the file list. */
const indexOf = (files) => {
  const tracked = new Set(files);
  const byName = new Map();
  for (const file of files) {
    const name = file.slice(file.lastIndexOf('/') + 1);
    byName.set(name, (byName.get(name) ?? []).concat(file));
  }
  const globs = new Map();
  return {
    tracked,
    byName,
    byGlob: (glob) => {
      if (!globs.has(glob)) {
        const anchored = globToRegExp(glob);
        globs.set(
          glob,
          files.filter((f) => anchored.test(f)),
        );
      }
      return globs.get(glob);
    },
  };
};

/** What each text names. One pass over the corpus; the walk then only follows edges. */
const mentionsIn = (texts, index) => {
  const mentions = new Map();
  for (const [file, text] of Object.entries(texts)) {
    const targets = new Set();
    for (const token of new Set(text.match(TOKEN) ?? []))
      for (const target of targetsOf(token, file, index))
        if (target !== file) targets.add(target);
    mentions.set(file, targets);
  }
  return mentions;
};

/**
 * The fixtures tree of a gate. `tools/check-language.fixtures/*.json` is read with
 * `readdirSync` over the whole directory, so no case is ever named — the gate reaches
 * them by walking. The pairing is derived from the names and NOT written in the policy:
 * a register of "trees somebody walks" would be the one place to park a dead directory,
 * and this one cannot grow an entry that is not already backed by a gate script.
 */
const FIXTURES_TREE = /^(.*\/)?(check-[a-z-]+)\.fixtures\//;

const fixtureTrees = (files) => {
  const trees = new Map();
  for (const file of files) {
    const match = FIXTURES_TREE.exec(file);
    if (!match) continue;
    const tree = `${match[1] ?? ''}${match[2]}.fixtures`;
    if (!trees.has(tree))
      trees.set(tree, { gate: `${match[2]}.mjs`, files: [] });
    trees.get(tree).files.push(file);
  }
  return trees;
};

/** Where a gate script really lives — `check-package.mjs` sits in the library it packs. */
const gateNamed = (name, files) =>
  files.find((f) => f === name || f.endsWith(`/${name}`)) ?? null;

/**
 * The walk. Starts at the roots, follows what a reached file names, and takes the two
 * grants that are not names at all: a gate reaches its fixtures tree, and a register
 * entry reaches the tree an outside tool enumerates. Returns the set of reached paths.
 */
const walk = ({ files, mentions, roots, trees, granted }) => {
  const reached = new Set(roots);
  const queue = [...roots];
  const add = (file) => {
    if (reached.has(file)) return;
    reached.add(file);
    queue.push(file);
  };

  const treesOfGate = new Map();
  for (const { gate, files: inside } of trees.values()) {
    const script = gateNamed(gate, files);
    if (script)
      treesOfGate.set(script, (treesOfGate.get(script) ?? []).concat(inside));
  }

  while (queue.length) {
    const from = queue.pop();
    for (const target of mentions.get(from) ?? []) add(target);
    for (const inside of treesOfGate.get(from) ?? []) add(inside);
    for (const inside of granted.get(from) ?? []) add(inside);
  }
  return reached;
};

// ── the checks ────────────────────────────────────────────────────────────────

/** A policy list entry has to be an object with a non-empty reason — nothing else. */
const shapeDefect = (entry, field) => {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
    return `is not an object (${JSON.stringify(entry)})`;
  if (field === 'root') {
    const forms = ['path', 'name'].filter((f) => typeof entry[f] === 'string');
    if (forms.length !== 1)
      return (
        `is neither one file nor one name — a root carries \`path\` (one file a tool ` +
        `opens at that exact place) or \`name\` (a file name a tool looks for at any ` +
        `depth), and exactly one of the two`
      );
  } else if (typeof entry[field] !== 'string' || !entry[field].trim())
    return `has no \`${field}\``;
  if (typeof entry.reason !== 'string' || entry.reason.trim().length < 20)
    return (
      `has no reason worth the name — an entry whose reason is a word is a permit, ` +
      `and a permit is what this register may not become`
    );
  return null;
};

/**
 * The names nx loads into a task's environment (`nx/src/tasks-runner/task-env-paths.js`):
 * `.env`, `.env.local` and `.local.env`, and `.env.<id>`, `.<id>.env` and their `.local`
 * forms, where `<id>` is the target, the configuration or both (`.env.build.production`).
 * Read wider than that list on purpose — a target can be called anything, so `.env.example`
 * is one `example` target away from being loaded — and no wider: `.envrc`, `sample.env` and
 * `.prod.env.example` are nothing nx opens.
 */
const DOTENV = /^\.env(?:\..+)?$|^\..+\.env$/;

/**
 * The places nx loads those names from: the workspace root, for every task, and the root of
 * the project whose task runs — a directory of nx's own file set holding a `project.json` or
 * a `package.json`. Read off nx's set and not off the index, because nx makes its projects of
 * that set: a manifest nobody has added yet is a project already. Wider than the graph by the
 * fixtures trees that carry a manifest; a project a plugin would make of another file is not
 * among them, and every project here has a `project.json`.
 */
const envRootsOf = (files) => [
  ...new Set([
    '',
    ...files
      .filter((f) => /(?:^|\/)(?:project|package)\.json$/.test(f))
      .map((f) => f.slice(0, Math.max(0, f.lastIndexOf('/')))),
  ]),
];

/**
 * The full set of checks over a ready input:
 *   `files`    — every path in the git index, relative to the repository root,
 *   `texts`    — `{ [path]: string }` for the readable ones,
 *   `policy`   — `{ roots: [{ path, reason }], enumerated: [{ tree, reader, reason }] }`,
 *   `hashed`   — every path in nx's own file set, the one each task hash is computed over,
 *   `absent`   — the paths of the index that the working tree holds nothing at,
 *   `listings` — `{ [directory]: [file names] }` for the workspace root (`''`) and each
 *                project root of `hashed`, as the disk holds them, tracked or not.
 * Throws `ReachError` on the first violation: the points run from the denominator
 * outwards, and each later one leans on what the earlier ones establish.
 */
const checkReach = ({ files, texts, policy, hashed, absent, listings }) => {
  // 1. DENOMINATOR. Four ways for this gate to pass while measuring nothing: an empty
  // index (nothing to reach), an empty corpus (nothing names anything, so the walk stops
  // at the roots), an empty root list (the walk never starts) and a project root nobody
  // listed (point 7 reads names on the disk, and a place it was handed no listing of is a
  // place it looked at and found clean — the shape a reading takes when it keys the
  // workspace root as `.` and not as `''`).
  if (!files.length)
    throw new ReachError(
      'denominator',
      `the git index returned no files — point 5 would then walk an empty repository ` +
        `and call it whole`,
    );
  if (!Object.keys(texts).length)
    throw new ReachError(
      'denominator',
      `not one readable file among ${files.length} — every mention lives in text, so ` +
        `the walk would stop at the roots and everything else would look dead`,
    );
  const roots = policy.roots ?? [];
  const enumerated = policy.enumerated ?? [];
  if (!roots.length)
    throw new ReachError(
      'denominator',
      `${POLICY} declares no roots — the walk starts nowhere, so nothing is reached ` +
        `and the gate becomes a list of every file in the repository`,
    );
  const envRoots = envRootsOf(hashed ?? []);
  const unlisted = envRoots.filter((dir) => !Array.isArray(listings?.[dir]));
  if (unlisted.length)
    throw new ReachError(
      'denominator',
      `no listing of ${unlisted.map((dir) => `\`${dir || '.'}\``).join(', ')} — point 7 ` +
        `would then find no dotenv file in a place it never read`,
    );

  // 2. The roots exist. A root is the one place where "a tool finds this by its own
  // convention" is asserted rather than measured, so it may not be a pattern: `.github/**`
  // as a root would take the whole directory out of the gate's reach in one line, and that
  // is precisely the shape of what B9 had to clean out. Two forms, because tools look
  // both ways: `path` for one file at one place (`nx.json`), `name` for a file a tool
  // looks for at any depth (`project.json` — Nx enumerates them, and demanding an entry
  // per project would make this gate the paperwork of adding a library).
  const rootDefects = [];
  const rootPaths = [];
  for (const entry of roots) {
    const defect = shapeDefect(entry, 'root');
    if (defect) {
      rootDefects.push(`${JSON.stringify(entry)} ${defect}`);
      continue;
    }
    const declared = entry.path ?? entry.name;
    if (declared.includes('*')) {
      rootDefects.push(
        `\`${declared}\` is a pattern — a root is one file or one file NAME, otherwise ` +
          `a whole tree leaves the measurement in a single entry`,
      );
      continue;
    }
    if (entry.name !== undefined && entry.name.includes('/')) {
      rootDefects.push(
        `\`${entry.name}\` is a path, not a name — a name form grants every file called ` +
          `that, and with a directory in it the entry would grant a tree instead`,
      );
      continue;
    }
    const found =
      entry.path !== undefined
        ? files.filter((f) => f === entry.path)
        : files.filter((f) => f.slice(f.lastIndexOf('/') + 1) === entry.name);
    if (!found.length)
      rootDefects.push(
        `\`${declared}\` matches nothing in the git index — the file it started the ` +
          `walk from is gone and the entry outlived it`,
      );
    else rootPaths.push(...found);
  }
  if (rootDefects.length)
    throw new ReachError(
      'roots',
      `${rootDefects.length} defective roots in ${POLICY}:\n` +
        rootDefects.map((d) => `      ${d}`).join('\n'),
    );

  const index = indexOf(files);
  const mentions = mentionsIn(texts, index);
  const trees = fixtureTrees(files);

  // 3. The register is alive. An entry names a tree that an outside tool walks — one that
  // leaves no trace inside the repository — and it earns its place only while something
  // under that tree is reached by nothing else. The rule is the one the language register
  // runs on: a dead entry fires exactly like a new violation.
  const granted = new Map();
  const entryDefects = [];
  for (const entry of enumerated) {
    const defect = shapeDefect(entry, 'tree');
    if (defect) {
      entryDefects.push(`${JSON.stringify(entry)} ${defect}`);
      continue;
    }
    const inside = files.filter((f) => f.startsWith(`${entry.tree}/`));
    if (!inside.length) {
      entryDefects.push(
        `\`${entry.tree}\`: the tree holds no tracked file — the entry describes a ` +
          `directory that is not there`,
      );
      continue;
    }
    if (!files.includes(entry.reader)) {
      entryDefects.push(
        `\`${entry.tree}\`: its reader \`${entry.reader}\` is not in the git index — ` +
          `the tool this tree exists for is no longer configured here`,
      );
      continue;
    }
    granted.set(entry.reader, (granted.get(entry.reader) ?? []).concat(inside));
  }
  if (entryDefects.length)
    throw new ReachError(
      'register',
      `${entryDefects.length} defective entries in ${POLICY}:\n` +
        entryDefects.map((d) => `      ${d}`).join('\n'),
    );

  // 4. Every fixtures tree has its gate. The convention of point 5 grants a whole tree
  // reach from one script, so a tree whose script is gone would keep granting itself:
  // the cases stay, nothing runs them, and the gate they proved reports nothing missing.
  const orphanedTrees = [...trees]
    .filter(([, { gate }]) => !gateNamed(gate, files))
    .map(
      ([tree, { gate, files: inside }]) =>
        `${tree}: no \`${gate}\`, ${inside.length} cases`,
    );
  if (orphanedTrees.length)
    throw new ReachError(
      'fixtures',
      `${orphanedTrees.length} fixtures trees have no gate:\n` +
        orphanedTrees.map((t) => `      ${t}`).join('\n') +
        `\n    A negative control whose gate is gone is a directory of prepared defects ` +
        `nobody runs (req-quality-negative-control).`,
    );

  const reached = walk({ files, mentions, roots: rootPaths, trees, granted });

  // The register is measured against the walk WITHOUT it: an entry is alive while the
  // tree it names holds something that walk does not find. Done here rather than in
  // point 3 because it needs the same edges point 5 uses.
  const withoutRegister = walk({
    files,
    mentions,
    roots: rootPaths,
    trees,
    granted: new Map(),
  });
  const deadEntries = enumerated
    .filter((entry) =>
      files
        .filter((f) => f.startsWith(`${entry.tree}/`))
        .every((f) => withoutRegister.has(f)),
    )
    .map(
      (entry) =>
        `\`${entry.tree}\`: everything under it is reached without the entry — it ` +
        `silences nothing and only takes a tree out of the measurement`,
    );
  if (deadEntries.length)
    throw new ReachError(
      'register',
      `${deadEntries.length} dead entries in ${POLICY}:\n` +
        deadEntries.map((d) => `      ${d}`).join('\n'),
    );

  // 5. REACH. What is left is what nothing in the repository points at, in any of the
  // ways above and from any file a tool ever opens on its own.
  const unreached = files.filter((f) => !reached.has(f));
  if (unreached.length)
    throw new ReachError(
      'reach',
      `${unreached.length} tracked files nothing reaches:\n` +
        unreached.map((f) => `      ${f}`).join('\n') +
        `\n    Nothing here opens them: no import, no configuration, no documentation, ` +
        `no tool convention. Remedy: point at the file from something reached, delete ` +
        `it, or — if an outside tool walks that tree — one entry in ${POLICY} with the ` +
        `reader named (req-project-reach).`,
    );

  // 6. HASHED. nx computes every task hash over ONE file set, the workspace walked with
  // the ignore rules applied, and a tracked file outside it is out of every hash at once:
  // an edit to it is answered from the cache by each gate that reads it, whatever that
  // gate's `inputs` say. The set is asked of nx and not rebuilt from git's list of ignored
  // files, because the two differ: a `.nxignore` hides a file at any depth, not only at the
  // root, so does an `.ignore` (ripgrep's, which git never reads), and nx skips
  // `node_modules`, `.nx/cache`, `.nx/workspace-data` and `.yarn/cache` wherever they sit,
  // and a symlink to a directory or to nothing, with no rule anywhere (measured on nx 23.1,
  // 2026-10-01). A file the working tree holds nothing at is out of the set because there
  // is nothing to hash, and it comes back the moment the file does — that one is not hidden.
  const inSet = new Set(hashed ?? []);
  const gone = new Set(absent ?? []);
  const hidden = files.filter((f) => !inSet.has(f) && !gone.has(f));
  if (hidden.length)
    throw new ReachError(
      'hashed',
      `${hidden.length} tracked files nx leaves out of every hash:\n` +
        hidden.map((f) => `      ${f}`).join('\n') +
        `\n    An ignore rule hides them — a \`.gitignore\`, a \`.nxignore\` or an ` +
        `\`.ignore\` at any depth, \`.git/info/exclude\`, the global excludes file — or ` +
        `nx's walker skips them: a directory it never walks, a symlink to a directory or ` +
        `to nothing. Every gate that reads one replays its cached pass after an edit. ` +
        `Remedy: drop the rule, or stop tracking the file; ` +
        `\`git check-ignore -v --no-index <file>\` names a rule of git's own, and reads ` +
        `no \`.nxignore\` and no \`.ignore\`.`,
    );

  // 7. ENVIRONMENT. nx loads the names `DOTENV` reads from the workspace root and from
  // the project root into a task's environment, and no hash is bound to read them — a gate
  // whose `inputs` are `{workspaceRoot}/**/*` happens to, most do not — so a variable set
  // there changes what a gate does while its cached pass stands. The rule forbids the file
  // rather than hashing it. `NX_LOAD_DOT_ENV_FILES=false` keeps the per-target files out
  // and not the root ones: nx reads those into its own process on start, whatever the
  // switch says, and every `nx:run-commands` command inherits that environment (measured
  // with `.env` and `.local.env`, 2026-10-01). A pattern in `inputs` stops naming the
  // file the day a `.gitignore` takes it, and a listing of the disk does not.
  const loaded = envRoots.flatMap((dir) =>
    (listings?.[dir] ?? [])
      .filter((name) => DOTENV.test(name))
      .map((name) => (dir ? `${dir}/${name}` : name)),
  );
  if (loaded.length)
    throw new ReachError(
      'environment',
      `${loaded.length} dotenv files where nx loads them into a task:\n` +
        loaded.map((f) => `      ${f}`).join('\n') +
        `\n    No task hash is bound to read them, so a cached pass can outlive any ` +
        `variable they set. ` +
        `This repository configures nothing through dotenv: a variable a task needs ` +
        `belongs in its command or in the workflow. Remedy: delete or rename the file.`,
    );

  return (
    `${files.length} tracked files, all reached from ${rootPaths.length} roots ` +
    `(${trees.size} fixtures trees through their gates, ` +
    `${enumerated.length} trees through the register) and all in nx's file set; ` +
    `no dotenv file in the ${envRoots.length} places nx loads one from`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * Files from the git index, not from a directory scan: the walk asks what the REPOSITORY
 * carries, and `dist`, `tmp` and `node_modules` are nobody's files — untracked output
 * appears on a build and disappears on a clean.
 */
const repoFiles = () =>
  execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .sort();

/** The readable half of the index — everything the walk can follow an edge out of. */
const repoTexts = (files) => {
  const texts = {};
  for (const file of files) {
    if (BINARY.test(file)) continue;
    try {
      texts[file] = readFileSync(join(ROOT, file), 'utf8');
    } catch {
      // A file that does not decode as text mentions nothing. It stays in the
      // denominator: being unreadable is not being read.
    }
  }
  return texts;
};

/**
 * nx's own file set, the one each task hash is computed over. Asked in this process with
 * the daemon off, because a running daemon's set can disagree with the disk: it learns of a
 * `.gitignore` or of the root `.nxignore` by restarting, and of a nested `.nxignore` or an
 * `.ignore` not at all — a rule written since it started leaves the file in its set, and a
 * rule it started under keeps the file out after the rule is gone, until the file is next
 * edited (measured 2026-10-01). The disk is what CI and a fresh daemon read, and a direct
 * run of this gate would otherwise start a daemon.
 */
const nxFiles = async () => {
  process.env.NX_DAEMON = 'false';
  const { getAllFileDataInContext } =
    await import('nx/src/utils/workspace-context.js');
  return (await getAllFileDataInContext(ROOT)).map(({ file }) => file);
};

/**
 * The paths of the index the working tree holds nothing at: deleted and not yet staged so,
 * or left out of a sparse checkout, which `git ls-files --deleted` does not list. A symlink
 * is held at its own path, whatever it points to.
 */
const repoAbsent = (files) =>
  files.filter((file) => {
    try {
      lstatSync(join(ROOT, file));
      return false;
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') return true;
      throw error;
    }
  });

/** Whether a symlink leads to a file — dotenv reads nothing through one that does not. */
const leadsToFile = (path) => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

/**
 * The file names in each place nx loads a dotenv file from, read off the disk and not off
 * the index: nx reads the disk, tracked or not, ignored or not. What dotenv cannot read as
 * a file is left out — a directory, as a Python environment called `.env` is, and a symlink
 * to a directory or to nothing — and a place that is gone holds nothing.
 */
const repoListings = (hashed) => {
  const listings = {};
  for (const dir of envRootsOf(hashed)) {
    try {
      listings[dir] = readdirSync(join(ROOT, dir), { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isFile() ||
            (entry.isSymbolicLink() &&
              leadsToFile(join(ROOT, dir, entry.name))),
        )
        .map((entry) => entry.name);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      listings[dir] = [];
    }
  }
  return listings;
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so a case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 */
const buildFixture = (fx) => {
  const reference = readFixture(REFERENCE);
  const input = structuredClone({
    files: reference.files,
    texts: reference.texts,
    policy: reference.policy,
    hashed: reference.hashed,
    absent: reference.absent,
    listings: reference.listings,
  });

  if (fx.clearFiles) input.files = [];
  if (fx.clearTexts) input.texts = {};
  if (fx.clearRoots) input.policy.roots = [];
  if (fx.clearListings) input.listings = {};
  for (const [file, text] of Object.entries(fx.addFiles ?? {})) {
    // A file a case adds is one nx hashes, as any new tracked file is; a case that means
    // otherwise says so with `dropHashed`.
    input.files.push(file);
    input.hashed.push(file);
    if (text !== null) input.texts[file] = text;
  }
  input.files = input.files.filter((f) => !(fx.dropFiles ?? []).includes(f));
  for (const f of fx.dropFiles ?? []) delete input.texts[f];
  for (const [file, text] of Object.entries(fx.setTexts ?? {}))
    input.texts[file] = text;
  input.policy.roots.push(...(fx.addRoots ?? []));
  input.policy.enumerated.push(...(fx.addEntries ?? []));
  input.hashed = input.hashed.filter((f) => !(fx.dropHashed ?? []).includes(f));
  input.hashed.push(...(fx.addHashed ?? []));
  for (const [dir, names] of Object.entries(fx.addListings ?? {}))
    input.listings[dir] = [...(input.listings[dir] ?? []), ...names];
  input.files.sort();

  return input;
};

/**
 * A name a case requires of its message, found with no digit on either side — `2 dotenv
 * files` is not named by `12 dotenv files`. The same reading as `check-files`.
 */
const namedIn = (message, named) => {
  for (
    let at = message.indexOf(named);
    at !== -1;
    at = message.indexOf(named, at + 1)
  )
    if (
      !/[0-9]/.test(message[at - 1] ?? '') &&
      !/[0-9]/.test(message[at + named.length] ?? '')
    )
      return true;
  return false;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

try {
  const files = repoFiles();
  const hashed = await nxFiles();
  summary = checkReach({
    files,
    texts: repoTexts(files),
    policy: JSON.parse(readFileSync(join(ROOT, POLICY), 'utf8')),
    hashed,
    absent: repoAbsent(files),
    listings: repoListings(hashed),
  });
} catch (error) {
  if (!(error instanceof ReachError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const cases = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (cases.length === 0)
  problems.push(
    `tools/check-reach.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire because
// of it and not because of its own defect — every "it fired" would be false.
try {
  checkReach(buildFixture({}));
} catch (error) {
  if (!(error instanceof ReachError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of cases) {
  const fx = readFixture(name);
  try {
    checkReach(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof ReachError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what it declares`,
      );
    // What the message has to name, where a case says: a finding that names one file of
    // two, or a file without its directory, sends a person to the wrong place and is green
    // otherwise.
    else if (
      fx.names !== undefined &&
      (!Array.isArray(fx.names) ||
        !fx.names.length ||
        fx.names.some((named) => typeof named !== 'string' || !named.trim()))
    )
      problems.push(
        `${name}: \`names\` is not a list of non-empty strings — a case that cannot say ` +
          `what its message names proves nothing about it, and an empty one is named anywhere`,
      );
    else {
      const unnamed = (fx.names ?? []).filter(
        (named) => !namedIn(error.message, named),
      );
      if (unnamed.length)
        problems.push(
          `${name}: point ${fx.point} fired on its own check, and its message does not ` +
            `name ${unnamed.map((named) => `\`${named}\``).join(', ')} — a finding that ` +
            `sends a person to the wrong place, or to none`,
        );
    }
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Reach gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Reach: ${summary}. Negative control: the reference input passes, ` +
    `${cases.length} prepared ones rejected on their own points.`,
);
