#!/usr/bin/env node
/**
 * Rewrites the citations in the built package onto the documentation site.
 *
 * The sources cite a requirement, a lesson or a decision by repository path —
 * `[`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform)` — which
 * reads in this tree and nowhere else: in a consumer's `node_modules` that path is nobody's
 * file, and a bare `(req-a11y-built-in)` is a word. ng-packagr copies the JSDoc into the
 * `.d.ts` and part of it into the bundles, so this runs over `dist` after the build and
 * turns every citation into the address the site answers at (decision 0078): the origin
 * from `apps/docs/public/CNAME`, the one home of the hostname, and the anchors `/trust/`
 * renders — `#req-*`, `#lesson-*`, `#adr-NNNN` — with the trailing slash the host serves.
 *
 * The sources stay as they are: a path an editor can follow is the right form there, and
 * the hostname written into a hundred files would be a hundred homes for one fact.
 * `check-package.mjs` point 9 reads the artefact for what this missed — a relative path,
 * a bare identifier, a foreign host — so a shape the patterns below do not know fails the
 * gate rather than shipping. Idempotent: a second run changes nothing.
 *
 * Usage: node libs/components/link-citations.mjs
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DIST = join(HERE, '../../dist/libs/components');
const CNAME = join(HERE, '../../apps/docs/public/CNAME');

const cname = readFileSync(CNAME, 'utf8').trim();
if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(cname)) {
  console.error(
    `X apps/docs/public/CNAME holds "${cname}", which is not a hostname.`,
  );
  process.exit(1);
}
const ORIGIN = `https://${cname}`;
const TRUST = `${ORIGIN}/trust/#`;

/** The files ng-packagr writes JSDoc into: the types, and the bundles. */
const walk = (dir) =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const files = walk(DIST).filter(
  (p) =>
    (p.includes('/types/') && p.endsWith('.d.ts')) ||
    (p.includes('/fesm2022/') && p.endsWith('.mjs')),
);

/** A repository path inside a markdown link, resolved onto the site — or refused. */
const target = (path, where) => {
  const requirement = path.match(
    /^requirements\/[a-z0-9-]+\.md#(req-[a-z0-9-]+)$/,
  );
  if (requirement) return TRUST + requirement[1];
  // The axis is a requirement too, in a file of its own; /trust renders it under `req-axis`.
  if (/^00-axis\.md(#req-axis)?$/.test(path)) return `${TRUST}req-axis`;
  const lesson = path.match(/^lessons\.md#(lesson-\d+)$/);
  if (lesson) return TRUST + lesson[1];
  const adr = path.match(/^decisions\/(\d{4})-[^#]*\.md$/);
  if (adr) return `${TRUST}adr-${adr[1]}`;
  const card = path.match(/^components\/([a-z-]+)\.md$/);
  if (card) return `${ORIGIN}/components/${card[1]}/`;
  console.error(
    `X ${where}: a citation of \`docs/${path}\` that the site has no address for — ` +
      `teach link-citations.mjs the shape, or cite something the site renders.`,
  );
  process.exit(1);
};

const cite = (id) => `[\`${id}\`](${TRUST}${id})`;

let links = 0;
let bare = 0;
let touched = 0;
for (const path of files) {
  const before = readFileSync(path, 'utf8');
  const where = relative(DIST, path);
  const after = before
    // 1. `](../../docs/<path>)` — the repository-relative link.
    .replace(/\]\((?:\.\.\/)+docs\/([^)\s]+)\)/g, (_, p) => {
      links += 1;
      return `](${target(p, where)})`;
    })
    // 2. `` `req-x` `` in backticks and not already a link's text.
    .replace(/(?<!\[)`((?:req|lesson)-[a-z0-9-]+)`(?!\]\()/g, (_, id) => {
      bare += 1;
      return cite(id);
    })
    // 3. `req-x` bare — not in a link, not behind `#`, `/`, `-` or a word character.
    .replace(/(?<![[`#/\w-])((?:req|lesson)-[a-z0-9-]+)(?![\w-])/g, (_, id) => {
      bare += 1;
      return cite(id);
    });
  if (after !== before) {
    writeFileSync(path, after);
    touched += 1;
  }
}
console.log(
  `✓ Citations: ${links} link(s) and ${bare} bare identifier(s) rewritten onto ${ORIGIN} ` +
    `in ${touched} of ${files.length} files.`,
);
