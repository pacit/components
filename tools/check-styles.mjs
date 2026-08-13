#!/usr/bin/env node
/**
 * Bramka stylów: pilnuje dwóch obietnic o arkuszach biblioteki —
 * `req-token-logical` (układ opisany właściwościami logicznymi, więc odbija się
 * w `dir="rtl"`) i `req-token-no-opacity` (żadnej `opacity` kompozytującej).
 *
 * Powód istnienia jest wspólny dla obu: to obietnice, których złamanie NIE daje
 * czerwonego testu. Arkusz z `padding-left` wygląda dobrze w `dir="ltr"`, czyli
 * w każdym zrzucie, jaki dziś robimy; `opacity: 0.6` na warstwie tekstowej wygląda
 * dobrze zawsze i cofa `req-token-contrast` do stanu sprzed `lesson-6` — bramka
 * kontrastu liczy na hexach z palety, a przeglądarka pokazuje wynik kompozycji
 * z tłem, którego ta matematyka nie widzi. Obie wady są dziś dotrzymane wyłącznie
 * pamięcią autora, a koszt retrofitu rośnie z każdym komponentem nieliniowo.
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. lista arkuszy nie jest pusta (inaczej punkty 5 i 6 przechodzą, bo nie mają
 *     czego badać),
 *  2. KOMPILATOR: wszystko, co sass EMITUJE, widzi też skaner źródła — arkusz
 *     potrafiący ukryć deklarację przed skanerem jest arkuszem niemierzonym,
 *  3. ŹRÓDŁO STYLÓW: każdy `@Component` biblioteki bierze style z arkusza, który
 *     ta bramka czyta — `styles: [...]` w dekoratorze jest dla niej niewidzialne,
 *  4. wyjątki są nazwane, uzasadnione i UŻYTE,
 *  5. żadnej właściwości fizycznej osi inline,
 *  6. żadnej `opacity` kompozytującej.
 *
 * Punkty 5 i 6 to same reguły; punkty 1–3 pilnują MIANOWNIKA, z którego te reguły
 * powstają — czyli tego, co w A2 kurczyło się jako próbka plików w raporcie, w A6
 * jako zbiór mierzonych komponentów, a w A7 jako zbiór projektów. Tutaj kurczy się
 * zbiór DEKLARACJI: arkusz, którego skaner nie rozumie, i komponent stylujący się
 * poza arkuszem są dla reguł tym samym co plik poza raportem pokrycia.
 *
 * Do tego siódmy przebieg, który nie bada arkuszy, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-styles.fixtures/`. Spreparowane wejścia, z których
 * każde łamie dokładnie jeden z sześciu punktów i musi zostać odrzucone przez ten
 * właśnie punkt (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-styles.mjs
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const FIXTURES = join(ROOT, 'tools/check-styles.fixtures');
const BAZA = '_poprawny';

/**
 * Znacznik wyjątku. Nazywa WŁAŚCIWOŚĆ, a nie „tę linię": komentarz napisany dla
 * `left` nie może po cichu przykryć `opacity` dopisanej obok pół roku później.
 *
 *   /* pct-wyjatek left: <uzasadnienie> *\/
 */
const WYJATEK = /pct-wyjatek\s+([-a-zA-Z]+)\s*:\s*([\s\S]*)$/;

/**
 * Próg długości uzasadnienia. To jest podłoga przeciwko pustej pieczątce
 * (`/* pct-wyjatek left: bo tak *\/`), a nie sędzia jakości — maszyna nie oceni,
 * czy powód jest prawdziwy. Tego pilnuje review i wyłącznie review; bramka
 * pilnuje, żeby było co recenzować i żeby wyjątek dało się policzyć.
 */
const MIN_UZASADNIENIE = 40;

