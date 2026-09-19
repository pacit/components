/**
 * What a workflow's `-t` lines name — one home for a reading that four gates and
 * `scripts/before-push` answer from (0017). Six copies held it until 2026-09-19 and they
 * disagreed; the line that broke them is the sharded one (0081). Four rules, four defects:
 *
 *  1. COMMENTS GO FIRST: these workflows explain every step of their own in prose, so a
 *     sentence about a target reads to a pattern as a call to it (`lesson-56`) — 0081's
 *     comment let `check-acr` answer for a run line that had been deleted.
 *  2. THE CLASS STOPS AT THE LINE: with `\s` in it a match ran past the newline and took the
 *     `- run: npx nx run-many -t` of the next step for four targets.
 *  3. OPTIONS MAY COME FIRST: a reader wanting `-t` beside the command sees nothing on a
 *     sharded line, then says nothing, every rule downstream being one-sided.
 *  4. THE LIST ENDS AT THE FIRST OPTION: a dash-word is an option wherever it stands, and
 *     stopping keeps `--exclude docs` from leaving `docs` behind as a target.
 * `run-many` is read beside `affected`: one form alone is half a repository's CI.
 */

import { readFileSync } from 'node:fs';
import { realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

/**
 * The words after `-t` on one line, up to the first option. Spelt four ways that nx accepts
 * and this repository does not use — `--targets`, `-t=lint`, `-t "lint test"`, `-t a,b` —
 * because a spelling the reader does not know takes targets OFF the local battery without a
 * word, and short is the direction that goes quiet.
 */
const targetsAfterT = (tail) => {
  const targets = [];
  for (const word of tail.trim().split(/[,\s]+/)) {
    if (!word) continue;
    if (word.startsWith('-')) break;
    targets.push(word);
  }
  return targets;
};

/** Every target the `nx affected` / `nx run-many` lines of a workflow name, as a Set. */
export const targetsIn = (text) =>
  new Set(
    [
      ...String(text ?? '')
        .split('\n')
        .map((line) => line.replace(/#.*$/m, ''))
        .join('\n')
        .matchAll(
          /nx\s+(?:affected|run-many)[^\n]*?\s(?:-t|--targets)[= ]\s*['"]?([a-z0-9:,\- \t]+)/g,
        ),
    ].flatMap((match) => targetsAfterT(match[1])),
  );

/** Whether a workflow really runs a target — the name on a line, not a word inside one. */
export const runsTarget = (text, target) => targetsIn(text).has(target);

/*
 * Run directly, it prints one target per line for the workflow files named — the form
 * `scripts/before-push` reads. That script held a sixth copy of this reading until the review
 * of 0081 measured the two apart: its own pattern wanted the literal `npx nx` and never
 * stripped a comment, so a comment naming a target put a phantom on the local battery and a
 * line spelled `nx run-many` took two targets off it, both without a word.
 *
 * A line that runs nx and carries no `-t` is an error here rather than a line passed over:
 * the caller is about to run whatever comes back, and a list that is short still goes green.
 */
/** The resolved path, or the path as given when there is nothing at it to resolve. */
const realpathOf = (path) => {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
};

// `realpathSync` and not the argument as typed: a worktree reaches this file through a
// symlink, and a comparison of the resolved URL with an unresolved path is then false — the
// block would not run, the caller would read an empty list, and the error it printed would
// name the wrong file.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(realpathOf(process.argv[1])).href
) {
  const files = process.argv.slice(2);
  if (!files.length) {
    console.error('usage: node tools/workflow-targets.mjs <workflow.yml> …');
    process.exit(2);
  }
  const targets = new Set();
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      console.error(
        `::error::cannot read ${file} — a target list was to be taken out of it.`,
      );
      process.exit(2);
    }
    // A line that runs nx and yields no target — asked of the READER and not of a second
    // pattern, so a spelling the reader understands cannot be an error here and a spelling
    // it does not understand cannot pass as a line with nothing to run.
    const mute = text
      .split('\n')
      .map((line) => line.replace(/#.*$/m, ''))
      .filter(
        (line) =>
          /nx\s+(?:affected|run-many)/.test(line) && !targetsIn(line).size,
      );
    if (mute.length) {
      console.error(
        `::error::a line of ${file} runs nx and names no target with \`-t\`, so what it ` +
          `runs cannot be read:\n    ${mute.map((l) => l.trim()).join('\n    ')}`,
      );
      process.exit(3);
    }
    for (const target of targetsIn(text)) targets.add(target);
  }
  console.log([...targets].join('\n'));
}
