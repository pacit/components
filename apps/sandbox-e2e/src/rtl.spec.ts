import { expect, Page, test } from '@playwright/test';
import { boxOf, setRtl, visit } from './support/dom';

/**
 * Kierunek pisma (`req-token-logical`).
 *
 * Bramka `check-styles` czyta arkusze i pilnuje, żeby nie było w nich
 * właściwości fizycznych osi inline. To warunek konieczny i **niewystarczający**:
 * arkusz może być bez zarzutu logiczny, a układ i tak nie odbić się w RTL — bo
 * kierunek nie dociera tam, gdzie powinien. Arkusz o tym milczy; widać to dopiero
 * na wyrenderowanej stronie.
 *
 * Dokładnie tak wyszła regresja panelu selecta: `text-align: start` w arkuszu jest
 * poprawne, a panel i tak pisał od lewej przy triggerze piszącym od prawej, bo
 * nakładka CDK żyje jako dziecko `body` i nie dziedziczy niczego po kontrolce
 * (`lesson-35` — motyw, pismo, a teraz kierunek).
 */

/** Kierunek policzony przez przeglądarkę, nie odczytany z atrybutu. */
const kierunek = (page: Page, selektor: string) =>
  page
    .locator(selektor)
    .first()
    .evaluate((el) => getComputedStyle(el).direction);

test.describe('Kierunek pisma — układ odbija się w dir="rtl"', () => {
  /**
   * Pomiar, a nie deklaracja: dekoracja pola stoi w LTR po lewej stronie
   * kontrolki, a w RTL po prawej. Gdyby arkusz był fizyczny, obie strony byłyby
   * takie same i ten test by zapalił — czyli jest to kontrola odniesienia dla
   * całej reszty tego pliku, wyrażona geometrią.
   */
  test('dekoracja pola przechodzi na drugą stronę kontrolki', async ({
    page,
  }) => {
    await visit(page, '/field');
    const prefix = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-prefix"]');
    const control = page
      .getByTestId('field-price')
      .locator('[data-pct-part="field-control"]');

    const ltrPrefix = await boxOf(prefix);
    const ltrControl = await boxOf(control);
    expect(ltrPrefix.x).toBeLessThan(ltrControl.x);

    await setRtl(page);

    const rtlPrefix = await boxOf(prefix);
    const rtlControl = await boxOf(control);
    expect(rtlPrefix.x).toBeGreaterThan(rtlControl.x);
  });

  test('powłoka i scena karty przejmują kierunek', async ({ page }) => {
    await visit(page, '/button');
    await setRtl(page);

    await expect(page.getByTestId('demo-stage').first()).toHaveAttribute(
      'dir',
      'rtl',
    );
    expect(await kierunek(page, '[data-testid="demo-stage"]')).toBe('rtl');
  });

  /**
   * Regresja wprost z `lesson-35`, tym razem na trzeciej właściwości dziedziczonej.
   * Panel jest w nakładce CDK, czyli poza `app-root`, więc `dir` z powłoki go NIE
   * dosięga — kierunek trzeba przenieść jawnie, tak jak motyw i pismo. Zmierzone
   * przed poprawką: `direction: rtl` na triggerze wobec `ltr` na panelu, przy
   * arkuszu bez ani jednej właściwości fizycznej.
   *
   * Test porównuje panel Z TRIGGEREM, a nie z ustaloną wartością: panel ma być
   * przedłużeniem tej kontrolki, więc gdy kiedyś kierunek stanie się zakresowy,
   * ta asercja dalej mówi to samo.
   */
  test('panel selecta dziedziczy kierunek po triggerze, nie po body', async ({
    page,
  }) => {
    await visit(page, '/select');
    await setRtl(page);

    const trigger = page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]');
    await trigger.click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();

    const triggerDir = await trigger.evaluate(
      (el) => getComputedStyle(el).direction,
    );
    const panelDir = await panel.evaluate(
      (el) => getComputedStyle(el).direction,
    );

    expect(triggerDir).toBe('rtl');
    expect(panelDir).toBe(triggerDir);

    // Panel naprawdę jest poza drzewem powłoki — bez tego asercja wyżej
    // przechodziłaby przez zwykłe dziedziczenie i nie badała niczego.
    expect(await panel.evaluate((el) => el.closest('app-root') === null)).toBe(
      true,
    );
  });
});
