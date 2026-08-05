import { expect, Page, test } from '@playwright/test';
import { setRtl, visit } from './support/dom';

/**
 * Testy wizualne (wym-jakosc-e2e).
 *
 * Cała metodyka tego projektu opiera się na pomiarze w przeglądarce, a nie na
 * lekturze arkusza — zrzut ekranu jest jej naturalnym przedłużeniem. Testy
 * geometrii sprawdzają to, o co ktoś wcześniej zapytał („czy kolumna kafelkuje
 * ramkę szczelnie"); zrzut łapie także to, o co nikt nie zapytał, bo porównuje
 * CAŁY obraz. Regresje z lekcja-27 i lekcja-34 były dokładnie tego rodzaju.
 *
 * Wzorce trzymamy w `src/__screenshots__/{platform}/`.
 * Po świadomej zmianie wyglądu:
 *
 *     npx nx e2e sandbox-e2e -- --update-snapshots visual.spec.ts
 *
 * i przejrzeć różnice w commicie — to jest ten moment, w którym recenzent widzi
 * zmianę wizualną, zamiast domyślać się jej z diffu SCSS.
 */

const VIEWPORT = { width: 1280, height: 900 };

/**
 * Ustawia scenę tak, by zrzut zależał od komponentów, a nie od maszyny.
 *
 * Krój pisma jest tu najważniejszy: sandbox używa `system-ui`, które na każdym
 * systemie rozwiązuje się do czego innego (lokalnie Noto Sans, na runnerze CI
 * zwykle Liberation albo DejaVu). Różnica w metryce pisma przesuwa układ na
 * tyle, że wzorce przestają się zgadzać z powodu maszyny, a nie z powodu kodu —
 * i test zamienia się w generator fałszywych alarmów. Przypinamy więc krój,
 * który jest i lokalnie, i w obrazie CI (`playwright install --with-deps`
 * dociąga `fonts-liberation`).
 */
