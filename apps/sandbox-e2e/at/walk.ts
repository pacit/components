import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from '@playwright/test';
import { SBX_ROUTES } from '../src/support/views';

/**
 * THE walk — one file, all three readers. Load a view, put focus on its first stop, then Tab
 * until focus leaves the content. Three logs comparable with each other are worth more than
 * three logs each taken the way its own reader likes best.
 *
 * It was two files until 2026-09-16, and the second was made by copying the first: every one
 * of the four defects found in the Orca walk that day was in the copy as well, and each had
 * to be fixed twice by hand. The second time is the one a person forgets (position 4.66).
 *
 * What a reader brings is behind `Reader`, and the three differ in every seam of it. Orca
 * hears the desktop, so its Tab goes through `page.keyboard` and its speech is read out of a
 * debug file AFTER the walk — it hands back nothing here, and the clock stamps on each step
 * are what the renderer attributes its utterances by. The two Guidepup readers are ASKED, so
 * their Tab must go through the reader itself and a step carries what it said.
 */

/** The cap on a view's OWN tab stops, and the same number the Orca pass uses. */
const CAP = 12;
/** A ceiling on presses: the scaffold spends three a demo block, so twice the cap reaches it. */
const PRESSES = CAP * 2;
/** The waits a reader driven through Guidepup needs. Orca asks for its own, and longer. */
const DWELL_LOAD = 4500;
const DWELL_TAB = 1800;

/**
 * The sandbox's scaffold, inside `main` and repeated at every demo block. Under Orca it was
 * 218 of 390 walked stops — more than half the reading spent re-reading one radio group, and
 * what the cap was biting on. Its stops are pressed and written down; they do not spend the
 * budget.
 */
const SCAFFOLD = 'sbx-controls';

/** What counts as a stop of the Tab key. `summary` is focusable with no attribute saying so. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),summary,[contenteditable],audio[controls],video[controls],' +
  '[tabindex]:not([tabindex="-1"])';

export interface Reader {
  spokenPhraseLog(): Promise<string[]>;
  /**
   * The Tab press goes through the READER and not through `page.keyboard`, and the difference
   * is the whole reading. Driven from Playwright, the browser moves focus and the reader's
   * spoken log does not grow at all: the first NVDA record taken this way was silent at 23 of
   * its 24 stops, with only `arrive` speaking — and `arrive` is the one step that issues a
   * reader command (`navigateToWebContent`). Guidepup's own examples drive every movement
   * with the reader. A keystroke the reader did not make is a keystroke it cannot report.
   */
  press(key: string): Promise<void>;
  navigateToWebContent?: () => Promise<void>;
  /**
   * How long to stand still after a load and after a Tab. Orca overrides both: it is a
   * separate process on a bus, and what it has not finished saying when the next key lands
   * it does not say at all. Do not tune these — the alternation they were once blamed for
   * was a document load per view (`lesson-211`).
   */
  dwell?: { load: number; tab: number };
  /**
   * Run once, after the first view. A reader read from a log can be silent for a reason
   * nothing here can see, and finding that out on view 1 rather than on view 36 is the
   * difference between a minute and a quarter of an hour. Throwing stops the walk.
   */
  afterFirstView?: (steps: readonly Step[]) => void | Promise<void>;
}

export interface Step {
  route: string;
  label: string;
  /** Seconds since midnight, either side of the step: the window an utterance falls into. */
  from: number;
  to: number;
  focus: {
    what: string;
    inMain: boolean;
    scaffold: boolean;
    moved: boolean;
  } | null;
  said: string[];
  note?: string;
}

/** Seconds since midnight — the clock Orca's own debug log is stamped in, and nothing else. */
const clock = (date = new Date()) =>
  date.getHours() * 3600 +
  date.getMinutes() * 60 +
  date.getSeconds() +
  date.getMilliseconds() / 1000;

const focusOf = (page: Page) =>
  page.evaluate((scaffold) => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body || el === document.documentElement)
      return null;
    const raw =
      el.getAttribute('aria-label') ?? el.innerText ?? el.textContent ?? '';
    const one = raw.trim().split('\n')[0].replace(/\s+/g, ' ').trim();
    const name =
      one.length <= 40 ? one : `${one.slice(0, 40).replace(/\s+\S*$/, '')}…`;
    const tag = el.tagName.toLowerCase();
    const part = el.getAttribute('data-pct-part');
    // Whether Tab moved is asked of the ELEMENT. A position in a selector's list cannot
    // answer it: everything the selector misses shares the index -1, so two such stops in a
    // row read as one that never moved.
    const held = window as unknown as { __atPassPrevious?: Element | null };
    const moved = el !== held.__atPassPrevious;
    held.__atPassPrevious = el;
    return {
      what: `${tag}${part ? `[${part}]` : ''}${name ? ` "${name}"` : ''}`,
      inMain: !!el.closest('main'),
      scaffold: !!el.closest(scaffold),
      moved,
    };
  }, SCAFFOLD);

