import type { Locator, Page } from '@playwright/test';

/**
 * Helpers for DOM queries in the e2e tests.
 *
 * Playwright returns `null` from `boundingBox()` (an invisible element) and from
 * `getAttribute()` (no attribute). In a test both cases mean a defect, so instead
 * of `!` we throw with a description — otherwise we get "Cannot read properties of
 * null (reading 'width')" with no hint as to which element it was.
 *
 * The file deliberately has no `.spec.` in its name, so Playwright does not collect
 * it (`testMatch` matches only `*.spec.*` / `*.test.*` by default).
 */

/**
 * The "hydration" family of codes from Angular's error catalogue (NG0500–NG05xx):
 * a server tree that does not match the client one, missing nodes, unsupported
 * content projection. The pattern covers the whole family on purpose — a new code
 * from that pool is to fire the gate at once, with nothing added here.
 */
const HYDRATION_ERROR = /NG05\d\d/;

interface PageProblems {
  readonly hydration: string[];
  readonly uncaught: string[];
}

const WATCHED = new WeakMap<Page, PageProblems>();

/**
 * Attaches a listener for the console and for uncaught exceptions — once per page.
 *
 * The listener has to start BEFORE `goto()`, because a hydration error is thrown
 * during the first hydration and nobody repeats it afterwards.
 */
function watch(page: Page): PageProblems {
  const known = WATCHED.get(page);
  if (known) return known;

  const problems: PageProblems = { hydration: [], uncaught: [] };
  WATCHED.set(page, problems);

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (HYDRATION_ERROR.test(text)) problems.hydration.push(text);
  });
  page.on('pageerror', (err) => {
    const text = `${err.name}: ${err.message}`;
    (HYDRATION_ERROR.test(text) ? problems.hydration : problems.uncaught).push(
      text,
    );
  });

  return problems;
}

/** The hydration errors collected on this page (for the control test of the gate). */
export function hydrationErrors(page: Page): readonly string[] {
  return watch(page).hydration;
}

/** Uncaught exceptions that are not hydration errors. */
export function uncaughtErrors(page: Page): readonly string[] {
  return watch(page).uncaught;
}

/**
 * Entering a sandbox page — it waits for hydration, not for `load` alone.
 *
 * `goto()` on its own finishes once the HTML from the server stands in the DOM. A
 * click or a `fill` in that window hits a dead DOM, and hydration overwrites the
 * result with the state from the model — the symptom looks like a defect in a
 * component ("the value I typed went back to the initial one") while it is a race
 * in the test. The shell exposes a marker after `whenStable()`.
 *
 * In passing this is the HYDRATION GATE (req-quality-hydration / req-project-ssr):
 * a server tree that does not match the client one does not knock the page over —
 * Angular logs NG0500 and quietly recreates the subtree. So the whole e2e suite so
 * far went green even when SSR really did drift apart (exactly the class of defect
 * from lesson-31). Since every test enters the page through `visit()` anyway, the
 * check sits here and covers every view at once, instead of waiting to be added to
 * each spec separately.
 */
export interface VisitOptions {
  /**
   * Emulation of the system preferences, set BEFORE entering the page — otherwise
   * the first render goes on the default values.
   *
   * Mind you: this has to be `page.emulateMedia()` and NOT `test.use({ reducedMotion })`
   * or `test.use({ forcedColors })`. In Playwright 1.61.1 those two options given
   * through `test.use` do not reach the context — `matchMedia(...)` in the page then
   * returns `false` and the test passes, because it measures the base values instead
   * of the ones under the media query. A gate that checks nothing is worse than no
   * gate, so we set the emulation explicitly and check in the test that it really
   * did take (`matchMedia`).
   * `colorScheme` through `test.use` works, but we keep all three axes together here
   * so nobody has to remember which is which.
   */
  media?: Parameters<Page['emulateMedia']>[0];
  /**
   * The instant the page's own clock starts at, set BEFORE entering it.
   *
   * A calendar is the one control here whose DRAWING depends on the wall clock: today
   * carries a ring, and which cell that is moves every midnight — so a screenshot of one,
   * or an assertion about the ring, is a test that passes for eleven months of the year and
   * goes red in the twelfth with nothing having changed. Given, the clock is fixed and the
   * question stops being about the day the suite happens to run on.
   *
   * `setFixedTime` and not `install`: `install` fakes the timers as well, and this
   * repository's panels are timed by real transitions (`pctAfterTransition`) — a faked
   * `setTimeout` would take the enter/leave waits down with it. What is wanted here is
   * `new Date()`, and nothing else.
   */
  now?: string;
}