/**
 * Właściwości fizyczne osi inline i ich logiczne odpowiedniki. Oś BLOCK
 * (`top`/`bottom`, `margin-top`, …) świadomie NIE jest na liście: `dir="rtl"`
 * odbija wyłącznie oś inline, a pełne bidi — czyli pionowe tryby pisma — jest
 * jawnym nie-celem (`docs/00-axis.md`). Zakaz `top` byłby więc szumem, na który
 * odpowiedzią stałaby się pieczątka wyjątku przy co drugiej regule.
 */
const FIZYCZNE = new Map([
  ['left', 'inset-inline-start'],
  ['right', 'inset-inline-end'],
  ['margin-left', 'margin-inline-start'],
  ['margin-right', 'margin-inline-end'],
  ['padding-left', 'padding-inline-start'],
  ['padding-right', 'padding-inline-end'],
  ['scroll-margin-left', 'scroll-margin-inline-start'],
  ['scroll-margin-right', 'scroll-margin-inline-end'],
  ['scroll-padding-left', 'scroll-padding-inline-start'],
  ['scroll-padding-right', 'scroll-padding-inline-end'],
  ['border-left', 'border-inline-start'],
  ['border-right', 'border-inline-end'],
  ['border-left-width', 'border-inline-start-width'],
  ['border-right-width', 'border-inline-end-width'],
  ['border-left-style', 'border-inline-start-style'],
  ['border-right-style', 'border-inline-end-style'],
  ['border-left-color', 'border-inline-start-color'],
  ['border-right-color', 'border-inline-end-color'],
  ['border-top-left-radius', 'border-start-start-radius'],
  ['border-top-right-radius', 'border-start-end-radius'],
  ['border-bottom-left-radius', 'border-end-start-radius'],
  ['border-bottom-right-radius', 'border-end-end-radius'],
  // `direction` w arkuszu komponentu zabija całą obietnicę: nie ma znaczenia,
  // jak logiczne są pozostałe reguły, skoro ta jedna przypina kierunek na sztywno.
  [
    'direction',
    'kierunek dziedziczony z dokumentu — nie ustawiaj go w komponencie',
  ],
]);

/** Właściwości, w których fizyczna jest WARTOŚĆ, a nie nazwa. */
const FIZYCZNA_WARTOSC = new Map([
  ['text-align', { zle: new Set(['left', 'right']), zamiast: 'start / end' }],
  [
    'float',
    { zle: new Set(['left', 'right']), zamiast: 'inline-start / inline-end' },
  ],
  [
    'clear',
    { zle: new Set(['left', 'right']), zamiast: 'inline-start / inline-end' },
  ],
]);

/**
 * Rodzina `opacity`. Wariantów SVG jest tu z tego samego powodu co `opacity`:
 * `fill-opacity` na znaczniku checkboxa kompozytuje dokładnie tak samo, tylko
 * nie nazywa się tak, jak stoi w wymaganiu.
 */
const OPACITY = new Set([
  'opacity',
  'fill-opacity',
  'stroke-opacity',
  'stop-opacity',
]);

// ── skaner arkusza ────────────────────────────────────────────────────────────

/**
 * Skaner: z tekstu arkusza robi listę deklaracji i komentarzy, każde z numerem
 * linii. Nie jest to parser CSS i nie musi nim być — bramka pyta wyłącznie
 * o pary `właściwość: wartość` i o komentarze, w których stoją wyjątki.
 *
 * Świadomie NIE stoi tu postcss, choć jest w zależnościach: jego domyślny parser
 * wywraca się na składni SCSS (`//`, `$zmienna` poza regułą), a `postcss-scss`
 * byłby nową zależnością wprowadzoną po to, żeby czytać siedem plików o składni
 * czystego CSS-a. Ważniejsze jest jednak co innego: własny skaner ma taką awarię,
 * jaką mu się zaprojektuje, a jego niedowidzenie łapie punkt 2 — porównanie z tym,
 * co z tego samego arkusza wypisuje sass, czyli parser prawdziwy.
 *
 * Nawiasy liczą się osobno, żeby `;` wewnątrz `url(data:…;base64,…)` nie rozciął
 * deklaracji na pół.
 */
