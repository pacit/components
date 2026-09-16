import { readFileSync } from 'node:fs';
import { test, type Page } from '@playwright/test';
import { utterances } from './orca-log';
import { routesAsked, walk, type Reader, type Step } from './walk';

/**
 * Orca with Firefox on Linux — the third reader, and the only one this project owns a machine
 * for. `tools/at-pass.sh` puts it on a display of its own and runs this file; nothing else
 * here starts a reader.
 *
 * It takes the walk the other two take, and the two seams where it differs are the whole
 * reason `Reader` has seams at all. Orca listens to the DESKTOP rather than to a driver, so
 * its Tab goes through `page.keyboard` — a reader that is asked what it said must be the one
 * that pressed the key, and a reader that hears everything must not be ([`lesson-213`] holds
 * the other half). And its speech is not available while walking: it is read afterwards out
 * of the debug file, attributed to a step by the clock stamps the walk wrote.
 */
const orca = (page: Page): Reader => ({
  // Nothing to hand back mid-walk. The renderer reads the debug file.
  spokenPhraseLog: async () => [],
  press: (key: string) => page.keyboard.press(key),
  /**
   * Longer than either Guidepup reader asks for, and the numbers are measured rather than
   * felt. A fixed window read every OTHER view at 4.5 s and again at 9 s, which already said
   * the length was not the variable; waiting for the reader's log to stop growing was worse,
   * 24 views unread against 19, because Orca writes `SPEECH OUTPUT` when it DECIDES to speak
   * and a quiet log therefore means a full queue. The alternation followed the NAVIGATION and
   * not the clock (`lesson-211`). These two stand because the pass they produce is complete;
   * do not tune them.
   */
  dwell: { load: 9000, tab: 2000 },
  /**
   * One view in, ask the reader's own log whether anything it said lands on a step of it. A
   * reader that started but never attached to the browser is silent in a way no assertion
   * about focus can see, and finding that out here costs a minute where finding it out at the
   * end costs a quarter of an hour.
   */
  afterFirstView: (steps: readonly Step[]) => {
    const debug = process.env['AT_PASS_DEBUG'];
    if (!debug) return;
    const heard = utterances(readFileSync(debug, 'utf8')).filter(
      (u: { at: number }) =>
        steps.some((step) => u.at >= step.from && u.at <= step.to),
    );
    if (!heard.length)
      throw new Error(
        `no utterance of the reader's falls inside any of the ${steps.length} step(s) of ` +
          `the first view. Its log is ${debug}; this pass stops here rather than spend a ` +
          `quarter of an hour on the other views.`,
      );
  },
});

test('Orca reads the sandbox views', async ({ page }) => {
  await walk(page, orca(page), 'tmp/at/steps.json', undefined, routesAsked());
});
