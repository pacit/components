import { expect, test } from '@playwright/test';
import { hydrationErrors, uncaughtErrors, visit } from './support/dom';
import { SBX_ROUTES } from './support/views';

/**
 * SSR z hydracją jest wymaganiem twardym (wym-projekt-ssr), ale jego złamanie nie
 * przewraca strony: Angular loguje NG0500 i po cichu odbudowuje poddrzewo od
 * nowa. Aplikacja wygląda więc poprawnie, a płaci za to podwójnym renderem,
 * utratą stanu DOM i migotaniem — i żaden dotychczasowy test tego nie widział.
 *
 * Samo sprawdzenie siedzi w `visit()`, więc obejmuje KAŻDY test e2e w tym
 * projekcie. Ten plik dokłada dwie rzeczy, których side effect nie daje:
 * jawne przejście po wszystkich widokach (także tych bez własnego speca)
 * i test kontrolny samej bramki.
 */
test.describe('Hydracja SSR', () => {
  for (const path of SBX_ROUTES) {
    test(`widok ${path} hydruje się bez rozjazdu`, async ({ page }) => {
      // `visit` rzuca sam, gdy zobaczy NG05xx — asercja poniżej jest po to,
      // żeby test miał widoczne ustalenie, a nie tylko brak wyjątku.
      await visit(page, path);
      expect(hydrationErrors(page)).toEqual([]);
      expect(uncaughtErrors(page)).toEqual([]);
    });
  }

  /**
   * Nawigacja klientem nie hydruje niczego, ale leniwy widok dochodzi do
   * strony po tym, jak hydracja się skończyła — a to jest ten moment, w którym
   * rozjechał się licznik identyfikatorów z lekcja-31.
   */
  test('przejścia między widokami też nie sypią błędami', async ({ page }) => {
    await visit(page, '/');
    for (const path of ['/field', '/select', '/states', '/all']) {
      await page
        .getByRole('link', { name: new RegExp('.') })
        .first()
        .waitFor();
      await visit(page, path);
    }
    expect(hydrationErrors(page)).toEqual([]);
    expect(uncaughtErrors(page)).toEqual([]);
  });

  /**
   * Test samej bramki, nie aplikacji — w duchu kontroli z `a11y.spec.ts`.
   * Bramka, która nigdy nie potrafi zapalić (bo np. nasłuch podpina się po
   * `goto()` albo wzorzec kodu jest błędny), daje fałszywe poczucie
   * bezpieczeństwa i przechodzi tak samo jak bramka działająca.
   */
  test('bramka faktycznie wykrywa błąd hydracji (kontrola bramki)', async ({
    page,
  }) => {
    await visit(page, '/');
    expect(hydrationErrors(page)).toEqual([]);

    await page.evaluate(() =>
      console.error(
        'NG0500: During hydration Angular expected <div> but found <span>',
      ),
    );
    await expect
      .poll(() => hydrationErrors(page).length, {
        message: 'nasłuch konsoli nie zobaczył błędu hydracji',
      })
      .toBe(1);

    // I że `visit()` na tym realnie pada — bez tego bramka zbiera błędy,
    // których nikt nie zamienia na czerwony test.
    await expect(visit(page, '/button')).rejects.toThrow(/Błąd hydracji/);
  });
});