const skanuj = (tresc) => {
  const deklaracje = [];
  const komentarze = [];
  let bufor = '';
  let liniaBufora = 0;
  let linia = 1;
  let nawiasy = 0;
  let i = 0;

  const dodaj = (znak) => {
    if (bufor.trim() === '' && znak.trim() !== '') liniaBufora = linia;
    bufor += znak;
  };

  /** Domyka bufor: jeśli wygląda jak deklaracja, ląduje na liście. */
  const domknij = () => {
    const m = /^\s*(-{0,2}[A-Za-z_][-\w]*)\s*:\s*([\s\S]*)$/.exec(bufor);
    if (m)
      deklaracje.push({
        wlasciwosc: m[1].toLowerCase(),
        wartosc: m[2].trim().replace(/\s+/g, ' '),
        linia: liniaBufora,
      });
    bufor = '';
  };

  while (i < tresc.length) {
    const znak = tresc[i];
    const nastepny = tresc[i + 1];

    if (znak === '/' && nastepny === '*') {
      const start = linia;
      const koniec = tresc.indexOf('*/', i + 2);
      const kres = koniec === -1 ? tresc.length : koniec;
      const tekst = tresc.slice(i + 2, kres);
      linia += (tekst.match(/\n/g) ?? []).length;
      komentarze.push({ tekst, linia: start, koniec: linia });
      i = kres + 2;
      continue;
    }

    // Komentarz liniowy SCSS. Nie niesie wyjątków (sass go nie emituje, więc
    // punkt 2 nie miałby jak porównać), ale musi zniknąć ze strumienia.
    if (znak === '/' && nastepny === '/') {
      const koniec = tresc.indexOf('\n', i);
      i = koniec === -1 ? tresc.length : koniec;
      continue;
    }

    if (znak === '"' || znak === "'") {
      let j = i + 1;
      while (j < tresc.length && tresc[j] !== znak) {
        if (tresc[j] === '\\') j++;
        if (tresc[j] === '\n') linia++;
        j++;
      }
      dodaj(tresc.slice(i, j + 1));
      i = j + 1;
      continue;
    }

    if (znak === '\n') {
      linia++;
      dodaj(' ');
      i++;
      continue;
    }

    if (znak === '(') nawiasy++;
    if (znak === ')') nawiasy = Math.max(0, nawiasy - 1);

    if (nawiasy === 0) {
      // Preludium reguły (selektor, prelude at-reguły) nie jest deklaracją.
      if (znak === '{') {
        bufor = '';
        i++;
        continue;
      }
      // `}` domyka też deklarację bez średnika na końcu bloku.
      if (znak === '}' || znak === ';') {
        domknij();
        i++;
        continue;
      }
    }

    dodaj(znak);
    i++;
  }

  return { deklaracje, komentarze };
};

/**
 * Klucz deklaracji ISTOTNEJ dla którejkolwiek z dwóch obietnic — albo `null`.
 * Ten sam klucz liczy się dla źródła i dla wyjścia sassa, więc punkt 2 porównuje
 * te dwa widoki bez oglądania się na resztę arkusza.
 */
const kluczIstotny = (d) => {
  const wartosc = d.wartosc.toLowerCase();
  if (FIZYCZNE.has(d.wlasciwosc)) return `${d.wlasciwosc}:${wartosc}`;
  const wartosciowa = FIZYCZNA_WARTOSC.get(d.wlasciwosc);
  if (wartosciowa?.zle.has(wartosc.split(/\s+/)[0]))
    return `${d.wlasciwosc}:${wartosc}`;
  if (OPACITY.has(d.wlasciwosc) && !przezroczystoscBinarna(wartosc))
    return `${d.wlasciwosc}:${wartosc}`;
  // `inset` jest fizyczny dopiero przy wielu wartościach: `inset: 0` jest
  // symetryczne i w RTL zachowuje się identycznie, a zakaz obejmujący także je
  // produkowałby wyjątki bez treści.
  if (d.wlasciwosc === 'inset' && wartosc.split(/\s+/).length > 1)
    return `${d.wlasciwosc}:${wartosc}`;
  return null;
};

