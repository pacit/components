#!/usr/bin/env node
/**
 * Index gate: is a list that describes a directory derived from that directory, or is it
 * somebody's memory of what it held (`req-quality-index`)? A hand-kept index drifts in
 * silence — nothing compiles it and nothing renders it — and the measurement that opened
 * this gate found the decisions index wrong in eleven of its twenty rows
 * ([`lesson-75`](../docs/lessons.md#lesson-75)).
 *
 *  1. CORPUS: the walk found decisions, fixture trees, a case table and a count to rule on,
 *  2. INDEX: `docs/decisions/README.md` is the rendering of `docs/decisions/`,
 *  3. CASES: a table of cases names every case of its tree, once, and nothing else,
 *  4. COLUMNS: a `point`, `check` or `rule` column agrees with the case's own declaration,
 *  5. COUNTS: a number written in prose equals what it counts.
 *
 * Which of the two roads a list takes is settled in
 * [0021](../docs/decisions/0021-an-index-is-derived-or-measured.md): generated where every
 * column is derivable, measured where one of them is a sentence a human writes.
 *
 * Usage:
 *   node tools/check-index.mjs           verifies (CI)
 *   node tools/check-index.mjs --write   rewrites the decisions index
 */
import {
  existsSync,
  globSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const DECISIONS = 'docs/decisions';
const INDEX = `${DECISIONS}/README.md`;
const MAP = 'docs/README.md';
const FIXTURES = join(ROOT, 'tools/check-index.fixtures');
const REFERENCE = '_reference.json';

/** Where a fixture tree may live, and where the gate it belongs to is looked for. */
const TREES = ['tools/*.fixtures', 'libs/components/*.fixtures'];
const GATES = ['tools', 'libs/components'];

/** The heading of the generated section, and the columns the generator writes. */
const SECTION = 'Index';
const HEADER = ['no', 'decision', 'implements'];

/**
 * The heading under which a fixtures README claims to list ITS WHOLE TREE. A table anywhere
 * else in the document is prose and stays unmeasured — `check-reach.fixtures` tabulates
 * "the three cases the design rests on" deliberately, and completeness cannot tell a
 * selection from a list that has lost two rows. The claim has to be written, not guessed.
 */
const CASES = 'The cases';

/** Columns of a case table this gate can read. Everything else is the human's. */
const READABLE = new Set(['point', 'check', 'rule']);

/** "runs all seven of its points" — the sentence every fixtures README opens with. */
const COUNT_SENTENCE = /runs all ([a-z]+|\d+) of its (points|checks)/;
const WORDS = [
  'zero',
  'one',
  'two',
  'three',
  'four',
  'five',
  'six',
  'seven',
  'eight',
  'nine',
  'ten',
  'eleven',
  'twelve',
];

/** "(84 entries)", "(17 ADRs)" — a count written into the map of `docs/README.md`. */
const MAP_COUNT = /^(\S+)\s.*\((\d+)\s+[A-Za-z]+\)/;

const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * A violation of one of the five points. It carries the point's identifier, not just the
 * message: the negative control has to verify that a prepared input fired ON ITS OWN point —
 * an input failing for a reason other than the one written into it proves something other
 * than what it declares.
 */
class IndexError extends Error {
  constructor(check, description) {
    super(description);
    this.check = check;
  }
}

// ── markdown ──────────────────────────────────────────────────────────────────

/** The text of a table cell: a link is its label, and the backticks are decoration. */
const cell = (raw) =>
  String(raw ?? '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`/g, '')
    .trim();

/** A case is named with or without its extension, and a directory with or without a slash. */
const bare = (name) =>
  cell(name)
    .replace(/\/$/, '')
    .replace(/\.(json|md)$/, '');

const ROW = /^\s*\|(.*)\|\s*$/;
const SEPARATOR = /^[\s|:-]+$/;

/**
 * Every markdown table of a document, as `{ header, rows }` of trimmed cells. Written here
 * rather than pulled from a parser because the input is the repository's own prose: three
 * lines of shape and no HTML, and a dependency for it would be a bump that changes what a
 * gate reads.
 */
const tables = (text) => {
  const lines = String(text ?? '').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const head = lines[i].match(ROW);
    if (!head || !ROW.test(lines[i + 1] ?? '') || !SEPARATOR.test(lines[i + 1]))
      continue;
    const cells = (line) => line.match(ROW)[1].split('|');
    const table = { header: cells(lines[i]).map(cell), rows: [] };
    for (i += 2; i < lines.length && ROW.test(lines[i]); i++)
      table.rows.push(cells(lines[i]));
    out.push(table);
  }
  return out;
};

// ── the decisions index ───────────────────────────────────────────────────────

/**
 * The index as the directory would write it. The title comes from the decision's own
 * heading and the requirements from its `Implements:` line, because those are their homes
 * (`req-project-concise`) — the index quoting a shortened version of either is the drift
 * this renderer exists to remove. A status other than `accepted` is rendered into the title
 * cell rather than into a column of its own: a column would be twenty identical cells for
 * the one row that is ever different.
 */
const renderIndex = (decisions) =>
  [
    `| ${HEADER.join(' | ')} |`,
    `| ${HEADER.map(() => '---').join(' | ')} |`,
    ...decisions.map((d) => {
      const title =
        d.status === 'accepted' ? d.title : `${d.title} — **${d.status}**`;
      const implemented = d.implements.length
        ? d.implements.map((id) => `\`${id}\``).join(', ')
        : '—';
      return `| [${d.number}](${d.file}) | ${title} | ${implemented} |`;
    }),
  ].join('\n');

/** A table compared by its cells, so alignment — prettier's business — is not a difference. */
const rows = (text) =>
  String(text ?? '')
    .split('\n')
    .filter((line) => ROW.test(line) && !SEPARATOR.test(line))
    .map((line) =>
      line
        .match(ROW)[1]
        .split('|')
        .map((c) => c.trim())
        .join(' | '),
    );

// ── the checks ────────────────────────────────────────────────────────────────

/**
 * The full set of checks over a ready input:
 *   `decisions` — one entry per decision file: number, title, status, requirements,
 *   `index`     — the text of the generated section of `docs/decisions/README.md`, or null,
 *   `trees`     — the fixture trees: their cases, their README and their gate's points,
 *   `map`       — the map block of `docs/README.md` and the counts it can be held to.
 * Throws `IndexError` on the first violation — the points run from the most basic one, so
 * the later ones would have nothing to examine anyway.
 */
const checkIndex = (input) => {
  const { decisions, index, trees, map } = input;

  // 1. The corpus. A walk that found nothing rules on nothing, and `--write` run over an
  // empty one records the emptiness as the state of the repository.
  corpus(input);

  // 2. The decisions index is the rendering of the directory.
  const untitled = decisions.filter((d) => !d.title);
  if (untitled.length)
    throw new IndexError(
      'index',
      `\`${DECISIONS}/${untitled[0].file}\` has no \`# NNNN — Title\` heading — the index ` +
        `takes the title from there, so there is nothing to render into the row`,
    );
  const want = rows(renderIndex(decisions));
  const have = rows(index);
  for (let i = 0; i < Math.max(want.length, have.length); i++) {
    if (want[i] === have[i]) continue;
    throw new IndexError(
      'index',
      `\`${INDEX}\` row ${i + 1} is not what \`${DECISIONS}/\` says:\n` +
        `      index:     ${have[i] ?? '(the row is missing)'}\n` +
        `      directory: ${want[i] ?? '(no decision behind this row)'}\n` +
        `      The index is generated — \`node tools/check-index.mjs --write\``,
    );
  }

  // 3. and 4. Every table of cases against the tree it describes.
  let tabled = 0;
  for (const tree of trees) {
    const claim = caseTable(tree);
    if (!claim) continue;
    tabled++;
    if (!claim.table)
      throw new IndexError(
        'cases',
        `\`${tree.readme_path}\` has a \`## ${CASES}\` section and no table in it — the ` +
          `heading is the claim that the tree is listed there, and it is listing nothing`,
      );
    cases(tree, claim.table);
    columns(tree, claim.table);
  }

  // 5. Every count written in prose against what it counts.
  const counted = counts(trees, map);

  return (
    `${decisions.length} decisions rendered, ${tabled} case table(s) over ` +
    `${trees.length} fixture trees, ${counted} count(s) measured`
  );
};

/** 1. CORPUS — each kind of list the later points rule on has at least one instance. */
const corpus = ({ decisions, index, trees, map }) => {
  if (!decisions.length)
    throw new IndexError(
      'corpus',
      `no decision found under \`${DECISIONS}/\` — the index would then be rendered ` +
        `empty, and a run with \`--write\` would record that as the state of the directory`,
    );
  if (index === null)
    throw new IndexError(
      'corpus',
      `\`${INDEX}\` has no \`## ${SECTION}\` section — there is nothing to compare the ` +
        `directory against, and an index deleted is not an index that agrees`,
    );
  if (!trees.length)
    throw new IndexError(
      'corpus',
      `no \`*.fixtures/\` tree found under \`${GATES.join('/`, `')}/\` — points 3 to 5 ` +
        `would pass having examined not one negative control`,
    );
  if (!trees.some((t) => caseTable(t)))
    throw new IndexError(
      'corpus',
      `not one fixtures README carries a \`## ${CASES}\` section — this gate measures the ` +
        `lists that exist, so an empty set of them makes points 3 and 4 silent`,
    );
  if (!map)
    throw new IndexError(
      'corpus',
      `\`${MAP}\` carries no map block — the counts of point 5 are read out of it`,
    );
};

/**
 * The tree's own claim to list its cases: `{ table }` under the `## ${CASES}` heading, or
 * null where the README makes no such claim. Which README has one is therefore written in
 * that README and nowhere else — a register here would be the very thing this gate abolishes.
 */
const caseTable = (tree) => {
  if (!tree.readme) return null;
  const section = sectionOf(tree.readme, CASES);
  return section === null ? null : { table: tables(section)[0] ?? null };
};

/** The body of a `## heading` section: to the next heading of the same level, or the end. */
const sectionOf = (text, heading) => {
  const from = `\n## ${heading}\n`;
  const at = `\n${text}`.indexOf(from);
  if (at < 0) return null;
  const body = `\n${text}`.slice(at + from.length);
  const next = body.indexOf('\n## ');
  return next < 0 ? body : body.slice(0, next);
};

/** 3. CASES — the table names every case, once, and names nothing that is not one. */
const cases = (tree, table) => {
  const named = table.rows.map((r) => bare(r[0]));
  const declared = tree.cases.map((c) => bare(c.name));
  const where = `\`${tree.readme_path}\``;

  const missing = declared.filter((n) => !named.includes(n));
  if (missing.length)
    throw new IndexError(
      'cases',
      `${where} does not name ${missing.length} case(s) of its own tree: ` +
        `\`${missing.join('`, `')}\` — a case outside the table is a negative control ` +
        `nobody reading the table knows about`,
    );

  const ghosts = named.filter((n) => !declared.includes(n));
  if (ghosts.length)
    throw new IndexError(
      'cases',
      `${where} names \`${ghosts.join('`, `')}\`, and \`${tree.path}/\` holds no such ` +
        `case — the table promises proof that is not in the repository`,
    );

  const twice = named.filter((n, i) => named.indexOf(n) !== i);
  if (twice.length)
    throw new IndexError(
      'cases',
      `${where} names \`${[...new Set(twice)].join('`, `')}\` more than once — one case, ` +
        `two rows, and the two can say different things`,
    );
};

/** 4. COLUMNS — what the table says about a case is what the case declares about itself. */
const columns = (tree, table) => {
  const readable = [...table.header.entries()].filter(([, name]) =>
    READABLE.has(name.toLowerCase()),
  );
  if (!readable.length) return;

  const byName = new Map(tree.cases.map((c) => [bare(c.name), c]));
  for (const row of table.rows) {
    const fixture = byName.get(bare(row[0]));
    // A case that declares nothing about itself — a prepared `.md` input, say — is compared
    // against nothing: the column is then the only account there is, not a second one.
    if (!fixture?.declares) continue;
    for (const [i, name] of readable) {
      const field = name.toLowerCase();
      const said = cell(row[i]);
      const declared = fixture[field];
      const where = `\`${tree.readme_path}\` → \`${bare(row[0])}\``;
      if (declared === null) {
        if (!said || /^[—–-]$/.test(said)) continue;
        throw new IndexError(
          'columns',
          `${where}: the \`${field}\` column says \`${said}\` and the case declares no ` +
            `${field} — the table sends the reader to something that does not exist`,
        );
      }
      if (said === String(declared)) continue;
      throw new IndexError(
        'columns',
        `${where}: the \`${field}\` column says \`${said || '(empty)'}\`, the case ` +
          `declares \`${declared}\` — a row that disagrees with its own case sends the ` +
          `reader to the wrong point of the gate`,
      );
    }
  }
};

/**
 * 5. COUNTS — a number in prose is measured against the set it counts. Two shapes carry
 * one: the sentence every fixtures README opens with, and the map of `docs/README.md`.
 */
const counts = (trees, map) => {
  let measured = 0;

  for (const tree of trees) {
    // A tree with no gate is `check-reach`'s finding, not this gate's — reporting it here
    // would be a second voice on one defect.
    if (!tree.readme || !tree.gate) continue;
    const where = `\`${tree.readme_path}\``;
    if (!tree.points)
      throw new IndexError(
        'counts',
        `the header of \`${tree.gate}\` numbers no points, or numbers them other than ` +
          `1..n — ${where} counts them, so the sentence has nothing to be measured against`,
      );
    const said = tree.readme.replace(/\s+/g, ' ').match(COUNT_SENTENCE);
    if (!said)
      throw new IndexError(
        'counts',
        `${where} does not say how many points \`${tree.gate}\` has — the sentence is ` +
          `"runs all <n> of its points", and without the number a reader cannot tell a ` +
          `gate that grew a point from one whose cases have stopped covering it`,
      );
    const declared = /^\d+$/.test(said[1])
      ? Number(said[1])
      : WORDS.indexOf(said[1]);
    if (declared < 0)
      throw new IndexError(
        'counts',
        `${where} says "runs all ${said[1]} of its ${said[2]}" — this gate reads a digit ` +
          `or one of \`${WORDS.join('`, `')}\`, and refuses to guess at the rest`,
      );
    if (declared !== tree.points.length)
      throw new IndexError(
        'counts',
        `${where} says \`${tree.gate}\` has ${declared} ${said[2]}, its header numbers ` +
          `${tree.points.length} — the negative control then describes a gate that has ` +
          `since grown or lost a point`,
      );
    measured++;
  }

  for (const line of map.text.split('\n')) {
    const found = line.match(MAP_COUNT);
    if (!found) continue;
    const [, what, declared] = found;
    const actual = map.actual[what];
    if (actual === undefined)
      throw new IndexError(
        'counts',
        `\`${MAP}\` writes a count next to \`${what}\` and this gate cannot take it — ` +
          `a number nobody counts is the state the counted ones were in. Either it gets ` +
          `a counter here, or it stops being a number`,
      );
    if (Number(declared) !== actual)
      throw new IndexError(
        'counts',
        `\`${MAP}\` says \`${what}\` holds ${declared}, the repository holds ${actual} — ` +
          `the map is the first page of the documentation and it is read as a fact`,
      );
    measured++;
  }

  return measured;
};

// ── reading the repository ────────────────────────────────────────────────────

const DECISION_FILE = /^(\d{4})-.+\.md$/;
const DECISION_TITLE = /^#\s*(\d{4})\s*—\s*(.+?)\s*$/m;
/**
 * A field of the decision's header, TO THE NEXT ONE and not to the end of its line: an
 * `Implements:` list wraps over three lines when the decision carries three requirements,
 * and a reader that stops at the first newline reports the first of them as the whole.
 */
const FIELD = (name) =>
  new RegExp(`(?:^|\\n)\\*\\*${name}:\\*\\*([\\s\\S]*?)(?=\\n\\*\\*|\\n#|$)`);

const readDecisions = () =>
  readdirSync(join(ROOT, DECISIONS))
    .filter((f) => DECISION_FILE.test(f))
    .sort()
    .map((file) => {
      const text = read(`${DECISIONS}/${file}`);
      const heading = text.match(DECISION_TITLE);
      const status = text.match(FIELD('Status'));
      const implemented = text.match(FIELD('Implements'));
      return {
        file,
        number: file.match(DECISION_FILE)[1],
        title: heading ? heading[2] : null,
        status: status ? status[1].trim() : null,
        implements: [
          ...new Set(
            [...(implemented?.[1] ?? '').matchAll(/req-[a-z][a-z0-9-]*/g)].map(
              (m) => m[0],
            ),
          ),
        ],
      };
    });

/** The generated section: from its heading to the next one of the same level, or the end. */
const readSection = (text) => sectionOf(text, SECTION);

const readTrees = () =>
  TREES.flatMap((pattern) => globSync(pattern, { cwd: ROOT }))
    .map((p) => p.split('\\').join('/'))
    .sort()
    .map((path) => {
      const name = basename(path).replace(/\.fixtures$/, '');
      const gate = GATES.map((d) => `${d}/${name}.mjs`).find((f) =>
        existsSync(join(ROOT, f)),
      );
      const readme = existsSync(join(ROOT, path, 'README.md'))
        ? `${path}/README.md`
        : null;
      return {
        path,
        gate: gate ?? null,
        points: gate ? readPoints(gate) : null,
        readme_path: readme,
        readme: readme ? read(readme) : null,
        cases: readCases(path),
      };
    });

/** The numbered points of a gate's header — the list the fixtures README counts. */
const readPoints = (gate) => {
  const header = read(gate).split('*/')[0];
  const numbers = [...header.matchAll(/^\s*\*\s+(\d+)\.\s/gm)].map((m) =>
    Number(m[1]),
  );
  return numbers.every((n, i) => n === i + 1) ? numbers : null;
};

/**
 * A case is a directory (declaring itself in `fixture.json`) or a file (a `.json` case
 * declaring itself, a `.md` one declaring nothing). `_reference` and its file form are the
 * input every case is built on, not a case.
 */
const readCases = (path) =>
  readdirSync(join(ROOT, path), { withFileTypes: true })
    .filter((e) => e.name !== 'README.md' && !e.name.startsWith('_'))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((entry) => {
      const declaration = entry.isDirectory()
        ? `${path}/${entry.name}/fixture.json`
        : `${path}/${entry.name}`;
      const declares =
        declaration.endsWith('.json') && existsSync(join(ROOT, declaration));
      const declared = declares ? JSON.parse(read(declaration)) : {};
      return {
        name: entry.name,
        declares,
        point: declared.point ?? null,
        check: declared.check ?? null,
        rule: declared.rule ?? null,
      };
    });

/** The map block of `docs/README.md`, and the counts this gate knows how to take. */
const readMap = (decisions) => {
  const text = read(MAP);
  const fence = text.match(/```\n([\s\S]*?)```/);
  if (!fence) return null;
  const anchors = (rel, prefix) =>
    [...read(rel).matchAll(new RegExp(`<a id="${prefix}-`, 'g'))].length;
  return {
    text: fence[1],
    actual: {
      'requirements/':
        anchors('docs/00-axis.md', 'req') +
        globSync('docs/requirements/*.md', { cwd: ROOT })
          .sort()
          .reduce((sum, f) => sum + anchors(f, 'req'), 0),
      'decisions/': decisions.length,
      'lessons.md': anchors('docs/lessons.md', 'lesson'),
    },
  };
};

const readInput = () => {
  const decisions = readDecisions();
  return {
    decisions,
    index: readSection(read(INDEX)),
    trees: readTrees(),
    map: readMap(decisions),
  };
};

// ── writing the index ─────────────────────────────────────────────────────────

/**
 * The generated output goes through prettier, because `nx format:check` covers `docs/`.
 * Without it two gates would want different shapes of the same file: the formatter would
 * realign the table after every `--write` and point 2 compares cells, not columns, so the
 * drift would be invisible here and loud there.
 */
const writeIndex = async (decisions) => {
  const prettier = await import('prettier');
  const text = read(INDEX);
  const section = readSection(text);
  // Replaced through a function: a `$&` in a decision's title is a substitution pattern to
  // `String.replace` and a perfectly ordinary character everywhere else.
  const rewritten = text.replace(
    section,
    () => `\n${renderIndex(decisions)}\n`,
  );
  writeFileSync(
    join(ROOT, INDEX),
    await prettier.format(rewritten, {
      ...(await prettier.resolveConfig(join(ROOT, INDEX))),
      filepath: INDEX,
    }),
  );
  console.log(`✓ Wrote ${INDEX} — ${decisions.length} decisions`);
};

// ── negative control ──────────────────────────────────────────────────────────

const readFixture = (name) =>
  JSON.parse(readFileSync(join(FIXTURES, name), 'utf8'));

/**
 * Builds a case's input ON A COPY of the reference one, so the case file holds nothing but
 * its own defect — you cannot break something in passing and not notice.
 *
 * The index is not written into a case: `@render` is the directory's own rendering after the
 * case's edits, `@stale` the one from before them. A case therefore says WHICH SIDE MOVED
 * rather than carrying a copy of the table — a copy would drift from the renderer, which is
 * the very defect this gate was opened for.
 */
const buildFixture = (fx) => {
  const input = structuredClone(readFixture(REFERENCE).input);
  const stale = renderIndex(input.decisions);

  input.decisions = input.decisions.filter(
    (d) => !(fx.dropDecisions ?? []).includes(d.file),
  );
  for (const patch of fx.decisions ?? []) {
    const target = input.decisions.find((d) => d.file === patch.file);
    if (target) Object.assign(target, patch);
    else input.decisions.push(patch);
  }
  input.decisions.sort((a, b) => a.file.localeCompare(b.file));
  if (fx.index !== undefined) input.index = fx.index;
  if (input.index === '@render') input.index = renderIndex(input.decisions);
  else if (input.index === '@stale') input.index = stale;

  input.trees = input.trees.filter(
    (t) => !(fx.dropTrees ?? []).includes(t.path),
  );
  for (const patch of fx.trees ?? []) {
    const target = input.trees.find((t) => t.path === patch.path);
    if (!target) continue;
    for (const name of patch.dropCases ?? [])
      target.cases = target.cases.filter((c) => c.name !== name);
    for (const c of patch.cases ?? []) target.cases.push(c);
    if (patch.readme !== undefined) target.readme = patch.readme;
    if (patch.points !== undefined) target.points = patch.points;
  }

  if (fx.map !== undefined) input.map = fx.map;
  if (fx.mapText !== undefined) input.map.text = fx.mapText;
  Object.assign(input.map?.actual ?? {}, fx.mapActual ?? {});
  return input;
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let summary = null;

if (WRITE) {
  const decisions = readDecisions();
  corpus({ ...readInput(), decisions });
  await writeIndex(decisions);
}

try {
  summary = checkIndex(readInput());
} catch (error) {
  if (!(error instanceof IndexError)) throw error;
  problems.push(`${error.check}: ${error.message}`);
}

const prepared = readdirSync(FIXTURES)
  .filter((n) => n.endsWith('.json') && n !== REFERENCE)
  .sort();

if (!prepared.length)
  problems.push(
    `tools/check-index.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were it defective itself, every case would fire because of
// it rather than because of its own defect — and every "it fired" would be false.
try {
  checkIndex(buildFixture({}));
} catch (error) {
  if (!(error instanceof IndexError)) throw error;
  problems.push(
    `${REFERENCE}: the reference input does NOT pass (${error.check}) — ` +
      `every prepared case now fires because of it.\n    ${error.message}`,
  );
}

for (const name of prepared) {
  const fx = readFixture(name);
  try {
    checkIndex(buildFixture(fx));
    problems.push(
      `${name}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.point} (\`${fx.check}\`) stopped examining anything`,
    );
  } catch (error) {
    if (!(error instanceof IndexError)) throw error;
    if (error.check !== fx.check)
      problems.push(
        `${name}: check \`${error.check}\` fired, and point ${fx.point} ` +
          `(\`${fx.check}\`) was meant to — the fixture proves something other than what ` +
          `it declares`,
      );
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Index gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Index: ${summary}. Negative control: the reference input passes, ` +
    `${prepared.length} prepared ones rejected on their own points.`,
);
