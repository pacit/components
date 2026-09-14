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

/** The cap on tab stops per view, and the same number the Orca pass uses. */
const CAP = 12;
const DWELL_LOAD = 4500;
const DWELL_TAB = 1800;

/** What counts as a stop of the Tab key, and so as a position inside the view's content. */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

interface Reader {
  spokenPhraseLog(): Promise<string[]>;
  navigateToWebContent?: () => Promise<void>;
}

interface Step {
  route: string;
  label: string;
  focus: { what: string; inMain: boolean; at: number } | null;
  said: string[];
  note?: string;
}

const focusOf = (page: Page) =>
  page.evaluate((selector) => {
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
    const main = document.querySelector('main');
    return {
      what: `${tag}${part ? `[${part}]` : ''}${name ? ` "${name}"` : ''}`,
      inMain: !!el.closest('main'),
      at: main ? [...main.querySelectorAll(selector)].indexOf(el) : -1,
    };
  }, FOCUSABLE);

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

  for (const route of routes) {
    await step(route, 'arrive', DWELL_LOAD, async () => {
      await page.goto(route, { waitUntil: 'load' });
      // The reader starts on the browser's own chrome after a navigation; this is Guidepup's
      // way in. It is optional because not every reader in the pair exposes it.
      await reader.navigateToWebContent?.().catch(() => undefined);
    });

    const entered = await step(route, 'enter', DWELL_TAB, () =>
      page.evaluate((selector) => {
        const first = document
          .querySelector('main')
          ?.querySelector<HTMLElement>(selector);
        first?.focus();
      }, FOCUSABLE),
    );
    if (!entered?.inMain)
      steps[steps.length - 1].note =
        'no stop of its own inside `main` — nothing to walk here';

    let previous = entered?.at ?? -1;
    for (let stop = 1; entered?.inMain && stop <= CAP; stop += 1) {
      const at = await step(route, `tab ${stop}`, DWELL_TAB, () =>
        page.keyboard.press('Tab'),
      );
      if (!at?.inMain) break;
      if (at.at === previous) {
        steps[steps.length - 1].note =
          'Tab moved nothing — focus had left the page';
        break;
      }
      previous = at.at;
    }
  }

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(
    out,
    `${JSON.stringify({ cap: CAP, stack, steps }, null, 2)}\n`,
  );
}