/**
 * `opacity` wolno WYŁĄCZNIE jako przełącznik widoczności: `0` (element nie
 * uczestniczy w obrazie, więc nie ma o czym obiecywać kontrastu) i `1` (wartość
 * neutralna, zwykle cofnięcie stanu). Wszystko pomiędzy KOMPONUJE z tłem, czyli
 * przesuwa kontrast realny poza wynik bramki kontrastu (`lesson-6`).
 *
 * Wartość niedosłowna (`var(...)`, `calc(...)`) nie jest binarna z definicji:
 * bramka nie wie, co przyjdzie w runtime, a zgadywanie na korzyść autora byłoby
 * dokładnie tą ciszą, przed którą ta reguła stoi.
 *
 * Świadomie przepuszczone: `transition: opacity …` i przejście 0 → 1. Stan
 * przelotny nie jest tym, o czym mówi `req-token-contrast`, a zakaz obejmujący
 * animacje odebrałby jedyny standardowy sposób wprowadzania nakładek.
 */
const przezroczystoscBinarna = (wartosc) => {
  const m = /^(\d*\.?\d+)(%?)$/.exec(wartosc.trim());
  if (!m) return false;
  const liczba = Number(m[1]) / (m[2] === '%' ? 100 : 1);
  return liczba === 0 || liczba === 1;
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Naruszenie jednej z sześciu kontroli. Niesie identyfikator kontroli, a nie
 * tylko komunikat: kontrola odniesienia musi sprawdzić, że spreparowane wejście
 * zapaliło NA SWOIM punkcie — arkusz wywalający się z innego powodu niż wpisany
 * w nim samym dowodzi czegoś innego, niż deklaruje.
 */
class BladStylu extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

/**
 * Komplet kontroli na gotowym wejściu:
 *   `arkusze`     — `[{ plik, tresc, css }]`, gdzie `css` to wyjście sassa,
 *   `komponenty`  — `[{ plik, klasa, arkusze, inline }]` z dekoratorów,
 *   `deklaracji`  — liczba wystąpień `@Component(` w źródłach (mianownik parsera).
 * Rzuca `BladStylu` przy pierwszym naruszeniu: kontrole idą od mianownika do
 * reguł, więc reguła po zawalonym mianowniku i tak nie miałaby czego badać.
 */
const sprawdzStyle = ({ arkusze, komponenty, deklaracji }) => {
  // 1. Lista arkuszy nie jest pusta.
  if (!arkusze.length)
    throw new BladStylu(
      'arkusze',
      `nie znalazłem ani jednego arkusza (${PROJEKT}/**/*.scss) — ` +
        `punkty 5 i 6 przeszłyby wtedy zawsze, bo nie mają czego czytać`,
    );

  const skany = new Map(arkusze.map((a) => [a.plik, skanuj(a.tresc)]));

  // 2. Kompilator: sass nie emituje niczego istotnego, czego skaner nie widzi
  //    w źródle. To jest mianownik samego skanera — deklaracja powstała przez
  //    mixin, interpolację albo zagnieżdżoną właściwość dociera do przeglądarki,
  //    a w tekście źródła nie stoi, więc reguły przeszłyby po niej bez śladu.
  for (const arkusz of arkusze) {
    const wZrodle = new Set(
      skany
        .get(arkusz.plik)
        .deklaracje.map(kluczIstotny)
        .filter((k) => k !== null),
    );
    const ukryte = [
      ...new Set(
        skanuj(arkusz.css)
          .deklaracje.map(kluczIstotny)
          .filter((k) => k !== null && !wZrodle.has(k)),
      ),
    ];
    if (ukryte.length)
      throw new BladStylu(
        'kompilator',
        `${arkusz.plik}: sass emituje deklaracje, których nie ma w tekście źródła:\n` +
          lista(ukryte) +
          `\n    Docierają do przeglądarki, a reguły z punktów 5 i 6 przechodzą po ` +
          `nich bez śladu. Najczęstsza przyczyna: mixin, interpolacja (\`padding-#{$x}\`) ` +
          `albo właściwość zagnieżdżona. Zapisz je wprost — albo naucz skaner ich czytać.`,
      );
  }

  // 3. Źródło stylów: każdy `@Component` styluje się arkuszem, który bramka czyta.
  //
  //    Najpierw zbiór niepusty — z tego samego powodu co punkt 1, tylko po
  //    drugiej stronie porównania. Porównanie liczb (`rozpoznano N z M`) jest
  //    ślepe na zero: gdy obie strony są puste, są równe, i punkt przechodzi
  //    orzekając o niczym. Pierwsza wersja tej bramki dokładnie tak przeszła —
  //    pathspec gita zwracał zero źródeł, a wynik brzmiał „0 komponentów"
  //    (`lesson-48`).
  if (!komponenty.length)
    throw new BladStylu(
      'zrodlo-stylow',
      `nie znalazłem ani jednego \`@Component\` w źródłach (${PROJEKT}) — ` +
        `porównanie z liczbą dekoratorów przeszłoby wtedy zawsze, bo zero równa się zeru.\n` +
        `    Najczęstsza przyczyna: lista plików źródłowych przestała cokolwiek zwracać.`,
    );

  if (komponenty.length !== deklaracji)
    throw new BladStylu(
      'zrodlo-stylow',
      `parser rozpoznał ${komponenty.length} z ${deklaracji} dekoratorów \`@Component\` — ` +
        `reszta wypadłaby z pomiaru bez śladu. Najczęstsza przyczyna: dekorator ` +
        `zapisany inaczej, niż formatuje prettier (\`@Component({\` i \`})\` w kolumnie zero).`,
    );

  const znane = new Set(arkusze.map((a) => a.plik));
  const bezArkusza = komponenty.flatMap((k) => {
    if (k.inline)
      return [
        `${k.plik}: ${k.klasa} ma \`styles: […]\` w dekoratorze — bramka czyta arkusze, nie dekoratory`,
      ];
    return k.arkusze
      .filter((a) => !znane.has(a))
      .map(
        (a) =>
          `${k.plik}: ${k.klasa} styluje się z \`${a}\`, czyli spoza listy arkuszy`,
      );
  });
  if (bezArkusza.length)
    throw new BladStylu(
      'zrodlo-stylow',
      `${bezArkusza.length} komponentów bierze style stamtąd, gdzie ta bramka nie sięga:\n` +
        lista(bezArkusza) +
        `\n    Style tych komponentów jadą do konsumenta tak samo jak wszystkie inne, ` +
        `a punkty 5 i 6 orzekają o nich „bez naruszeń" wyłącznie dlatego, że ich nie widzą.`,
    );

  // 4. Wyjątki: nazwane, uzasadnione, użyte.
  //
  //    Wyjątek obowiązuje WYŁĄCZNIE dla deklaracji przylegającej — w tej samej
  //    linii albo w linii bezpośrednio pod komentarzem. Bez tego powód opisujący
  //    jedną regułę rozpełzałby się na cały blok, a przesunięcie kodu zostawiałoby
  //    ważny wyjątek nad czymś zupełnie innym.
  const usprawiedliwione = new Set();
  const problemyWyjatkow = [];
  for (const arkusz of arkusze) {
    const { deklaracje, komentarze } = skany.get(arkusz.plik);
    for (const komentarz of komentarze) {
      const m = WYJATEK.exec(komentarz.tekst);
      if (!m) continue;
      const [, wlasciwosc, uzasadnienieSurowe] = m;
      const uzasadnienie = uzasadnienieSurowe.replace(/\*+\s*$/, '').trim();
      if (uzasadnienie.length < MIN_UZASADNIENIE) {
        problemyWyjatkow.push(
          `${arkusz.plik}:${komentarz.linia}: wyjątek dla \`${wlasciwosc}\` bez uzasadnienia ` +
            `(${uzasadnienie.length} z ${MIN_UZASADNIENIE} znaków) — pieczątka, nie powód`,
        );
        continue;
      }
      const trafione = deklaracje.filter(
        (d) =>
          d.wlasciwosc === wlasciwosc.toLowerCase() &&
          (d.linia === komentarz.linia || d.linia === komentarz.koniec + 1),
      );
      if (!trafione.length) {
        problemyWyjatkow.push(
          `${arkusz.plik}:${komentarz.linia}: wyjątek dla \`${wlasciwosc}\` nie przylega do ` +
            `żadnej deklaracji tej właściwości — albo kod się przesunął i wyjątek został sam, ` +
            `albo nazwana właściwość jest inna niż ta poniżej`,
        );
        continue;
      }
      for (const d of trafione)
        usprawiedliwione.add(`${arkusz.plik}:${d.linia}`);
    }
  }
  if (problemyWyjatkow.length)
    throw new BladStylu(
      'wyjatek',
      `${problemyWyjatkow.length} wyjątków nie jest wyjątkami:\n` +
        lista(problemyWyjatkow) +
        `\n    Zapis: /* pct-wyjatek <właściwość>: <powód, dlaczego akurat tu jest bezpieczna> */`,
    );

  // 5. Właściwości logiczne (`req-token-logical`).
  const fizyczne = [];
  // 6. Bez `opacity` kompozytującej (`req-token-no-opacity`).
  const przezroczyste = [];

  for (const arkusz of arkusze)
    for (const d of skany.get(arkusz.plik).deklaracje) {
      if (usprawiedliwione.has(`${arkusz.plik}:${d.linia}`)) continue;
      const gdzie = `${arkusz.plik}:${d.linia}`;

      const logiczna = FIZYCZNE.get(d.wlasciwosc);
      if (logiczna) {
        fizyczne.push(`${gdzie}: \`${d.wlasciwosc}\` — użyj \`${logiczna}\``);
        continue;
      }
      const wartosciowa = FIZYCZNA_WARTOSC.get(d.wlasciwosc);
      const pierwsza = d.wartosc.toLowerCase().split(/\s+/)[0];
      if (wartosciowa?.zle.has(pierwsza)) {
        fizyczne.push(
          `${gdzie}: \`${d.wlasciwosc}: ${pierwsza}\` — użyj \`${wartosciowa.zamiast}\``,
        );
        continue;
      }
      if (d.wlasciwosc === 'inset' && d.wartosc.split(/\s+/).length > 1) {
        fizyczne.push(
          `${gdzie}: \`inset: ${d.wartosc}\` — wiele wartości ustawia oś inline fizycznie; ` +
            `użyj \`inset-block-*\` / \`inset-inline-*\``,
        );
        continue;
      }
      if (OPACITY.has(d.wlasciwosc) && !przezroczystoscBinarna(d.wartosc))
        przezroczyste.push(`${gdzie}: \`${d.wlasciwosc}: ${d.wartosc}\``);
    }

  if (fizyczne.length)
    throw new BladStylu(
      'logiczne',
      `${fizyczne.length} właściwości fizycznych osi inline (req-token-logical):\n` +
        lista(fizyczne) +
        `\n    Układ opisany fizycznie NIE odbija się w \`dir="rtl"\` i nie widać tego ` +
        `na żadnym zrzucie LTR. Jeśli akurat ta jest bezpieczna, powiedz dlaczego: ` +
        `/* pct-wyjatek <właściwość>: <powód> */`,
    );

  if (przezroczyste.length)
    throw new BladStylu(
      'opacity',
      `${przezroczyste.length} deklaracji \`opacity\` kompozytujących z tłem (req-token-no-opacity):\n` +
        lista(przezroczyste) +
        `\n    Bramka kontrastu liczy na wartościach z palety, więc kompozycji nie widzi — ` +
        `to jest droga powrotna do stanu sprzed lesson-6. Stan wyraź własnym tokenem koloru. ` +
        `Dozwolone są wyłącznie \`0\` i \`1\` (przełącznik widoczności).`,
    );

  const wyjatkow = usprawiedliwione.size;
  return (
    `${arkusze.length} arkuszy, ${komponenty.length} komponentów, ` +
    `${wyjatkow} ${wyjatkow === 1 ? 'wyjątek uzasadniony' : 'wyjątków uzasadnionych'}`
  );
};

// ── input from disk ───────────────────────────────────────────────────────────

/**
 * Dekorator komponentu. Parser kotwiczy się w kolumnie zero, bo takie
 * formatowanie wymusza `nx format:check`, a licznik pilnuje, żeby rozjazd z tym
 * założeniem był widoczny — komponent, którego parser nie rozpozna, ma wypaść
 * z pomiaru GŁOŚNO, a nie po cichu.
 *
 * Licznik NIE może więc powtarzać kotwicy parsera, i to jest tu cała rzecz.
 * Pierwsza wersja miała `/^@Component\(/gm` w obu miejscach: przesunięcie
 * dekoratora o jedną spację gasiło parser i licznik naraz, obie strony zgadzały
 * się na siódemce i bramka kończyła zielono, przestawszy mierzyć cały komponent
 * (`lesson-48`). Wcięcie jest tu zatem dozwolone, a odsiewa się wyłącznie
 * wystąpienia w komentarzu — `core/src/texts.ts` ma `@Component(` w przykładzie
 * JSDoc, czyli linię zaczynającą się od gwiazdki.
 */
const KOMPONENT =
  /^@Component\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const KOMPONENT_LICZNIK = /^[ \t]*@Component\(/gm;

const czytajKomponenty = (root, pliki) => {
  const komponenty = [];
  let deklaracji = 0;
  for (const plik of pliki) {
    const tresc = readFileSync(join(root, plik), 'utf8');
    deklaracji += (tresc.match(KOMPONENT_LICZNIK) ?? []).length;
    for (const [, cialo, klasa] of tresc.matchAll(KOMPONENT)) {
      const arkusze = [
        ...cialo.matchAll(
          /styleUrls?\s*:\s*(?:\[([^\]]*)\]|(['"])([^'"]*)\2)/g,
        ),
      ].flatMap(([, tablica, , pojedynczy]) =>
        pojedynczy !== undefined
          ? [pojedynczy]
          : [...tablica.matchAll(/['"]([^'"]*)['"]/g)].map((m) => m[1]),
      );
      komponenty.push({
        plik,
        klasa,
        inline: /^\s*styles\s*:/m.test(cialo),
        arkusze: arkusze.map((a) =>
          relative(root, resolve(join(root, dirname(plik)), a))
            .split('\\')
            .join('/'),
        ),
      });
    }
  }
  return { komponenty, deklaracji };
};

/** Wejście złożone z listy plików — ta sama postać dla repo i dla fixture'a. */
const zbierzWejscie = (root, arkuszeSciezki, zrodlaSciezki) => ({
  arkusze: arkuszeSciezki.map((plik) => ({
    plik,
    tresc: readFileSync(join(root, plik), 'utf8'),
    // Wyjście sassa, czyli to, co naprawdę dostaje przeglądarka. Styl `expanded`
    // zachowuje komentarze `/* */`, więc porównanie z punktu 2 patrzy na ten sam
    // materiał po obu stronach.
    css: sass.compile(join(root, plik), { style: 'expanded' }).css,
  })),
  ...czytajKomponenty(root, zrodlaSciezki),
});

/**
 * Wszystkie pliki projektu z INDEKSU GITA, nie z globa po dysku. Powód jest ten
 * sam co w `check-zoneless` i `check-typecheck`: indeks jest niezależnym spisem
 * tego, co repozytorium naprawdę wiezie, a przy okazji sam z siebie odcina rzeczy
 * generowane — `libs/components/themes/_tokens.scss` powstaje z tokenów przy
 * każdym buildzie i jest gitignorowany, więc nie ma go tu czym wykluczać.
 *
 * Pathspec jest KATALOGIEM, a filtrowanie siedzi w JS-ie. To nie jest kwestia
 * gustu: pathspec gita nie jest globem powłoki — bez `:(glob)` gwiazdka
 * przechodzi przez `/`, więc `libs/components/*​/src/**​/*.ts` żąda o jeden
 * katalog za dużo i nie dopasowuje `button/src/button.ts`. Zwraca wtedy ZERO
 * plików, a nie błąd. Pierwsza wersja tej bramki przeszła z takim wzorcem
 * na zielono, mierząc zero komponentów (`lesson-48`).
 */
const plikiProjektu = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

/**
 * Źródła, w których szuka się `@Component`. Specyfikacje odpadają świadomie:
 * definiują komponenty-gospodarzy z szablonem i stylami wpisanymi w dekorator,
 * a te nigdzie nie jadą — punkt 3 zapalałby na każdym teście renderującym.
 */
const jestZrodlem = (p) => p.endsWith('.ts') && !p.endsWith('.spec.ts');

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Składa spreparowane wejście: kopia bazy, na nią pliki przypadku, na końcu
 * usunięcia z `fixture.json`. Katalog przypadku zawiera więc WYŁĄCZNIE wadę,
 * a nie kolejny egzemplarz poprawnego wejścia, w którym trzeba jej szukać.
 *
 * Źródła komponentów leżą w repozytorium jako `*.ts.txt` i dopiero tutaj stają
 * się `*.ts`. Powód jest twardy i już raz zapisany w `tsconfig.root.json`: plik
 * `.ts` w `tools/` nie należy do żadnego programu kompilatora, więc zapaliłby
 * `check-typecheck` (punkt 1 — plik bez projektu). Fixture jednej bramki nie może
 * być wadą dla drugiej. Składanie idzie do katalogu tymczasowego POZA repozytorium,
 * więc żadna bramka nie ogląda materiału pośredniego.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-styles-'));
  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  cpSync(join(FIXTURES, nazwa), cel, {
    recursive: true,
    filter: (src) => basename(src) !== 'fixture.json',
  });
  for (const sciezka of fx.usun ?? [])
    rmSync(join(cel, sciezka), { recursive: true, force: true });
  for (const plik of globSync('**/*.ts.txt', { cwd: cel }))
    renameSync(join(cel, plik), join(cel, plik.replace(/\.txt$/, '')));
  return cel;
};

const pliki = (katalog, wzorzec) =>
  globSync(wzorzec, { cwd: katalog })
    .map((p) => p.split('\\').join('/'))
    .sort();

const wejscieFixture = (katalog) =>
  zbierzWejscie(
    katalog,
    pliki(katalog, '**/*.scss'),
    pliki(katalog, '**/*.ts').filter(jestZrodlem),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  const pliki = plikiProjektu();
  opis = sprawdzStyle(
    zbierzWejscie(
      ROOT,
      pliki.filter((p) => p.endsWith('.scss')),
      pliki.filter(jestZrodlem),
    ),
  );
} catch (blad) {
  if (!(blad instanceof BladStylu)) throw blad;
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-styles.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass. Were the base defective itself, every case would
// fire because of it and not because of its own defect — every „rejected" would be
// false, and this control would become the very thing it stands against.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzStyle(wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladStylu)) throw blad;
    problems.push(
      `${BAZA}: the reference input does NOT pass (${blad.kontrola}) — ` +
        `every prepared case now fires because of it.\n    ${blad.message}`,
    );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

for (const nazwa of przypadki) {
  const fx = JSON.parse(
    readFileSync(join(FIXTURES, nazwa, 'fixture.json'), 'utf8'),
  );
  const katalog = zlozFixture(nazwa, fx);
  try {
    sprawdzStyle(wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladStylu)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Style gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Styles: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
