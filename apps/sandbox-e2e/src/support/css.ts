import type { Locator, Page } from '@playwright/test';
import type { PctCssVar } from '@pacit/tokens';

/**
 * Reading the values COMPUTED by the browser.
 *
 * The tests of the system preferences (`prefers-reduced-motion`, `prefers-color-scheme`,
 * `forced-colors`) cannot check what stands in the stylesheet — the stylesheet
 * always holds both branches. What matters is which of them the browser actually
 * applied, so every finding in these files is a `getComputedStyle` measurement, not
 * a reading of the source.
 *
 * The file deliberately has no `.spec.` in its name, so Playwright does not collect it.
 */

/** The computed value of a given CSS property. */
export function styleOf(locator: Locator, property: string): Promise<string> {
  return locator.evaluate(
    (el, prop) => getComputedStyle(el).getPropertyValue(prop).trim(),
    property,
  );
}

/**
 * The value of a custom property as inherited at a given element.
 *
 * The token name is typed (`PctCssVar` from the generated `tokens.ts`), not any
 * string at all, because `getPropertyValue` on a property that does not exist
 * returns **an empty string, not an error**. A test comparing two such readings then
 * passes on `'' === ''` and says nothing about having measured nothing — the same
 * class of silent defect as `lesson-38`, only brought on by a typo.
 */
export function tokenOf(locator: Locator, token: PctCssVar): Promise<string> {
  return styleOf(locator, token);
}

/** The value of a custom property on `:root` — the reference point for the page theme. */
export function rootToken(page: Page, token: PctCssVar): Promise<string> {
  return page.evaluate(
    (t) =>
      getComputedStyle(document.documentElement).getPropertyValue(t).trim(),
    token,
  );
}

/**
 * A CSS time in milliseconds. The browser normalises `150ms` to `0.15s` and `0.01ms`
 * to `0.00001s`, so comparing strings is brittle — it is the number we are after.
 */
export function msOf(cssTime: string): number {
  const value = parseFloat(cssTime);
  if (Number.isNaN(value)) {
    throw new Error(`Cannot read a CSS time from "${cssTime}".`);
  }
  return cssTime.trim().endsWith('ms') ? value : value * 1000;
}

/** The time of the first value on a list (`transition-duration` for several properties, say). */
export async function firstDurationMs(
  locator: Locator,
  property: 'transition-duration' | 'animation-duration',
): Promise<number> {
  const raw = await styleOf(locator, property);
  return msOf(raw.split(',')[0]);
}

/** The system colour names the library uses in forced-colors mode. */
export const SYSTEM_COLORS = [
  'Canvas',
  'CanvasText',
  'Field',
  'FieldText',
  'GrayText',
  'Highlight',
  'HighlightText',
  'SelectedItem',
  'SelectedItemText',
] as const;

export type SystemColor = (typeof SYSTEM_COLORS)[number];

/**
 * Resolves the system palette keywords to concrete `rgb(...)` values.
 *
 * The palette depends on the high-contrast theme the user picked, so a test cannot
 * assume any value — it has to read it from the same browser in which it measures
 * the components.
 */
export async function systemColors(
  page: Page,
): Promise<Record<SystemColor, string>> {
  return page.evaluate(
    (names) => {
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.append(probe);
      const out = {} as Record<string, string>;
      for (const name of names) {
        probe.style.color = name;
        out[name] = getComputedStyle(probe).color;
      }
      probe.remove();
      return out;
    },
    SYSTEM_COLORS as readonly string[],
  ) as Promise<Record<SystemColor, string>>;
}
