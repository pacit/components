import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { Page } from '@playwright/test';
import { SBX_ROUTES } from '../src/support/views';

/**
 * The walk both readers take, and deliberately the same one Orca takes under
 * `tools/at-pass.sh`: load a view, put focus on its first stop, then Tab until focus leaves
 * the content. Three logs comparable with each other are worth more than three logs each
 * taken the way its own reader likes best.
 *
 * What differs is only where the speech comes from. Orca is read out of its debug file after
 * the fact; these readers are asked, so a step carries `said` and the renderer skips the
 * clock entirely.
 */

/** The cap on a view's OWN tab stops, and the same number the Orca pass uses. */
const CAP = 12;
/** A ceiling on presses: the scaffold spends three a demo block, so twice the cap reaches it. */
const PRESSES = CAP * 2;
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

interface Reader {
  spokenPhraseLog(): Promise<string[]>;
  navigateToWebContent?: () => Promise<void>;
}

interface Step {
  route: string;
  label: string;
  focus: {
    what: string;
    inMain: boolean;
    scaffold: boolean;
    moved: boolean;
  } | null;
  said: string[];
  note?: string;
}

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

export async function walk(
  page: Page,
  reader: Reader,
  out: string,
  stack: string,
  only?: readonly string[],
): Promise<void> {
  const routes = only?.length ? only : SBX_ROUTES;
  const steps: Step[] = [];
  let heard = (await reader.spokenPhraseLog()).length;

  const step = async (
    route: string,
    label: string,
    dwell: number,
    act: () => Promise<unknown>,
  ) => {
    await act();
    await page.waitForTimeout(dwell);
    const log = await reader.spokenPhraseLog();
    const said = log
      .slice(heard)
      .map((s) => String(s).trim())
      .filter(Boolean);
    heard = log.length;
    const focus = await focusOf(page).catch(() => null);
    steps.push({ route, label, focus, said });
    return focus;
  };

  // The document is loaded ONCE, and every view after it is reached through the sandbox's
  // own navigation. With a `goto` per view Orca read views 2, 4, 6 ... 36 and nothing else,
  // and four visits to a single route read, missed, read, missed: it is the document load a
  // reader loses, not the view (`lesson-211`).
  await page.goto('/', { waitUntil: 'load' });
  await page.waitForTimeout(DWELL_LOAD);

  for (const route of routes) {
    await step(route, 'arrive', DWELL_LOAD, async () => {
      await page.click(`nav a[href="${route}"]`);
      await page.waitForFunction((r) => location.pathname === r, route, {
        timeout: 15_000,
      });
      // The reader starts on the browser's own chrome after a navigation; this is Guidepup's
      // way in. It is optional because not every reader in the pair exposes it.
      await reader.navigateToWebContent?.().catch(() => undefined);
    });

    const entered = await step(route, 'enter', DWELL_TAB, () =>
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
      const at = await step(route, `tab ${pressed}`, DWELL_TAB, () =>
        page.keyboard.press('Tab'),
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
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify({ cap: CAP, stack, steps }, null, 2)}\n`,
  );
}
