/**
 * Orca's debug file, read. It is its own module because two different programs need the same
 * reading, and a second copy of this regular expression is exactly the defect position 4.66
 * was opened on: `orca.spec.ts` beside it asks the file, on the first view only, whether the
 * reader attached to the browser at all — the check that turns a silent quarter-hour into a
 * silent minute — and `tools/at-pass.mjs` attributes every utterance to a step when it writes
 * the record. That second reader is a `.mjs` outside this project, so it imports this file by
 * its `.ts` path and Node strips the types on the way in.
 *
 * Nothing here runs a pass or writes a file. It parses one shape of line.
 */

/** Orca stamps every decision it makes; this is the one line kind that is speech. */
export const SPOKEN =
  /^(\d\d):(\d\d):(\d\d)\.(\d+) - SPEECH OUTPUT: '(.*?)'(?:\s*\{.*)?$/;

export interface Utterance {
  /** Seconds since midnight — the clock the walk stamps its steps in, and the only thing
   * that lets one be attributed to the other. */
  at: number;
  said: string;
}

/** Every utterance in the file, in the order the reader decided to say them. */
export const utterances = (debug: string): readonly Utterance[] =>
  debug.split('\n').flatMap((line) => {
    const m = SPOKEN.exec(line.trim());
    if (!m) return [];
    return [
      {
        at:
          Number(m[1]) * 3600 +
          Number(m[2]) * 60 +
          Number(m[3]) +
          Number(`0.${m[4]}`),
        said: m[5],
      },
    ];
  });