async function stage(page: Page, path: string): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await visit(page, path);
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        font-family: 'Liberation Sans', Arial, sans-serif !important;
      }
      code, kbd, samp, pre {
        font-family: 'Liberation Mono', 'Courier New', monospace !important;
      }
    `,
  });
  // Podmiana kroju przelicza układ — bez tego zrzut może złapać stan sprzed
  // reflow. `fonts.ready` czeka na dopięcie wszystkich użytych krojów.
  await page.evaluate(() => document.fonts.ready);
}

/**
 * Karty do porównania. Zrzut ELEMENTU, nie całej strony: karta nie zawiera
 * nawigacji ani paska ustawień, więc zmiana w powłoce sandboxa nie unieważnia
 * wzorców wszystkich komponentów naraz.
 */
const CARDS: ReadonlyArray<
  readonly [path: string, testId: string, name: string]
> = [
  ['/button', 'demo-variants', 'przycisk-warianty'],
  ['/button', 'demo-sizes', 'przycisk-wielkosci'],
  ['/button', 'demo-states', 'przycisk-stany'],
  ['/button', 'demo-dark', 'przycisk-karta-ciemna'],
  ['/field', 'demo-basics', 'pole-podstawy'],
  ['/field', 'demo-affix', 'pole-dekoracje'],
  ['/field', 'demo-aux', 'pole-sloty-poboczne'],
  ['/text', 'demo-types', 'tekst-rodzaje'],
  ['/number', 'demo-price', 'liczba-kwota'],
  ['/checkbox', 'demo-in-field', 'checkbox-w-obudowie'],
  ['/radio', 'demo-in-field', 'radio-w-obudowie'],
  ['/select', 'demo-in-field', 'select-w-obudowie'],
  ['/size', 'demo-axis', 'os-wielkosci'],
  ['/states', 'states-disabled', 'stany-wylaczone'],
  ['/states', 'states-invalid', 'stany-bledne'],
];

test.describe('Wygląd — porównanie ze wzorcem', () => {
  for (const [path, testId, name] of CARDS) {
    test(`${name}`, async ({ page }) => {
      await stage(page, path);
      await expect(page.getByTestId(testId)).toHaveScreenshot(`${name}.png`);
    });
  }

  /**
   * Panel listy żyje w nakładce CDK, czyli poza drzewem karty — jedyny element
   * biblioteki, którego nie widać na żadnym zrzucie stanu spoczynkowego.
   */
  test('select-panel-otwarty', async ({ page }) => {
    await stage(page, '/select');
    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-otwarty.png');
  });

  /**
   * Ten sam zestaw kontrolek w motywie ciemnym. Motyw jest osią przekrojową,
   * więc regresja w warstwie semantycznej tokenów pokaże się tu, a nie
   * w zrzutach jasnych.
   */
  test('stany-ciemne', async ({ page }) => {
    await stage(page, '/all');
    await expect(page.getByTestId('panel-scoped')).toHaveScreenshot(
      'stany-ciemne.png',
    );
  });
});

/**
 * Ten sam zestaw w `dir="rtl"` (wym-token-logiczne).
 *
 * Bramka `check-styles` czyta arkusze i zapala na właściwości fizycznej. To
 * warunek konieczny i niewystarczający: arkusz może być bez zarzutu logiczny,
 * a układ i tak nie odbić się — bo kierunek nie dociera tam, gdzie powinien
 * (nakładka CDK), albo bo asymetrię niesie SVG, kolejność DOM czy znak
 * przesunięcia. Żadnej z tych rzeczy nie widać w arkuszu; wszystkie widać na
 * obrazku.
 *
 * Lista jest KRÓTSZA niż `CARDS` i to jest decyzja, nie zaniedbanie: zrzut RTL
 * niesie informację tam, gdzie układ jest asymetryczny wzdłuż osi inline —
 * dekoracje pola, ikona kontrolki, pudełko przed etykietą. Karta symetryczna
 * dałaby drugi obrazek różniący się wyłącznie pozycją tekstu w akapicie i
 * kosztowałaby tyle samo uwagi przy każdej świadomej zmianie wyglądu.
 */
const CARDS_RTL: ReadonlyArray<
  readonly [path: string, testId: string, name: string]
> = [
  ['/button', 'demo-variants', 'przycisk-warianty'],
  ['/field', 'demo-affix', 'pole-dekoracje'],
  ['/field', 'demo-aux', 'pole-sloty-poboczne'],
  ['/text', 'demo-types', 'tekst-rodzaje'],
  ['/number', 'demo-price', 'liczba-kwota'],
  ['/checkbox', 'demo-in-field', 'checkbox-w-obudowie'],
  ['/radio', 'demo-in-field', 'radio-w-obudowie'],
  ['/select', 'demo-in-field', 'select-w-obudowie'],
];

test.describe('Wygląd w RTL — porównanie ze wzorcem', () => {
  for (const [path, testId, name] of CARDS_RTL) {
    test(`${name}-rtl`, async ({ page }) => {
      await stage(page, path);
      await setRtl(page);
      await expect(page.getByTestId(testId)).toHaveScreenshot(
        `${name}-rtl.png`,
      );
    });
  }

  /**
   * Panel w RTL ma osobny wzorzec, bo to jedyne miejsce, w którym kierunek nie
   * bierze się z kaskady, tylko jest przenoszony ręcznie z triggera (`lekcja-35`).
   * Regresję łapie już `rtl.spec.ts` pomiarem `direction`; ten zrzut pokazuje
   * dodatkowo, po której stronie panel się zaczepia i jak układa się treść opcji.
   */
  test('select-panel-otwarty-rtl', async ({ page }) => {
    await stage(page, '/select');
    await setRtl(page);
    await page
      .getByTestId('select-country')
      .locator('[data-pct-part="trigger"]')
      .click();

    const panel = page.locator('[data-pct-part="panel"]');
    await expect(panel).toBeVisible();
    await expect(panel).toHaveScreenshot('select-panel-otwarty-rtl.png');
  });
});