export async function visit(
  page: Page,
  path = '/',
  options: VisitOptions = {},
): Promise<void> {
  const problems = watch(page);
  if (options.media) await page.emulateMedia(options.media);
  if (options.now) await page.clock.setFixedTime(new Date(options.now));
  await page.goto(path);
  await page.locator('html[data-sbx-ready]').waitFor();
  // The sandbox pins its own font (vendored Inter — see styles.scss), and the pin is
  // deterministic only once the file has ARRIVED: a metric read during the fallback's
  // frames is the old per-machine measurement wearing the new name.
  await page.evaluate(() => document.fonts.ready.then(() => undefined));

  if (problems.hydration.length) {
    throw new Error(
      `Hydration error on ${path} (SSR drifted apart from the client):\n  - ` +
        problems.hydration.join('\n  - '),
    );
  }
}

/**
 * Waits for every transition and every finite animation on the page to finish, and returns
 * how many there were to wait for.
 *
 * A panel here fades in (`opacity` from `@starting-style`) and a pressed trigger's background
 * travels back, both over the motion axis's duration — and `toBeVisible()` resolves the
 * moment the panel has any opacity at all. Measured in three engines: at that moment two
 * transitions are running at 0–35% of their way, so anything that reads COMPOSED colours
 * then — an axe contrast rule, a screenshot — reads a state no user rests in, and reads a
 * different one on every run — `panel-apply`'s label read 4.09:1 in firefox and webkit at
 * once, a pair that is no resting state of the button.
 *
 * A reduced-motion context was the other road to a stable audit and is refused: it audits a
 * state most users never see. Waiting for the page to settle measures the one they do.
 *
 * Every animation is asked, not a named one: the thing settled here is the PAGE, and a case
 * should not have to know which of the library's transitions its click set off. Infinite
 * ones — a spinner's loop, the hero's drift — are left running, because they never finish and
 * they are the resting state; `finished` rejects when an animation is cancelled (its element
 * removed), and a cancelled animation is settled too.
 */
export async function settled(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const finite = document
      .getAnimations()
      .filter((a) =>
        Number.isFinite(a.effect?.getComputedTiming().endTime ?? Infinity),
      );
    await Promise.all(finite.map((a) => a.finished.catch(() => undefined)));
    return finite.length;
  });
}

/**
 * Switches the sandbox to right-to-left writing — through the settings bar, that is
 * the way a person would do it, not by injecting an attribute. The difference
 * matters: a `dir` set from outside would check the CSS alone, while this way it is
 * also checked that the axis is wired up at all and that it reaches the card stage.
 *
 * It waits for `app-root[dir="rtl"]`, because the click returns before the layout is
 * recomputed, and a geometry measurement taken in that window measures the state
 * from before the mirroring.
 */
export async function setRtl(page: Page): Promise<void> {
  await page
    .getByTestId('global-controls')
    .getByTestId('control-dir')
    .getByRole('radio', { name: 'rtl' })
    .check();
  await page.locator('app-root[dir="rtl"]').waitFor();
}

/** The rectangle of an element; `boundingBox()` has no publicly exported type. */
type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

/** The rectangle of an element; throws when the element is not visible. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(
      `No rectangle for ${locator} — the element is not visible.`,
    );
  }
  return box;
}

/** The value of an attribute; throws when there is none. */
export async function attrOf(locator: Locator, name: string): Promise<string> {
  const value = await locator.getAttribute(name);
  if (value === null) {
    throw new Error(`Element ${locator} has no "${name}" attribute.`);
  }
  return value;
}
