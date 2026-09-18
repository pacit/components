/**
 * What a workflow's `-t` lines name — one home for a reading that four gates and
 * `scripts/before-push` answer from (0017). Five copies held it until 2026-09-19 and they
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

/** The words after `-t` on one line, up to the first option. */
const targetsAfterT = (tail) => {
  const targets = [];
  for (const word of tail.trim().split(/\s+/)) {
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
        .map((line) => line.replace(/#.*$/, ''))
        .join('\n')
        .matchAll(/nx (?:affected|run-many)[^\n]*? -t ([a-z0-9:\- \t]+)/g),
    ].flatMap((match) => targetsAfterT(match[1])),
  );

/** Whether a workflow really runs a target — the name on a line, not a word inside one. */
export const runsTarget = (text, target) => targetsIn(text).has(target);
