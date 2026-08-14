import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

// For CI, you may want to set BASE_URL to the deployed application.
const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import 'dotenv/config';

/**
 * See https://playwright.dev/docs/test-configuration.
 *
 * Generated as a .mts file so Node forces ESM regardless of workspace
 * `type`. Playwright routes `.mts` through its ESM loader (dynamic import,
 * bypassing the pirates CJS-compile path), and Nx's native TS strip loads
 * `.mts` directly. Playwright's configLoader auto-discovers
 * `playwright.config.mts` via its extension list
 * (.ts/.js/.mts/.mjs/.cts/.cjs).
 */
export default defineConfig({
  ...nxE2EPreset(import.meta.dirname, { testDir: './src' }),
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    baseURL,
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
  },
  /*
   * Wzorce odniesienia testów wizualnych. `{platform}` w ścieżce jest istotny:
   * rasteryzacja pisma różni się między systemami, więc jeden zestaw wzorców
   * nie może obsługiwać naraz Linuksa i macOS-a — bez tego rozdziału zrzuty
   * z innej maszyny „naprawiałyby" się nawzajem przy każdym `--update-snapshots`.
   */
  snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      /*
       * Budżet BEZWZGLĘDNY, nie ułamek obrazu — i to celowo.
       *
       * `maxDiffPixelRatio` skaluje się z wielkością zrzutu, czyli daje tym
       * większą pobłażliwość, im większa karta. Pierwsza wersja tej konfiguracji
       * miała `maxDiffPixelRatio: 0.01` i PRZEPUSZCZAŁA zmianę `border-radius`
       * przycisku z 8px na 1px — bramka wyglądała na działającą, a nie łapała
       * regresji, którą miała łapać.
       *
       * Wartość wynika z pomiaru, nie z wyczucia:
       *   - ten sam kod, powtórzony przebieg   ->   0 różniących się pikseli,
       *   - promień przycisku 8px -> 1px       ->  74 różniące się piksele.
       * 20 leży bezpiecznie nad zerem (pojedyncze piksele wygładzania krawędzi
       * nie robią szumu w commitach) i blisko czterokrotnie pod najmniejszą
       * realną regresją, jaką umiałem wywołać.
       */
      maxDiffPixels: 20,
      /*
       * Próg PODOBIEŃSTWA KOLORU na piksel — bez niego budżet wyżej liczy
       * piksele, których nikt nie policzył.
       *
       * Domyślne `threshold: 0.2` znaczy „różnica koloru poniżej 0,2 w metryce
       * YIQ pixelmatcha nie jest różnicą". Zmierzone, nie założone:
       *   - krok rampy blue-500 -> blue-400   ->  0.0163,
       *   - krok rampy blue-500 -> blue-600   ->  0.0101,
       *   - slate-900 -> slate-800            ->  0.0042.
       * Czyli PRZEMALOWANIE CAŁEGO PRZYCISKU o jeden krok rampy dawało zero
       * różniących się pikseli i zielony przebieg — znalezione przy A12, gdy
       * zmiana `--pct-primary` w motywie ciemnym nie ruszyła ani jednego wzorca,
       * choć zrzut po niej ma 2155 pikseli w nowym kolorze zamiast 2145
       * w starym. Bramka wyglądała na działającą i nie łapała regresji, którą
       * miała łapać — ta sama wada co `maxDiffPixelRatio` wyżej, tylko na osi
       * koloru zamiast na osi liczby pikseli.
       *
       * 0.005 leży pod najmniejszym zmierzonym krokiem rampy (0.0042 dla pary
       * slate to jedyna wartość niżej — dwie sąsiednie szarości tła są
       * nierozróżnialne i tego ta bramka nie obiecuje) i wysoko nad szumem
       * wygładzania krawędzi, który i tak absorbuje budżet 20 pikseli.
       */
      threshold: 0.005,
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
    },
  },
  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npx nx run sandbox:serve',
    url: 'http://localhost:4200',
    reuseExistingServer: true,
    cwd: workspaceRoot,
  },
  /*
   * Macierz przeglądarek (req-quality-browsers).
   *
   * Trzy silniki, nie trzy marki: blink, gecko, webkit. `Desktop Edge`
   * i `Google Chrome` to ten sam blink w innym opakowaniu — czwarty projekt
   * kosztowałby czas CI i nie odpowiadał na żadne nowe pytanie.
   *
   * Ta sama lista stoi drugi raz w `browsers.policy.json` i to jest
   * celowe powtórzenie, nie niedopatrzenie. `tools/check-browsers.mjs` nie
   * czyta tego pliku — pyta Playwrighta, co NAPRAWDĘ zebrał — i porównuje
   * wynik z polityką. Silnik usunięty stąd rozjeżdża się wtedy z polityką
   * i zapala; żeby to ucichło, trzeba wykreślić go w dwóch miejscach naraz,
   * czyli zostawić w diffie zdanie, które recenzent widzi.
   *
   * Wzorce `testIgnore` są tu pisane z gwiazdkami katalogu, choć zmierzone
   * jest, że sama nazwa pliku działa tak samo — także dla speca w podkatalogu.
   * Powód formy jest inny: wzorzec, który w nic nie trafia, NIE jest błędem
   * dla Playwrighta, tylko projektem zbierającym komplet. Literówkę w tej
   * liście łapie więc dopiero `check-browsers` (punkt 3), porównując zebrane
   * pliki z polityką — i to jest jedyna rzecz, która ją tu łapie.
   */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      /*
       * Zrzuty wizualne zostają na chromium: wzorce z `__screenshots__/linux/`
       * powstały jego rasteryzacją i każdy inny silnik rozjeżdża je z powodu
       * maszyny, a nie kodu (zmierzone: 26 z 26 wzorców różni się na firefoksie).
       * Trzeci zestaw wzorców per silnik to trzykrotny koszt uwagi przy każdej
       * świadomej zmianie wyglądu i zero nowych pytań — regresję układu łapią
       * testy geometrii, które biegną tutaj w komplecie.
       */
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: ['**/visual.spec.ts'],
    },
    {
      /*
       * Do wzorców dochodzi `forced-colors.spec.ts` — i to jest wyłączenie
       * z POMIARU, nie z wygody. Playwrightowy webkit melduje
       * `matchMedia('(forced-colors: active)').matches === true`, a kolorów
       * autora nie podmienia: sonda z tłem `rgb(1, 2, 3)` wychodzi z niego
       * niezmieniona, podczas gdy chromium i firefox oddają biel z palety
       * użytkownika. `forced-color-adjust` nie jest w nim nawet znaną
       * właściwością. Cały ten plik pytałby więc o zachowanie, którego ten
       * silnik nie ma — a cztery z sześciu testów przechodziłyby, mierząc
       * kolory z tokenów.
       *
       * Fakt jest pilnowany, a nie zapisany: punkt 6 `check-browsers`
       * powtarza tę sondę przy każdym przebiegu, więc dzień, w którym webkit
       * to zaimplementuje, jest dniem, w którym bramka każe wyłączenie zdjąć.
       */
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: ['**/visual.spec.ts', '**/forced-colors.spec.ts'],
    },
  ],
});
