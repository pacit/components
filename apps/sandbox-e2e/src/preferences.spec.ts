import { expect, Page, test } from '@playwright/test';
import { visit } from './support/dom';
import { firstDurationMs, rootToken, tokenOf } from './support/css';

/**
 * Preferencje systemowe użytkownika: redukcja ruchu i schemat kolorów.
 *
 * Obie są w tym projekcie TOKENAMI, nie regułami dopisanymi w arkuszach —
 * build emituje je jako bloki `@media` obok bloków `[data-theme]`. Testy
 * mierzą więc dwie rzeczy naraz: że blok się aktywuje i że skutek dochodzi do
 * komponentu, a nie zatrzymuje się na zmiennej w `:root`.
 *
 * Emulacja idzie przez `visit(page, path, { media })` — powód w `support/dom.ts`.
 */

/** Bramka sprawdza samą siebie: bez tego test mierzy wartości bazowe i „przechodzi". */
async function expectMedia(page: Page, query: string, active: boolean) {
  expect(
    await page.evaluate((q) => matchMedia(q).matches, query),
    `emulacja "${query}" nie zadziałała — test mierzyłby stan domyślny`,
  ).toBe(active);
}

test.describe('prefers-reduced-motion', () => {
  const REDUCE = { reducedMotion: 'reduce' } as const;

  /**
   * Odniesienie: bez preferencji ruch MUSI stać na wartościach bazowych.
   * Test redukcji, który przechodzi także wtedy, gdy media query nigdy nie
   * zadziałało, niczego nie pilnuje — dopiero para „przed/po" czyni z tego
   * pomiar. Ta para wykryła realny problem: `test.use({ reducedMotion })` nie
   * dociera w tej wersji Playwrighta do kontekstu.
   */
  test('bez preferencji oś ruchu stoi na wartościach bazowych', async ({
    page,
  }) => {
    await visit(page, '/button', {
      media: { reducedMotion: 'no-preference' },
    });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', false);

    expect(await rootToken(page, '--pct-motion-transition-duration')).toBe(
      '150ms',
    );
    expect(await rootToken(page, '--pct-motion-loop-duration')).toBe('600ms');
    expect(
      await firstDurationMs(
        page.getByTestId('btn-solid'),
        'transition-duration',
      ),
    ).toBe(150);
  });

  test('przejścia znikają, a wskaźnik ciągły tylko zwalnia', async ({
    page,
  }) => {
    await visit(page, '/button', { media: REDUCE });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', true);

    // Sama oś tokenów.
    expect(await rootToken(page, '--pct-motion-transition-duration')).toBe(
      '0.01ms',
    );
    expect(await rootToken(page, '--pct-motion-loop-duration')).toBe('1500ms');

    // Skutek na komponencie — token bez odbiorcy niczego nie załatwia.
    expect(
      await firstDurationMs(
        page.getByTestId('btn-solid'),
        'transition-duration',
      ),
    ).toBeLessThan(1);

    // Spinner NIE staje: zatrzymany przestałby informować, że przycisk pracuje.
    // Ma zwolnić — na tym polega różnica między „mniej ruchu" a „mniej informacji".
    const spinner = page
      .getByTestId('btn-loading')
      .locator('[data-pct-part="spinner"]');
    expect(await firstDurationMs(spinner, 'animation-duration')).toBe(1500);
  });

  /**
   * Regresja wobec stanu sprzed osi ruchu: `prefers-reduced-motion` było wtedy
   * pojedynczym wyjątkiem w `button.scss`, więc pozostałe kontrolki animowały
   * ramkę mimo preferencji. Odkąd czas jest tokenem, wystarczy jedna reguła —
   * ten test pilnuje, że nowy komponent nie wypadnie z niej po cichu.
   */
  test('redukcja obowiązuje wszystkie kontrolki, nie tylko przycisk', async ({
    page,
  }) => {
    await visit(page, '/states', { media: REDUCE });
    await expectMedia(page, '(prefers-reduced-motion: reduce)', true);

    const idle = page.getByTestId('states-idle');
    const surfaces = {
      'wiersz pola': idle.locator('[data-pct-part="field-row"]').first(),
      'pudełko checkboxa': page
        .getByTestId('idle-checkbox')
        .locator('[data-pct-part="box"]'),
      'okrąg radia': page
        .getByTestId('idle-radio')
        .locator('[data-pct-part="circle"]')
        .first(),
      'trigger listy': page
        .getByTestId('idle-select')
        .locator('[data-pct-part="trigger"]'),
    };

    for (const [nazwa, surface] of Object.entries(surfaces)) {
      expect(
        await firstDurationMs(surface, 'transition-duration'),
        `${nazwa} nadal animuje mimo prefers-reduced-motion`,
      ).toBeLessThan(1);
    }
  });
});

test.describe('prefers-color-scheme', () => {
  const LIGHT_SURFACE = '#ffffff';
  const DARK_SURFACE = '#0f172a';
  const DARK = { colorScheme: 'dark' } as const;

  test('strona bez jawnego motywu bierze ciemny z systemu', async ({
    page,
  }) => {
    await visit(page, '/all', { media: DARK });
    await expectMedia(page, '(prefers-color-scheme: dark)', true);
    // `:root` sandboxa celowo nie ma `data-theme` — motyw siedzi na powłoce.
    // To czyni z niego czysty punkt odniesienia dla samego mechanizmu.
    expect(await rootToken(page, '--pct-surface')).toBe(DARK_SURFACE);
  });

  test('bez preferencji ciemnej :root zostaje jasny (odniesienie)', async ({
    page,
  }) => {
    await visit(page, '/all', { media: { colorScheme: 'light' } });
    await expectMedia(page, '(prefers-color-scheme: dark)', false);
    expect(await rootToken(page, '--pct-surface')).toBe(LIGHT_SURFACE);
  });

  /**
   * Preferencja systemu jest WARTOŚCIĄ DOMYŚLNĄ, nie rozkazem: poddrzewo
   * z jawnym `data-theme` musi ją przebić — inaczej aplikacja, która świadomie
   * wybrała jasny motyw, straciłaby nad nim kontrolę. Sandbox stawia motyw na
   * powłoce, więc ten sam dokument niesie oba przypadki naraz: `:root` idzie za
   * systemem, a wnętrze powłoki za ustawieniem.
   */
  test('jawny data-theme wygrywa z preferencją systemu', async ({ page }) => {
    await visit(page, '/all', { media: DARK });
    const shell = page.locator('app-root');
    await expect(shell).toHaveAttribute('data-theme', 'light');

    expect(await tokenOf(shell, '--pct-surface')).toBe(LIGHT_SURFACE);
    expect(await rootToken(page, '--pct-surface')).toBe(DARK_SURFACE);
  });

  /**
   * Zagnieżdżenie musi przeżyć automatyczny tryb ciemny: ciemna karta w jasnej
   * powłoce stojącej na ciemnym systemie nadal odcina się od swojego otoczenia.
   */
  test('scoped theme działa dalej pod automatycznym trybem ciemnym', async ({
    page,
  }) => {
    await visit(page, '/all', { media: DARK });
    const scoped = page.getByTestId('panel-scoped');
    await expect(scoped).toHaveAttribute('data-theme', 'dark');

    expect(await tokenOf(scoped, '--pct-surface')).toBe(DARK_SURFACE);
    expect(await tokenOf(page.locator('app-root'), '--pct-surface')).toBe(
      LIGHT_SURFACE,
    );
  });
});
