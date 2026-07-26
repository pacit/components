import type { Locator, Page } from '@playwright/test';

/**
 * Pomocniki do zapytań DOM w testach e2e.
 *
 * Playwright zwraca `null` z `boundingBox()` (element niewidoczny) i
 * `getAttribute()` (brak atrybutu). Oba przypadki w teście oznaczają błąd, więc
 * zamiast `!` rzucamy z opisem — inaczej dostajemy „Cannot read properties of
 * null (reading 'width')" bez wskazania, o który element chodzi.
 *
 * Plik celowo nie ma w nazwie `.spec.`, więc Playwright go nie zbiera
 * (`testMatch` domyślnie dopasowuje tylko `*.spec.*` / `*.test.*`).
 */

/**
 * Wejście na stronę sandboxa — czeka na hydrację, nie tylko na `load`.
 *
 * Sam `goto()` kończy się, gdy w DOM stoi HTML z serwera. Kliknięcie czy `fill`
 * w tym oknie trafia w martwy DOM, a hydracja nadpisuje wynik stanem z modelu —
 * objaw wygląda jak wada komponentu („wpisana wartość wróciła do początkowej"),
 * choć jest wyścigiem w teście. Powłoka wystawia znacznik po `whenStable()`.
 */
export async function visit(page: Page, path = '/'): Promise<void> {
  await page.goto(path);
  await page.locator('html[data-sbx-ready]').waitFor();
}

/** Prostokąt elementu; `boundingBox()` nie ma publicznie eksportowanego typu. */
type Box = NonNullable<Awaited<ReturnType<Locator['boundingBox']>>>;

/** Prostokąt elementu; rzuca, gdy element nie jest widoczny. */
export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(
      `Brak prostokąta dla ${locator} — element nie jest widoczny.`,
    );
  }
  return box;
}

/** Wartość atrybutu; rzuca, gdy atrybutu nie ma. */
export async function attrOf(locator: Locator, name: string): Promise<string> {
  const value = await locator.getAttribute(name);
  if (value === null) {
    throw new Error(`Element ${locator} nie ma atrybutu "${name}".`);
  }
  return value;
}