/**
 * The routes a dispatch asked for. `workflow_dispatch` substitutes an input's DEFAULT when it
 * is handed an empty value, so "every view" cannot be said by saying nothing — a dispatch with
 * `routes=` walked one view and reported it as a full pass. It is said with `all`, and the
 * cheap single-view default stays what a careless dispatch gets.
 */
export const routesAsked = (): readonly string[] | undefined => {
  const raw = process.env['AT_PASS_ROUTES']?.trim();
  if (!raw || raw === 'all') return undefined;
  return raw
    .split(',')
    .map((route) => route.trim())
    .filter(Boolean);
};

export async function walk(
  page: Page,
  reader: Reader,
  out: string,
  stack: string | undefined,
  only?: readonly string[],
): Promise<void> {
  const routes = only?.length ? only : SBX_ROUTES;
  const load = reader.dwell?.load ?? DWELL_LOAD;
  const tab = reader.dwell?.tab ?? DWELL_TAB;
  const steps: Step[] = [];
  let heard = (await reader.spokenPhraseLog()).length;

  const step = async (
    route: string,
    label: string,
    dwell: number,
    act: () => Promise<unknown>,
  ) => {
    const from = clock();
    await act();
    await page.waitForTimeout(dwell);
    const log = await reader.spokenPhraseLog();
    const said = log
      .slice(heard)
      .map((s) => String(s).trim())
      .filter(Boolean);
    heard = log.length;
    const focus = await focusOf(page).catch(() => null);
    steps.push({ route, label, from, to: clock(), focus, said });
    return focus;
  };

  // The document is loaded ONCE, and every view after it is reached through the sandbox's
  // own navigation. With a `goto` per view Orca read views 2, 4, 6 ... 36 and nothing else,
  // and four visits to a single route read, missed, read, missed: it is the document load a
  // reader loses, not the view (`lesson-211`).
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(load);

  for (const [index, route] of routes.entries()) {
    process.stderr.write(
      `  [${String(index + 1).padStart(2)}/${routes.length}] ${route}\n`,
    );
    await step(route, 'arrive', load, async () => {
      await page.click(`nav a[href="${route}"]`);
      await page.waitForFunction((r) => location.pathname === r, route, {
        timeout: 15_000,
      });
      // The reader starts on the browser's own chrome after a navigation; this is Guidepup's
      // way in. It is optional because not every reader in the pair exposes it.
      await reader.navigateToWebContent?.().catch(() => undefined);
    });

    const entered = await step(route, 'enter', tab, () =>
      page.evaluate(
        ([selector, scaffold]) => {
          (
            window as unknown as { __atPassPrevious?: Element | null }
          ).__atPassPrevious = null;
          const stops = [
            ...(document
              .querySelector('main')
              ?.querySelectorAll<HTMLElement>(selector) ?? []),
          ];
          // The view's own first stop, not the shell's: every view opens on the same three
          // switches otherwise, and three of twelve is a quarter of the reading.
          const first = stops.find((el) => !el.closest(scaffold)) ?? stops[0];
          first?.focus();
        },
        [FOCUSABLE, SCAFFOLD] as const,
      ),
    );
    if (!entered?.inMain)
      steps[steps.length - 1].note =
        'no stop of its own inside `main` — nothing to walk here';

    let own = entered && !entered.scaffold ? 1 : 0;
    let pressed = 0;
    while (entered?.inMain && own < CAP && pressed < PRESSES) {
      pressed += 1;
      const at = await step(route, `tab ${pressed}`, tab, () =>
        reader.press('Tab'),
      );
      if (!at?.inMain) break;
      if (!at.moved) {
        steps[steps.length - 1].note =
          'Tab moved nothing — focus had left the page';
        break;
      }
      if (!at.scaffold) own += 1;
    }
    // Written where it bit, by the walk that bit. The renderer reads this note: inferring a
    // cap from a row count held only while every stop spent a unit of the same budget.
    if (own >= CAP)
      steps[steps.length - 1].note =
        `the cap bit: ${CAP} stops of this view's own, and it has more`;
    else if (pressed >= PRESSES)
      steps[steps.length - 1].note =
        `${PRESSES} presses reached, ${own} of them this view's own`;

    if (index === 0) await reader.afterFirstView?.(steps);
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify(
      { cap: CAP, stack, browser: page.context().browser()?.version(), steps },
      null,
      2,
    )}\n`,
  );
}
