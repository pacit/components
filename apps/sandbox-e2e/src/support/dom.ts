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
 * Kody rodziny „hydration" z katalogu błędów Angulara (NG0500–NG05xx):
 * niezgodność drzewa serwerowego z klienckim, brakujące węzły, nieobsługiwana
 * projekcja treści. Wzorzec obejmuje całą rodzinę celowo — nowy kod z tej puli
 * ma zapalać bramkę od razu, bez dopisywania go tutaj.
 */
const HYDRATION_ERROR = /NG05\d\d/;

interface PageProblems {
  readonly hydration: string[];
  readonly uncaught: string[];
}

const WATCHED = new WeakMap<Page, PageProblems>();

/**
 * Podpina nasłuch konsoli i nieprzechwyconych wyjątków — raz na stronę.
 *
 * Nasłuch musi ruszyć PRZED `goto()`, bo błąd hydracji pada w trakcie pierwszej
 * hydracji i nikt go potem nie powtórzy.
 */
function watch(page: Page): PageProblems {
  const known = WATCHED.get(page);
  if (known) return known;

  const problems: PageProblems = { hydration: [], uncaught: [] };
  WATCHED.set(page, problems);

  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (HYDRATION_ERROR.test(text)) problems.hydration.push(text);
  });
  page.on('pageerror', (err) => {
    const text = `${err.name}: ${err.message}`;
    (HYDRATION_ERROR.test(text) ? problems.hydration : problems.uncaught).push(
      text,
    );
  });

  return problems;
}

/** Błędy hydracji zebrane na tej stronie (do testu kontrolnego bramki). */
export function hydrationErrors(page: Page): readonly string[] {
  return watch(page).hydration;
}

/** Nieprzechwycone wyjątki, które nie są błędami hydracji. */
export function uncaughtErrors(page: Page): readonly string[] {
  return watch(page).uncaught;
}

/**
 * Wejście na stronę sandboxa — czeka na hydrację, nie tylko na `load`.
 *
 * Sam `goto()` kończy się, gdy w DOM stoi HTML z serwera. Kliknięcie czy `fill`
 * w tym oknie trafia w martwy DOM, a hydracja nadpisuje wynik stanem z modelu —
 * objaw wygląda jak wada komponentu („wpisana wartość wróciła do początkowej"),
 * choć jest wyścigiem w teście. Powłoka wystawia znacznik po `whenStable()`.
 *
 * Przy okazji jest to BRAMKA HYDRACJI (wym-a11y-7 / wym-tech-4): niezgodność
 * drzewa serwerowego z klienckim nie przewraca strony — Angular loguje NG0500
 * i po cichu odtwarza poddrzewo od nowa. Cały dotychczasowy zestaw e2e
 * przechodził więc na zielono także wtedy, gdy SSR realnie się rozjeżdżał
 * (dokładnie ta klasa wady co w wym-real-31). Skoro każdy test i tak wchodzi na
 * stronę przez `visit()`, sprawdzenie siedzi tutaj i obejmuje wszystkie widoki
 * naraz, zamiast czekać na dopisanie do każdego speca z osobna.
 */
export interface VisitOptions {
  /**
   * Emulacja preferencji systemowych, ustawiana PRZED wejściem na stronę —
   * inaczej pierwszy render idzie na wartościach domyślnych.
   *
   * Uwaga: to musi być `page.emulateMedia()`, a NIE `test.use({ reducedMotion })`
   * ani `test.use({ forcedColors })`. W Playwright 1.61.1 te dwie opcje podane
   * przez `test.use` nie docierają do kontekstu — `matchMedia(...)` w stronie
   * zwraca wtedy `false`, a test przechodzi, bo mierzy wartości bazowe zamiast
   * tych spod media query. Bramka, która niczego nie sprawdza, jest gorsza niż
   * jej brak, więc emulację ustawiamy jawnie i sprawdzamy w teście, że
   * faktycznie się włączyła (`matchMedia`).
   * `colorScheme` przez `test.use` działa, ale trzymamy tu wszystkie trzy osie
   * razem, żeby nie trzeba było pamiętać, która jest którą.
   */
  media?: Parameters<Page['emulateMedia']>[0];
}

export async function visit(
  page: Page,
  path = '/',
  options: VisitOptions = {},
): Promise<void> {
  const problems = watch(page);
  if (options.media) await page.emulateMedia(options.media);
  await page.goto(path);
  await page.locator('html[data-sbx-ready]').waitFor();

  if (problems.hydration.length) {
    throw new Error(
      `Błąd hydracji na ${path} (SSR rozjechał się z klientem):\n  - ` +
        problems.hydration.join('\n  - '),
    );
  }
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
