#!/usr/bin/env node
/**
 * Bramka tokenów: nazwy, poziomy, pary. Trzy obietnice o jednym grafie —
 * `req-token-names`, `req-token-tiers`, `req-token-text-pairs` — pilnowane
 * w jednym przebiegu, bo wszystkie trzy stoją na TYM SAMYM mianowniku: liście
 * tokenów. Token, którego bramka nie zobaczy, jest niezgadywalny, poza warstwami
 * i niezmierzony naraz, a każda z trzech reguł osobno wyglądałaby przy nim
 * zielono.
 *
 * Powód istnienia jest potrójny i warto go rozdzielić, bo to trzy różne wady:
 *
 *  - nazwa tokenu jest **publicznym API motywu** dokładnie tak samo jak nazwa
 *    inputu jest publicznym API komponentu. Przemianowanie `--pct-button-bg` psuje
 *    konsumentowi skórkę i nie daje przy tym ani jednego czerwonego testu, bo
 *    biblioteka zmienia obie strony naraz — arkusz i token;
 *  - nazwa NIEZGADYWALNA nie psuje niczego dziś i wszystko jutro. Zbiór, w którym
 *    stan raz nazywa się `hover`, a raz stoi przed właściwością, wymusza
 *    dokumentację przy każdym użyciu, czyli cofa obietnicę do zera przy zerowym
 *    koszcie widocznym w review;
 *  - token komponentowy sięgający po PRYMITYW odbiera autorowi motywu warstwę,
 *    przez którą miał sterować, a kolor, którego nie ma w policy kontrastu, nie
 *    jest przez tę policy mierzony — i to drugie jest gorsze, bo bramka kontrastu
 *    wygląda wtedy dokładnie tak samo jak wtedy, gdy naprawdę wszystko przechodzi
 *    (lesson-33).
 *
 * Sprawdzane jest siedem rzeczy:
 *  1. ZBIÓR: nazwy odczytane z `dist/pct.css` zgadzają się z niezależnym obejściem
 *     źródeł DTCG — i żadna strona nie jest pusta,
 *  2. POWIERZCHNIA: `dist/tokens.ts` i `dist/_tokens.scss` niosą dokładnie te
 *     nazwy, które mają nieść (prywatne prefiksy wg polityki, nie wg zgadywania),
 *  3. SCHEMAT: każda nazwa parsuje się wobec słownika, a komponent w nazwie jest
 *     prawdziwym entrypointem pakietu,
 *  4. SŁOWNIK: każde zadeklarowane słowo jest użyte,
 *  5. SNAPSHOT: wersjonowana lista nazw zgadza się z bieżącą,
 *  6. POZIOMY: graf referencji idzie w dół — komponentowy do semantycznego,
 *     semantyczny do prymitywnego, prymitywny do literału,
 *  7. PARY: każdy kolor, który biblioteka NAPRAWDĘ maluje, stoi w policy
 *     kontrastu, a każda para `on-*` jest używana.
 *
 * Punkty 3, 5, 6 i 7 to same reguły; punkty 1, 2 i 4 pilnują MIANOWNIKA, z którego
 * te reguły powstają — tego samego, który w A2 kurczył się jako próbka plików
 * w raporcie pokrycia, w A6 jako zbiór mierzonych komponentów, w A7 jako zbiór
 * projektów, a w A5 jako zbiór deklaracji widzianych przez skaner. Tutaj kurczy
 * się zbiór NAZW: token, którego bramka nie zobaczy, jest dla punktów 3 i 5 tym
 * samym co plik poza raportem pokrycia — i to on wejdzie do pakietu bez śladu.
 * Punkt 7 ma przy tym własny mianownik i własną kontrolę niepustości: mierzy
 * ARKUSZE, a lista arkuszy, która przestała cokolwiek zwracać, przepuszcza
 * wszystko (lesson-48).
 *
 * Kolejność punktów nie jest przypadkowa. Punkt 5 stoi przed 6 i 7, bo snapshot
 * zapala na każdej zmianie nazwy, także na tej, którą punkt 3 potrafi nazwać po
 * imieniu; odwrotna kolejność dawałaby na złą nazwę komunikat „snapshot się
 * rozjechał", czyli poprawną diagnozę problemu, którego nie ma. Punkty 6 i 7 stoją
 * po nim, bo mówią o WARTOŚCIACH i UŻYCIACH, a nie o liście nazw — zmiana, która
 * je zapala, nie rusza snapshotu.
 *
 * Punkt 7 czyta arkusze biblioteki przez sass, a nie przez wzorzec po tekście
 * źródła — ten sam ruch co w `check-styles` (A5) i z tego samego powodu: token
 * wniesiony mixinem albo interpolacją dociera do przeglądarki, nie stojąc
 * w tekście nigdzie. Czyta przy tym WYŁĄCZNIE `libs/components`, bo obietnica
 * dotyczy skórki biblioteki; arkusz sandboxa maluje własne powierzchnie i nie
 * jest niczyją obietnicą.
 *
 * Do tego ósmy przebieg, który nie bada tokenów, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-tokens.fixtures/` (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-tokens.mjs                    sprawdza
 *   node tools/check-tokens.mjs --write            przepisuje snapshot repozytorium
 *   node tools/check-tokens.mjs --write <fixture>  przepisuje snapshot fixture'a
 *
 * Trzecia postać jest wyłącznie utrzymaniowa: fixture ma własny snapshot i musi go
 * dostać z tego samego renderera co repozytorium, bo inaczej wejście wzorcowe
 * przestaje przechodzić przy pierwszej zmianie formatu pliku.
 */
import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  globSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as sass from 'sass';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TOKENY = 'libs/tokens';
const KOMPONENTY = 'libs/components';
const SNAPSHOT = `${TOKENY}/tokens.snapshot.md`;
const POLITYKA = `${TOKENY}/src/nazwy.policy.json`;
const POZIOMY = `${TOKENY}/src/poziomy.policy.json`;
const KONTRAST = `${TOKENY}/src/contrast.policy.json`;
const FIXTURES = join(ROOT, 'tools/check-tokens.fixtures');
const BAZA = '_poprawny';

const WRITE = process.argv.includes('--write');
const WRITE_FIXTURE = (() => {
  const kolejny = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && kolejny && !kolejny.startsWith('--') ? kolejny : null;
})();

const cssVar = (sciezka) => '--' + sciezka.replace(/\./g, '-');
const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

/** Pierwsze `ile` pozycji plus informacja, ile zostało — komunikat ma być czytelny. */
const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

// ── słownik ───────────────────────────────────────────────────────────────────

/**
 * Dopasowania słowa na POCZĄTKU tekstu, od najdłuższego. Kolejność ma znaczenie
 * przy słowach zagnieżdżonych: `group-label-fg` musi zobaczyć część
 * `group-label`, a nie `label`, bo ta druga nie stoi na początku i tak — ale
 * `font-size-sm` musi zobaczyć właściwość `font-size`, a nie `font`, i tu
 * kolejność już rozstrzyga.
 */
const przedrostki = (slowa, tekst) =>
  slowa
    .filter((s) => tekst === s || tekst.startsWith(`${s}-`))
    .sort((a, b) => b.length - a.length);

/**
 * `[{część}-]{właściwość}[-{wariant}]`. Przeszukiwanie z nawrotami, bo dopasowanie
 * zachłanne potrafi zająć słowo potrzebne dalej: nazwa zaczynająca się częścią,
 * która jest też przedrostkiem właściwości, ma dwa odczyty i wolno przyjąć ten,
 * który domyka się w całości.
 */
const parsujKomponentowy = (reszta, polityka) => {
  const { czesci, wlasciwosci, stany, wielkosci } = polityka.komponentowe;
  const warianty = new Set([...stany, ...wielkosci.lista]);

  for (const czesc of [null, ...przedrostki(czesci, reszta)]) {
    const poCzesci = czesc === null ? reszta : reszta.slice(czesc.length + 1);
    if (!poCzesci) continue; // część bez właściwości nie jest nazwą
    for (const wlasciwosc of przedrostki(wlasciwosci, poCzesci)) {
      const ogon =
        poCzesci === wlasciwosc ? '' : poCzesci.slice(wlasciwosc.length + 1);
      if (ogon === '') return { czesc, wlasciwosc, wariant: null };
      if (warianty.has(ogon)) return { czesc, wlasciwosc, wariant: ogon };
    }
  }
  return null;
};

/** `[on-]{rola}[-{wariant}]`. */
const parsujSemantyczny = (reszta, polityka) => {
  const { role, warianty } = polityka.semantyczne;
  const para = reszta.startsWith('on-');
  const bezPary = para ? reszta.slice(3) : reszta;

  for (const rola of przedrostki(role, bezPary)) {
    const ogon = bezPary === rola ? '' : bezPary.slice(rola.length + 1);
    if (ogon === '') return { rola, wariant: null, para };
    if (warianty.includes(ogon)) return { rola, wariant: ogon, para };
  }
  return null;
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Naruszenie jednej z siedmiu kontroli — z identyfikatorem, nie tylko komunikatem.
 * Kontrola odniesienia musi sprawdzić, że spreparowane wejście zapaliło NA SWOIM
 * punkcie: wejście wywalające się z innego powodu, niż deklaruje, dowodzi czegoś
 * innego, niż deklaruje.
 *
 * Trzeci parametr — `regula` — jest odpowiedzią na `lesson-50`. Punkt bramki to
 * nie jest jedno zdanie: punkt 6 niesie dziewięć reguł, punkt 7 sześć.
 * Porównanie samego identyfikatora punktu przepuszcza przypadek, który zapalił
 * na SĄSIEDNIEJ regule tego samego punktu — czyli dowodzi czegoś innego, niż
 * deklaruje, i wygląda przy tym na dowód. Zmierzone: rozbrojenie pięciu z tych
 * reguł przestawia ich przypadki na sąsiednie reguły tego samego punktu i bez
 * tego pola wszystkie te przebiegi byłyby zielone. `fixture.json` może więc
 * dopisać `regula` i wtedy musi się zgadzać także ona. Pole jest opcjonalne:
 * przypadki punktów 1–5, których reguł nie rozdzielono, nie mają czego
 * doprecyzowywać.
 */
class BladTokenu extends Error {
  constructor(kontrola, opis, regula = null) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

/**
 * Komplet kontroli na gotowym wejściu. Rzuca `BladTokenu` przy pierwszym
 * naruszeniu i zwraca `{ opis, snapshot }` — wyrenderowany snapshot wraca nawet
 * z przebiegu sprawdzającego, bo `--write` musi zapisać dokładnie to, co bramka
 * przed chwilą policzyła, a nie policzyć drugi raz osobną ścieżką.
 */
const sprawdzTokeny = (we) => {
  const {
    polityka,
    poziomy,
    kontrast,
    zrodla,
    arkusze,
    css,
    ts,
    scss,
    snapshot,
    entrypointy,
  } = we;

  // 1. ZBIÓR — dwa niezależne odczyty tej samej listy.
  //
  //    Odczyt A czyta TEKST wygenerowanego CSS-a, czyli to, co naprawdę dostaje
  //    przeglądarka. Odczyt B obchodzi drzewa DTCG w źródłach. Niezależność jest
  //    tu całą wartością: gdyby lista brała się tylko ze źródeł, generator
  //    gubiący token nie zmieniłby jej ani o jotę, a gdyby tylko z CSS-a —
  //    plik źródłowy, którego build nie wczytuje, byłby niewidzialny.
  //
  //    Stąd też reguła „DTCG to plik z korzeniem `pct`", a nie powtórzenie
  //    wzorca `component.*.json` z generatora: powtórzony wzorzec przestałby
  //    być drugim zdaniem o tej samej rzeczy.
  const zCss = new Set(
    [...css.matchAll(/^\s*(--pct-[a-z0-9-]+)\s*:/gm)].map((m) => m[1]),
  );
  const zeZrodel = new Map(); // cssVar -> { sciezka, typy, pliki, wartosci }
  for (const { plik, drzewo } of zrodla)
    for (const [sciezka, typ, wartosc] of liscie(drzewo)) {
      const nazwa = cssVar(sciezka);
      const wpis = zeZrodel.get(nazwa) ?? {
        sciezka,
        typy: new Set(),
        pliki: [],
        wartosci: [],
      };
      wpis.typy.add(typ);
      wpis.pliki.push(plik);
      // Wartość zbiera się PER PLIK, a nie jedna na token: `semantic.dark.json`
      // nadpisuje `semantic.light.json`, a `motion.reduced.json` — prymitywy osi
      // ruchu. Punkt 6 musi obejrzeć każdą z nich osobno, bo motyw ciemny może
      // wskazywać gdzie indziej niż jasny i to właśnie tam złamanie warstw
      // byłoby najmniej widoczne.
      wpis.wartosci.push({ plik, wartosc });
      zeZrodel.set(nazwa, wpis);
    }

  if (!zCss.size || !zeZrodel.size)
    throw new BladTokenu(
      'zbior',
      `pusty zbiór nazw (CSS: ${zCss.size}, źródła DTCG: ${zeZrodel.size}) — ` +
        `wszystkie dalsze punkty przeszłyby wtedy, nie orzekając o niczym.\n` +
        `    Najczęstsza przyczyna: nieaktualne albo puste \`${TOKENY}/dist\` ` +
        `(bramka wymaga \`dependsOn: build\`) albo lista plików, która przestała cokolwiek zwracać.`,
    );

  const brakWCss = [...zeZrodel.keys()].filter((n) => !zCss.has(n)).sort();
  const brakWZrodlach = [...zCss].filter((n) => !zeZrodel.has(n)).sort();
  if (brakWCss.length || brakWZrodlach.length)
    throw new BladTokenu(
      'zbior',
      `dwa odczyty tej samej listy się nie zgadzają:\n` +
        (brakWCss.length
          ? `    w źródłach DTCG, a nie w \`dist/pct.css\` (${brakWCss.length}):\n` +
            lista(skroc(brakWCss)) +
            '\n'
          : '') +
        (brakWZrodlach.length
          ? `    w \`dist/pct.css\`, a nie w źródłach DTCG (${brakWZrodlach.length}):\n` +
            lista(skroc(brakWZrodlach)) +
            '\n'
          : '') +
        `    Pierwsze to token, którego generator nie emituje, albo nieaktualne \`dist\`; ` +
        `drugie — plik źródłowy, którego generator nie wczytuje. Jedno i drugie znaczy, ` +
        `że lista nazw z tej bramki nie jest listą nazw z pakietu.`,
    );

  const niejednoznaczne = [...zeZrodel]
    .filter(([, w]) => w.typy.size > 1)
    .map(
      ([n, w]) =>
        `${n}: ${[...w.typy].sort().join(' vs ')} (${w.pliki.join(', ')})`,
    );
  if (niejednoznaczne.length)
    throw new BladTokenu(
      'zbior',
      `${niejednoznaczne.length} tokenów ma w źródłach więcej niż jeden \`$type\`:\n` +
        lista(niejednoznaczne) +
        `\n    Typ jedzie do konsumenta w snapshocie i w \`tokens.ts\`; przy dwóch ` +
        `wartościach nie ma czego tam zapisać.`,
    );

  // Warstwa bierze się z PLIKU ŹRÓDŁOWEGO, nie z kształtu nazwy. Odwrotnie
  // byłoby wnioskowaniem o warstwie z tego, czego ta bramka ma dopiero pilnować.
  const nazwy = [...zeZrodel]
    .map(([nazwa, w]) => ({
      nazwa,
      sciezka: w.sciezka,
      typ: [...w.typy][0],
      wartosci: w.wartosci,
      ...warstwa(w.pliki),
    }))
    .sort((a, b) => (a.nazwa < b.nazwa ? -1 : a.nazwa > b.nazwa ? 1 : 0));

  const bezWarstwy = nazwy.filter((n) => n.warstwa === null);
  if (bezWarstwy.length)
    throw new BladTokenu(
      'zbior',
      `${bezWarstwy.length} tokenów nie da się przypisać do warstwy:\n` +
        lista(skroc(bezWarstwy.map((n) => `${n.nazwa} (${n.powod})`))) +
        `\n    Warstwa bierze się z nazwy pliku źródłowego (\`primitive\`, \`semantic.*\`, ` +
        `\`component.<nazwa>\`, \`motion.*\`). Plik nazwany inaczej wiezie tokeny, o których ` +
        `nie wiadomo, czym są — a punkt 3 pyta o schemat WŁAŚCIWY DLA WARSTWY.`,
    );

  // 2. POWIERZCHNIA — co z tej listy widzi konsument.
  //
  //    `_tokens.scss` niesie wszystko, `tokens.ts` wszystko poza prefiksami
  //    zadeklarowanymi jako prywatne. Prefiksy czyta się z polityki, a nie
  //    z generatora, bo inaczej bramka potwierdzałaby wyłącznie to, że generator
  //    robi to, co robi.
  const prywatny = (sciezka) =>
    polityka.prywatne.prefiksy.some((p) => sciezka.startsWith(p));

  const nieuzytePrefiksy = polityka.prywatne.prefiksy.filter(
    (p) => !nazwy.some((n) => n.sciezka.startsWith(p)),
  );
  if (nieuzytePrefiksy.length)
    throw new BladTokenu(
      'powierzchnia',
      `${nieuzytePrefiksy.length} prefiksów prywatnych nie obejmuje ani jednego tokenu: ` +
        nieuzytePrefiksy.map((p) => `\`${p}\``).join(', ') +
        `\n    Martwy prefiks nie jest nieszkodliwy: wygląda w polityce jak zasięg, ` +
        `którego nie ma, i przy najbliższym przemianowaniu przestanie chronić to, ` +
        `co miał chronić — po cichu.`,
    );

  porownajPowierzchnie(
    'dist/_tokens.scss',
    new Set(
      [...scss.matchAll(/^\$[a-z0-9-]+:\s*var\((--pct-[a-z0-9-]+)\)/gm)].map(
        (m) => m[1],
      ),
    ),
    new Set(nazwy.map((n) => n.nazwa)),
    'wszystkie tokeny',
  );

  const publiczne = new Set(
    nazwy.filter((n) => !prywatny(n.sciezka)).map((n) => n.nazwa),
  );
  porownajPowierzchnie(
    'dist/tokens.ts (unia PctCssVar)',
    new Set(
      [...ts.matchAll(/^\s*\|\s*'(--pct-[a-z0-9-]+)'/gm)].map((m) => m[1]),
    ),
    publiczne,
    'tokeny spoza prefiksów prywatnych',
  );
  porownajPowierzchnie(
    'dist/tokens.ts (stała pctTokens)',
    new Set(
      [...ts.matchAll(/^\s*'([a-z0-9.-]+)':/gm)].map((m) => cssVar(m[1])),
    ),
    publiczne,
    'tokeny spoza prefiksów prywatnych',
  );

  // 3. SCHEMAT — czy nazwę da się zgadnąć.
  const zle = [];
  for (const n of nazwy) {
    const segmenty = n.sciezka.split('.');
    if (segmenty[0] !== 'pct') {
      zle.push(`${n.nazwa}: ścieżka nie zaczyna się od \`pct\``);
      continue;
    }

    if (n.warstwa === 'prymitywny') {
      const [, os, ...krok] = segmenty;
      if (!polityka.prymitywne.osie.includes(os))
        zle.push(
          `${n.nazwa}: oś \`${os}\` nie jest zadeklarowana ` +
            `(${polityka.prymitywne.osie.join(', ')})`,
        );
      else if (!krok.length)
        zle.push(`${n.nazwa}: oś bez kroku — sama oś nie jest tokenem`);
      continue;
    }

    if (n.warstwa === 'semantyczny') {
      if (segmenty.length !== 2)
        zle.push(
          `${n.nazwa}: warstwa semantyczna jest PŁASKA, a ścieżka ma ` +
            `${segmenty.length} segmenty`,
        );
      else if (!parsujSemantyczny(segmenty[1], polityka))
        zle.push(
          `${n.nazwa}: nie składa się w \`[on-]{rola}[-{wariant}]\` ze słownika`,
        );
      continue;
    }

    // komponentowy
    if (segmenty.length !== 3) {
      zle.push(
        `${n.nazwa}: token komponentowy ma ścieżkę \`pct.{komponent}.{reszta}\`, ` +
          `a ta ma ${segmenty.length} segmenty — zagnieżdżenie znika w nazwie ` +
          `custom property i przestaje być widoczne`,
      );
      continue;
    }
    const [, komponent, reszta] = segmenty;
    if (komponent !== n.komponent)
      zle.push(
        `${n.nazwa}: leży w \`component.${n.komponent}.json\`, a nazywa się od ` +
          `\`${komponent}\` — nazwa pliku i przedrostek tokenu muszą być tym samym słowem`,
      );
    else if (!entrypointy.has(komponent))
      zle.push(
        `${n.nazwa}: \`${komponent}\` nie jest entrypointem pakietu ` +
          `(\`${KOMPONENTY}/${komponent}/ng-package.json\` nie istnieje)`,
      );
    else if (!parsujKomponentowy(reszta, polityka))
      zle.push(
        `${n.nazwa}: \`${reszta}\` nie składa się w ` +
          `\`[{część}-]{właściwość}[-{wariant}]\` ze słownika`,
      );
  }
  if (zle.length)
    throw new BladTokenu(
      'schemat',
      `${zle.length} nazw poza schematem (req-token-names):\n` +
        lista(skroc(zle, 12)) +
        `\n    Nazwa spoza słownika nie psuje niczego dziś — psuje obietnicę, że siostrzaną ` +
        `nazwę da się zgadnąć bez zaglądania do dokumentacji. Jeśli słowo jest naprawdę nowe, ` +
        `dopisz je do \`${POLITYKA}\`: ma być linią w diffie, którą widać w review.`,
    );

  // 4. SŁOWNIK — czy każde zadeklarowane słowo jest użyte.
  //
  //    Punkt 3 sam z siebie domyka się w kółko: nazwa spoza schematu przestaje
  //    nią być, gdy dopisze się jej słowo do słownika. Maszyna tego nie
  //    rozstrzygnie i ten punkt nie udaje, że rozstrzyga — pilnuje węższej
  //    rzeczy: słownik ma być spisem słów UŻYWANYCH, a nie wysypiskiem, w którym
  //    kolejny wpis niczego nie zmienia, bo i tak nikt tam nie zagląda.
  //    Nazwa, która się NIE parsuje, jest tu pomijana, a nie zakładana za
  //    niemożliwą. W normalnym przebiegu punkt 3 już ją odrzucił i ta pętla jej
  //    nie zobaczy — ale kontrola odniesienia rozbraja punkty po jednym, i wtedy
  //    zobaczy. Pierwsza wersja czytała `p.czesc` wprost, ufając poprzedniemu
  //    punktowi: wyłączenie punktu 3 zamieniało bramkę w `TypeError`, czyli
  //    kontrola odniesienia przestawała umieć zbadać punkt, który miała zbadać.
  //    Dokładnie ta sama wada co w `check-typecheck` (A7) — zależność między
  //    punktami jest normalna, zapisanie jej tak, że jej naruszenie nie daje
  //    zdania, nie jest.
  const uzycia = new Map();
  const zapisz = (kategoria, slowo) => {
    if (slowo === null || slowo === undefined) return;
    uzycia.set(kategoria, (uzycia.get(kategoria) ?? new Set()).add(slowo));
  };
  for (const n of nazwy) {
    const segmenty = n.sciezka.split('.');
    if (n.warstwa === 'prymitywny') zapisz('prymitywne.osie', segmenty[1]);
    else if (n.warstwa === 'semantyczny') {
      const p = parsujSemantyczny(segmenty[1], polityka);
      if (!p) continue;
      zapisz('semantyczne.role', p.rola);
      zapisz('semantyczne.warianty', p.wariant);
    } else {
      const p =
        segmenty.length === 3 && parsujKomponentowy(segmenty[2], polityka);
      if (!p) continue;
      zapisz('komponentowe.czesci', p.czesc);
      zapisz('komponentowe.wlasciwosci', p.wlasciwosc);
      if (p.wariant !== null)
        zapisz(
          polityka.komponentowe.stany.includes(p.wariant)
            ? 'komponentowe.stany'
            : 'komponentowe.wielkosci',
          p.wariant,
        );
    }
  }
  const zadeklarowane = {
    'prymitywne.osie': polityka.prymitywne.osie,
    'semantyczne.role': polityka.semantyczne.role,
    'semantyczne.warianty': polityka.semantyczne.warianty,
    'komponentowe.czesci': polityka.komponentowe.czesci,
    'komponentowe.wlasciwosci': polityka.komponentowe.wlasciwosci,
    'komponentowe.stany': polityka.komponentowe.stany,
    'komponentowe.wielkosci': polityka.komponentowe.wielkosci.lista,
  };
  const martwe = Object.entries(zadeklarowane).flatMap(([kategoria, slowa]) =>
    slowa
      .filter((s) => !(uzycia.get(kategoria)?.has(s) ?? false))
      .map((s) => `${kategoria}: \`${s}\``),
  );
  if (martwe.length)
    throw new BladTokenu(
      'slownik',
      `${martwe.length} zadeklarowanych słów nie używa ani jeden token:\n` +
        lista(skroc(martwe, 12)) +
        `\n    Słowo bez użycia jest albo zapasem na przyszłość — a wtedy przyszłość ` +
        `dopisze je sama i będzie to widać — albo śladem po tokenie, którego już nie ma. ` +
        `W obu przypadkach powiększa zbiór nazw, które punkt 3 przepuści, nie powiększając ` +
        `zbioru nazw, które ktokolwiek widział.`,
    );

  // 5. SNAPSHOT — wersjonowana lista, wobec której mierzy się zmianę.
  // Wyrenderowany snapshot jedzie NA BŁĘDZIE, a nie liczy się drugi raz przy
  // `--write`. Druga ścieżka licząca to samo jest drugim zdaniem o tej samej
  // rzeczy — a te dwa zdania rozjeżdżają się dokładnie wtedy, gdy nikt nie patrzy.
  const tresc = renderujSnapshot(nazwy, prywatny);
  const rozjazd = (opis) =>
    Object.assign(new BladTokenu('snapshot', opis), { snapshot: tresc });

  if (snapshot === null)
    throw rozjazd(
      `brak \`${SNAPSHOT}\` — uruchom \`node tools/check-tokens.mjs --write\`.\n` +
        `    Bez snapshotu ta bramka mierzy schemat, ale nie mierzy ZMIANY: przemianowanie ` +
        `tokenu na inną poprawną nazwę przechodzi wtedy bez śladu, a u konsumenta psuje skórkę.`,
    );
  if (snapshot !== tresc) {
    const stare = wierszeSnapshotu(snapshot);
    const nowe = wierszeSnapshotu(tresc);
    const usuniete = [...stare].filter((w) => !nowe.has(w));
    const dodane = [...nowe].filter((w) => !stare.has(w));
    throw rozjazd(
      `snapshot nazw tokenów rozjechał się z wygenerowanymi:\n` +
        (usuniete.length
          ? `    zniknęło ze skórki (${usuniete.length}):\n` +
            lista(skroc(usuniete)) +
            '\n'
          : '') +
        (dodane.length
          ? `    doszło do skórki (${dodane.length}):\n` +
            lista(skroc(dodane)) +
            '\n'
          : '') +
        (!usuniete.length && !dodane.length
          ? `    lista nazw jest ta sama — rozjechał się nagłówek albo kolejność wierszy.\n`
          : '') +
        `    Nazwa tokenu jest publicznym API motywu: token, który zniknął, zabiera ` +
        `konsumentowi jego nadpisanie i nie daje przy tym ani jednego czerwonego testu. ` +
        `Jeśli zmiana jest świadoma — \`node tools/check-tokens.mjs --write\`.`,
    );
  }

  // 6. POZIOMY — graf referencji idzie w dół (req-token-tiers).
  //
  //    Obietnicą nie jest porządek dla porządku, tylko DŹWIGNIA autora motywu:
  //    warstwa semantyczna jest jedyną, którą musi znać, więc token komponentowy
  //    sięgający pod nią zabiera mu sterowanie po cichu — skórka dalej się buduje,
  //    testy dalej są zielone, a nadpisanie `--pct-primary` po prostu nie działa
  //    na jednym przycisku.
  //
  //    Kolor nie ma tu ANI JEDNEGO wyjątku: nad nim warstwa semantyczna istnieje
  //    i jest kompletna. Wyjątek dotyczy osi wymiaru, nad którymi semantyki nie ma,
  //    i jest zawężony z dwóch stron naraz (patrz `poziomy.policy.json`): oś musi
  //    być zadeklarowana, musi być używana i nie może nieść tokenu koloru. To
  //    ostatnie jest tu najważniejsze — bez niego dopisanie `blue` do listy
  //    rozbrajałoby regułę, dla której cały punkt powstał, i wyglądało w diffie
  //    jak jedno słowo.
  const zleP = [];
  const wgSciezki = new Map(nazwy.map((n) => [n.sciezka, n]));
  const osPrymitywu = (sciezka) => sciezka.split('.')[1];

  const osieWspolne = poziomy['osie-wspolne'].osie;
  const osieKolorowe = osieWspolne.filter((os) =>
    nazwy.some(
      (n) =>
        n.warstwa === 'prymitywny' &&
        n.typ === 'color' &&
        osPrymitywu(n.sciezka) === os,
    ),
  );
  if (osieKolorowe.length)
    throw new BladTokenu(
      'poziomy',
      `${osieKolorowe.length} osi zadeklarowanych jako wspólne niesie tokeny koloru: ` +
        osieKolorowe.map((o) => `\`${o}\``).join(', ') +
        `\n    Wyjątek dla osi wspólnych istnieje dlatego, że nad wymiarem nie ma warstwy ` +
        `semantycznej. Nad kolorem jest — i jest obowiązkowa. Oś kolorowa na tej liście ` +
        `nie poszerza wyjątku, tylko kasuje regułę, dla której punkt 6 powstał.`,
      'os-kolorowa',
    );

  const uzyteOsie = new Set();
  for (const n of nazwy)
    if (n.warstwa === 'komponentowy')
      for (const { wartosc } of n.wartosci) {
        const cel = odwolanie(wartosc);
        const docelowy = cel === null ? null : wgSciezki.get(cel);
        if (docelowy?.warstwa === 'prymitywny') uzyteOsie.add(osPrymitywu(cel));
      }
  const osieMartwe = osieWspolne.filter((os) => !uzyteOsie.has(os));
  if (osieMartwe.length)
    throw new BladTokenu(
      'poziomy',
      `${osieMartwe.length} osi zadeklarowanych jako wspólne nie używa ani jeden token ` +
        `komponentowy: ` +
        osieMartwe.map((o) => `\`${o}\``).join(', ') +
        `\n    To ta sama konstrukcja co martwe słowo w słowniku nazw (punkt 4): oś bez ` +
        `użycia powiększa zbiór odwołań, które punkt 6 przepuści, nie powiększając zbioru ` +
        `odwołań, które ktokolwiek napisał. Oś, której w ogóle nie ma w źródłach, wygląda ` +
        `tak samo — i tak samo tu zapala.`,
      'os-martwa',
    );

  for (const n of nazwy)
    for (const { plik, wartosc } of n.wartosci) {
      const gdzie = `${n.nazwa} (${plik.split('/').pop()})`;
      const cel = odwolanie(wartosc);

      if (cel === null) {
        // Literał. Dla wymiaru jest w porządku — token komponentowy JEST wtedy
        // dźwignią (`--pct-checkbox-size: 18px` nadpisuje się wprost). Dla koloru
        // nie: kolor wpisany z palca omija rampę i warstwę semantyczną naraz,
        // czyli nie da się go przethemować niczym poza nim samym.
        if (n.typ === 'color' && n.warstwa !== 'prymitywny')
          zleP.push({
            regula: 'literal-koloru',
            opis:
              `${gdzie}: kolor wpisany wprost (${JSON.stringify(wartosc)}) ` +
              `w warstwie \`${n.warstwa}\` — omija rampę i semantykę naraz`,
          });
        continue;
      }

      const docelowy = wgSciezki.get(cel);
      if (!docelowy) {
        // Nieosiągalne przy zielonym buildzie (generator rzuca „Nieznana
        // referencja"), ale czytanie `docelowy.warstwa` wprost dałoby tu
        // `TypeError` zamiast zdania — a to jest wada, którą to repozytorium
        // złapało już cztery razy (A3, A4, A7, A8) i za każdym razem w bramce
        // pisanej ze świadomością poprzedniej.
        zleP.push({
          regula: 'referencja-donikad',
          opis: `${gdzie}: wskazuje na nieistniejący token \`${cel}\``,
        });
        continue;
      }

      if (n.warstwa === 'prymitywny') {
        zleP.push({
          regula: 'prymityw-nie-literal',
          opis:
            `${gdzie}: warstwa prymitywna jest DNEM i musi być literałem, ` +
            `a ten token wskazuje na \`${cel}\` (${docelowy.warstwa})`,
        });
        continue;
      }

      if (n.warstwa === 'semantyczny') {
        // Alias semantyczny (`surface-disabled` -> `surface-100`) jest w porządku:
        // obie strony należą do warstwy, którą autor motywu i tak zna w całości.
        if (docelowy.warstwa === 'komponentowy')
          zleP.push({
            regula: 'odwolanie-w-gore',
            opis:
              `${gdzie}: warstwa semantyczna wskazuje W GÓRĘ, na komponentowy \`${cel}\` — ` +
              `wtedy nadpisanie tokenu jednego komponentu przethemowuje całą skórkę`,
          });
        continue;
      }

      // komponentowy
      if (docelowy.warstwa === 'komponentowy') {
        zleP.push({
          regula: 'odwolanie-w-bok',
          opis:
            `${gdzie}: wskazuje na CUDZY token komponentowy \`${cel}\` — ` +
            `nadpisanie jednego komponentu zmieniałoby wtedy drugi ` +
            `(req-token-override obiecuje coś dokładnie odwrotnego)`,
        });
        continue;
      }
      if (docelowy.warstwa !== 'prymitywny') continue; // semantyczny — tak ma być

      if (n.typ === 'color')
        zleP.push({
          regula: 'kolor-pod-semantyka',
          opis:
            `${gdzie}: kolor komponentowy wskazuje wprost na prymityw \`${cel}\` — ` +
            `warstwa semantyczna nad kolorem istnieje i nie ma od niej wyjątku`,
        });
      else if (!osieWspolne.includes(osPrymitywu(cel)))
        zleP.push({
          regula: 'os-niezadeklarowana',
          opis:
            `${gdzie}: wskazuje na prymityw z osi \`${osPrymitywu(cel)}\`, ` +
            `której \`${POZIOMY}\` nie deklaruje jako wspólnej ` +
            `(dziś: ${osieWspolne.join(', ')})`,
        });
    }
  if (zleP.length)
    throw new BladTokenu(
      'poziomy',
      `${zleP.length} odwołań poza modelem warstwowym (req-token-tiers):\n` +
        lista(
          skroc(
            zleP.map((z) => `[${z.regula}] ${z.opis}`),
            12,
          ),
        ) +
        `\n    Model ma trzy piętra i jeden kierunek: komponentowy → semantyczny → ` +
        `prymitywny → literał. Złamanie go nie psuje niczego w tym repozytorium — psuje ` +
        `motyw budowany z zewnątrz, i to po cichu, bo skórka dalej się buduje.`,
      // Regułą błędu jest reguła PIERWSZEGO naruszenia — przy jednej wadzie
      // (czyli w każdym fixture) jest to jedyne naruszenie, a przy wielu i tak
      // trzeba zacząć od jednego.
      zleP[0].regula,
    );

  // 7. PARY — każdy kolor, który biblioteka MALUJE, jest zmierzony
  //    (req-token-text-pairs).
  //
  //    Mianownikiem nie jest lista nazw kończących się na `-bg` i `-fg`, tylko to,
  //    co arkusze naprawdę malują. Różnica jest mierzalna, nie teoretyczna: przycisk
  //    w wariancie outline maluje tło `var(--pct-surface-100)` i etykietę
  //    `var(--pct-primary)`, czyli dwoma tokenami SEMANTYCZNYMI, których żadna
  //    reguła oparta na nazwie tokenu komponentowego nie zobaczy. Do A12 obie stały
  //    poza policy — i to jest dokładnie kształt `lesson-33`: bramka kontrastu bada
  //    wyłącznie to, co ktoś wcześniej do niej wpisał.
  //
  //    Odwrotnie działa reguła `on-*`: ta czyta NAZWY, bo para zadeklarowana
  //    i nigdy nie namalowana nie zostawia w arkuszu żadnego śladu. Dwa odczyty,
  //    dwie różne ślepoty.
  const { malowane, przypisania } = malowaneKolory(arkusze);

  // Mianownik punktu 7 mierzy się na WYNIKU, nie na wejściu. Pierwsza wersja
  // pytała wyłącznie o liczbę arkuszy — i przeszła na zielono, wypisawszy
  // „0 kolorów malowanych w 7 arkuszach": wzorzec deklaracji wymagał wiodącego
  // myślnika, więc widział wyłącznie custom properties, a `background:` nie.
  // To jest `lesson-48` w punkcie napisanym po to, żeby jej nie powtórzyć, i ta
  // sama pomyłka co w A5: kontrola niepustości stała po stronie WEJŚCIA, a pusty
  // był POMIAR. Zero par do sprawdzenia to zawsze zero naruszeń.
  if (!arkusze.length || !malowane.size || !kontrast.checks?.length)
    throw new BladTokenu(
      'pary',
      `pusty mianownik punktu 7 (arkusze: ${arkusze.length}, ` +
        `kolory malowane: ${malowane.size}, ` +
        `wpisy w policy: ${kontrast.checks?.length ?? 0}) — ` +
        `bez każdego z tych trzech ten punkt przechodzi, nie orzekając o niczym.\n` +
        `    Najczęstsze przyczyny: lista arkuszy, która przestała cokolwiek zwracać ` +
        `(lesson-48 — pathspec gita nie jest globem powłoki), albo skaner deklaracji, ` +
        `który przestał je rozpoznawać.`,
      'mianownik',
    );

  const wPolicy = new Set(
    kontrast.checks.flatMap((c) => [cssVar(c.fg), cssVar(c.bg)]),
  );
  const wgNazwy = new Map(nazwy.map((n) => [n.nazwa, n]));

  const zleU = [];
  for (const [token, role] of [...malowane].sort()) {
    const n = wgNazwy.get(token);
    const role_ = [...role].sort().join(', ');
    // Każda z trzech reguł czyta WŁASNY warunek wstępny (`!n`, `n?.typ`), zamiast
    // ufać poprzedniej. Zależność między nimi jest naturalna — token spoza skórki
    // nie ma typu — ale zapisana przez sam `continue` zamieniała rozbrojenie
    // pierwszej reguły w `TypeError` zamiast w komunikat, czyli kontrola
    // odniesienia przestawała umieć zbadać dwie pozostałe. Ta sama wada co w A3,
    // A4, A7 i A8; piąty raz, i drugi raz WEWNĄTRZ jednego punktu.
    if (!n)
      zleU.push({
        regula: 'token-spoza-skorki',
        opis:
          `${token}: malowany (${role_}), a nie ma go wśród tokenów skórki — ` +
          `nie ma czego zmierzyć`,
      });
    if (n && n.typ !== 'color')
      zleU.push({
        regula: 'nie-kolor',
        opis: `${token}: malowany jako kolor (${role_}), a w DTCG ma \`$type: ${n.typ}\``,
      });
    if (n && n.typ === 'color' && !wPolicy.has(token))
      zleU.push({
        regula: 'niezmierzony',
        opis: `${token}: malowany (${role_}), a nie stoi w żadnej parze policy`,
      });
  }
  if (zleU.length)
    throw new BladTokenu(
      'pary',
      `${zleU.length} kolorów maluje się bez wpisu w \`${KONTRAST}\`:\n` +
        lista(
          skroc(
            zleU.map((z) => `[${z.regula}] ${z.opis}`),
            12,
          ),
        ) +
        `\n    Para bez wpisu nie jest liczona, więc kolor spoza policy jest kolorem, ` +
        `o którym bramka kontrastu NIE MA ZDANIA — i wygląda to dokładnie tak samo jak ` +
        `zielony przebieg (lesson-33). Dobór partnera zostaje decyzją człowieka: maszyna ` +
        `widzi, że kolor jest niezmierzony, nie widzi, na czym leży.` +
        (przypisania
          ? `\n    Uwaga: arkusz może wnieść token także przypisaniem do innej custom ` +
            `property — te są rozwijane, więc \`--pct-x: var(--pct-y)\` daje \`y\` rolę \`x\`.`
          : ''),
      zleU[0].regula,
    );

  // Reguła `on-*` czyta NAZWY, a nie arkusze — i to jest jej cała wartość: para
  // zadeklarowana, a nigdy nienamalowana, nie zostawia w arkuszu żadnego śladu,
  // więc pomiar z poprzedniej reguły jest na nią ślepy z konstrukcji.
  const bezPowierzchni = [];
  const martwe_ = [];
  const referowane = new Set(
    nazwy.flatMap((n) => n.wartosci.map(({ wartosc }) => odwolanie(wartosc))),
  );
  for (const n of nazwy) {
    if (n.warstwa !== 'semantyczny') continue;
    if (!n.sciezka.startsWith('pct.on-')) continue;
    const rola = n.sciezka.slice('pct.on-'.length);
    if (!wgSciezki.has(`pct.${rola}`))
      bezPowierzchni.push(
        `${n.nazwa}: para do nieistniejącego \`--pct-${rola}\` — ` +
          `przedrostek \`on-\` obiecuje tekst DLA powierzchni, a tej powierzchni nie ma`,
      );
    else if (!referowane.has(n.sciezka) && !malowane.has(n.nazwa))
      martwe_.push(
        `${n.nazwa}: nie używa go ani jeden token, ani jeden arkusz — ` +
          `zadeklarowana para bez powierzchni, na której cokolwiek stoi`,
      );
  }
  const bladPary = (wpisy, regula, ogon) =>
    new BladTokenu(
      'pary',
      `${wpisy.length} par \`on-*\` nie trzyma swojej strony umowy:\n` +
        lista(skroc(wpisy)) +
        `\n    Przedrostek \`on-\` nie jest ozdobnikiem nazwy: to jedyne miejsce, w którym ` +
        `skórka deklaruje parę tekst/tło wprost. ${ogon}`,
      regula,
    );
  if (bezPowierzchni.length)
    throw bladPary(
      bezPowierzchni,
      'on-bez-powierzchni',
      `Tekst dla powierzchni, której nie ma, jest nazwą obiecującą parę tam, gdzie ` +
        `nie ma nawet jednej strony.`,
    );
  if (martwe_.length)
    throw bladPary(
      martwe_,
      'on-martwa',
      `Para martwa wygląda jak pokrycie i nim nie jest — dokładnie jak martwe słowo ` +
        `w słowniku (punkt 4).`,
    );

  const publicznych = publiczne.size;
  return {
    opis:
      `${nazwy.length} tokenów (${publicznych} publicznych, ` +
      `${nazwy.length - publicznych} prywatnych), ` +
      `${entrypointy.size} entrypointów, ` +
      `${malowane.size} kolorów malowanych w ${arkusze.length} arkuszach, ` +
      `${kontrast.checks.length} par w policy`,
    snapshot: tresc,
  };
};

/**
 * Co arkusze NAPRAWDĘ malują którym tokenem — z wyjścia sassa, nie z tekstu
 * źródła (ten sam powód co punkt 2 w `check-styles`: właściwość złożona mixinem
 * albo interpolacją dociera do przeglądarki, nie stojąc w tekście nigdzie).
 *
 * Role są trzy, bo tyle progów ma WCAG: tło i tekst (SC 1.4.3) oraz obrys
 * (SC 1.4.11). Właściwość spoza tej listy nie wnosi koloru do oceny kontrastu —
 * `transition: background-color …` wymienia nazwę właściwości, a nie maluje nią.
 *
 * Przypisania do innej custom property (`--pct-button-height: var(--pct-button-height-sm)`
 * — wzorzec osi wielkości) są ROZWIJANE do punktu stałego: token po prawej dziedziczy
 * role tokenu po lewej. Bez tego `--pct-button-bg: var(--pct-surface-100)` w arkuszu
 * ukryłby powierzchnię przed mianownikiem, a wyglądałoby to jak brak problemu.
 * Zmierzone, nie założone: dziś ten wzorzec dotyczy wyłącznie osi wielkości, czyli
 * tokenów wymiaru, więc nie wnosi ani jednej roli koloru.
 */
const malowaneKolory = (arkusze) => {
  const ROLE = [
    [/^background(-color)?$/, 'tło'],
    [/^(color|fill|stroke|caret-color|-webkit-text-fill-color)$/, 'tekst'],
    [
      /^border(-(block|inline)(-(start|end))?)?(-color)?$|^outline(-color)?$/,
      'obrys',
    ],
  ];
  const bezposrednie = new Map(); // token -> Set(rola)
  const przypisania = new Map(); // token docelowy -> Set(tokenów po prawej)

  for (const { css } of arkusze)
    for (const [, wlasciwosc, wartosc] of css.matchAll(
      /^\s*(-{0,2}[a-z][a-z0-9-]*)\s*:\s*([^;{}]+);/gm,
    )) {
      const uzyte = [...wartosc.matchAll(/var\(\s*(--pct-[a-z0-9-]+)/g)].map(
        (m) => m[1],
      );
      if (!uzyte.length) continue;
      if (wlasciwosc.startsWith('--')) {
        const wpis = przypisania.get(wlasciwosc) ?? new Set();
        for (const t of uzyte) wpis.add(t);
        przypisania.set(wlasciwosc, wpis);
        continue;
      }
      const rola = ROLE.find(([wzorzec]) => wzorzec.test(wlasciwosc))?.[1];
      if (!rola) continue;
      for (const t of uzyte)
        bezposrednie.set(t, (bezposrednie.get(t) ?? new Set()).add(rola));
    }

  const malowane = new Map([...bezposrednie].map(([t, r]) => [t, new Set(r)]));
  for (let zmiana = true; zmiana;) {
    zmiana = false;
    for (const [cel, zrodla] of przypisania) {
      const role = malowane.get(cel);
      if (!role) continue;
      for (const t of zrodla) {
        const dotychczas = malowane.get(t) ?? new Set();
        const przed = dotychczas.size;
        for (const r of role) dotychczas.add(r);
        malowane.set(t, dotychczas);
        if (dotychczas.size !== przed) zmiana = true;
      }
    }
  }
  return { malowane, przypisania: przypisania.size > 0 };
};

/** Porównanie jednej powierzchni z listą, którą ma nieść. */
const porownajPowierzchnie = (gdzie, ma, powinna, czym) => {
  const brakuje = [...powinna].filter((n) => !ma.has(n)).sort();
  const nadmiar = [...ma].filter((n) => !powinna.has(n)).sort();
  if (!brakuje.length && !nadmiar.length) return;
  throw new BladTokenu(
    'powierzchnia',
    `${gdzie} nie niesie tego, co ma nieść (${czym}):\n` +
      (brakuje.length
        ? `    brakuje (${brakuje.length}):\n` + lista(skroc(brakuje)) + '\n'
        : '') +
      (nadmiar.length
        ? `    nadmiarowe (${nadmiar.length}):\n` + lista(skroc(nadmiar)) + '\n'
        : '') +
      `    Konsument widzi tokeny przez te artefakty, nie przez źródła DTCG. Token bez ` +
      `wpisu w \`tokens.ts\` nie jest chroniony przed literówką w \`getPropertyValue\` ` +
      `(lesson-43), a token nadmiarowy obiecuje deklarację, której w skórce nie ma.`,
  );
};

/** Liście DTCG: `[ścieżka, $type, $value]` dla każdego węzła z `$value`. */
function* liscie(drzewo, prefiks = []) {
  for (const [klucz, wartosc] of Object.entries(drzewo)) {
    if (klucz.startsWith('$')) continue;
    if (!wartosc || typeof wartosc !== 'object') continue;
    const sciezka = [...prefiks, klucz];
    if ('$value' in wartosc)
      yield [sciezka.join('.'), wartosc.$type, wartosc.$value];
    else yield* liscie(wartosc, sciezka);
  }
}

/** Ścieżka DTCG, na którą wskazuje wartość `{a.b.c}` — albo `null` dla literału. */
const odwolanie = (wartosc) =>
  typeof wartosc === 'string'
    ? (wartosc.match(/^\{([^}]+)\}$/)?.[1] ?? null)
    : null;

/**
 * Warstwa tokenu z nazw plików, w których stoi. `motion.reduced.json` nadpisuje
 * prymitywy osi ruchu, a `semantic.dark.json` — semantykę, więc token bywa
 * w dwóch plikach; warstwa musi z nich wyjść jedna.
 */
const warstwa = (pliki) => {
  const nazwy = pliki.map((p) =>
    p
      .split('/')
      .pop()
      .replace(/\.json$/, ''),
  );
  const znalezione = new Set();
  let komponent = null;
  for (const nazwa of nazwy) {
    if (nazwa === 'primitive' || nazwa.startsWith('motion.'))
      znalezione.add('prymitywny');
    else if (nazwa.startsWith('semantic.')) znalezione.add('semantyczny');
    else if (nazwa.startsWith('component.')) {
      znalezione.add('komponentowy');
      komponent = nazwa.slice('component.'.length);
    } else znalezione.add(`?${nazwa}`);
  }
  if (znalezione.size !== 1 || [...znalezione][0].startsWith('?'))
    return {
      warstwa: null,
      komponent: null,
      powod:
        znalezione.size > 1
          ? `dwie warstwy naraz: ${pliki.join(', ')}`
          : `nierozpoznany plik: ${pliki.join(', ')}`,
    };
  return { warstwa: [...znalezione][0], komponent, powod: null };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * Snapshot jest w markdownie, ale jego treść to blok kodu bez wyrównania kolumn.
 * To nie estetyka: tabela markdowna po przejściu prettiera wyrównuje kolumny do
 * najdłuższej komórki, więc jeden długi token przepisuje CAŁY plik i diff
 * przestaje pokazywać, co się naprawdę zmieniło — czyli traci jedyną funkcję,
 * dla której ten plik istnieje.
 */
const renderujSnapshot = (nazwy, prywatny) =>
  [
    '# Snapshot nazw tokenów',
    '',
    '> **Ten plik jest generowany.** Nie edytuj go ręcznie —',
    '> `node tools/check-tokens.mjs --write`. Bramka `check-tokens` odrzuca rozjazd.',
    '',
    'Nazwa tokenu jest publicznym API motywu tak samo jak nazwa inputu jest publicznym',
    'API komponentu — z tą różnicą, że jej zmiana nie daje ani jednego czerwonego testu,',
    'bo biblioteka przemianowuje obie strony naraz: token i arkusz, który go używa.',
    'Konsumentowi zostaje nadpisanie wskazujące donikąd.',
    '',
    'Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —',
    'znaczy „zmiana publicznego API, która ma być widoczna w review".',
    '',
    'Kolumny: nazwa custom property · `$type` z DTCG · warstwa · czy jest w publicznej',
    'unii `PctCssVar` (patrz `prywatne.prefiksy` w',
    '[`src/nazwy.policy.json`](src/nazwy.policy.json)).',
    '',
    '```',
    ...nazwy.map((n) =>
      [
        n.nazwa,
        n.typ,
        n.warstwa,
        prywatny(n.sciezka) ? 'prywatny' : 'publiczny',
      ].join(' '),
    ),
    '```',
    '',
  ].join('\n');

/** Same wiersze danych — do policzenia różnicy, bez nagłówka. */
const wierszeSnapshotu = (tresc) =>
  new Set(tresc.split('\n').filter((w) => w.startsWith('--pct-')));

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

/**
 * Wejście złożone z listy plików — ta sama postać dla repozytorium i dla
 * fixture'a. `dist/` czyta się poza tą listą, bo jest gitignorowane: dla
 * repozytorium powstaje z `dependsOn: build`, dla fixture'a — z uruchomienia
 * tego samego `build.mjs`.
 */
const zbierzWejscie = (root, pliki) => {
  const dist = join(root, TOKENY, 'dist');
  for (const plik of ['pct.css', 'tokens.ts', '_tokens.scss'])
    if (!existsSync(join(dist, plik)))
      throw new BladTokenu(
        'zbior',
        `brak \`${TOKENY}/dist/${plik}\` — bramka czyta artefakty, nie same źródła.\n` +
          `    Target musi mieć \`dependsOn\` na build tokenów.`,
      );

  const zrodla = pliki
    .filter((p) => p.startsWith(`${TOKENY}/src/`) && p.endsWith('.json'))
    .map((plik) => ({ plik, drzewo: JSON.parse(czytaj(root, plik)) }))
    // DTCG rozpoznaje się po KORZENIU `pct`, a nie po wzorcu nazwy pliku
    // powtórzonym z generatora — patrz komentarz przy punkcie 1.
    .filter(
      ({ drzewo }) => drzewo && typeof drzewo === 'object' && 'pct' in drzewo,
    );

  // Arkusze biblioteki — wyłącznie `libs/components`, i wyłącznie te, których
  // treść jest pisana ręką: `libs/components/themes/` wiezie WYGENEROWANE
  // artefakty tokenów (`_tokens.scss` to lista `$zmienna: var(--pct-…)`), więc
  // policzenie ich jako malowania dopisałoby do mianownika każdy token skórki
  // naraz i punkt 7 żądałby pary dla całej rampy prymitywów.
  const arkusze = pliki
    .filter(
      (p) =>
        p.startsWith(`${KOMPONENTY}/`) &&
        p.endsWith('.scss') &&
        !p.startsWith(`${KOMPONENTY}/themes/`),
    )
    .map((plik) => ({
      plik,
      css: sass.compile(join(root, plik), { style: 'expanded' }).css,
    }));

  return {
    polityka: JSON.parse(czytaj(root, POLITYKA)),
    poziomy: JSON.parse(czytaj(root, POZIOMY)),
    kontrast: JSON.parse(czytaj(root, KONTRAST)),
    zrodla,
    arkusze,
    css: czytaj(root, `${TOKENY}/dist/pct.css`),
    ts: czytaj(root, `${TOKENY}/dist/tokens.ts`),
    scss: czytaj(root, `${TOKENY}/dist/_tokens.scss`),
    snapshot: existsSync(join(root, SNAPSHOT)) ? czytaj(root, SNAPSHOT) : null,
    entrypointy: new Set(
      pliki
        .filter((p) =>
          new RegExp(`^${KOMPONENTY}/[^/]+/ng-package\\.json$`).test(p),
        )
        .map((p) => p.split('/')[2]),
    ),
  };
};

/**
 * Pliki z INDEKSU GITA, nie z globa po dysku — ten sam powód co w `check-styles`,
 * `check-zoneless` i `check-typecheck`: indeks jest niezależnym spisem tego, co
 * repozytorium naprawdę wiezie, i sam z siebie odcina to, co generowane.
 *
 * Pathspec jest KATALOGIEM, a filtrowanie siedzi w JS-ie: pathspec gita nie jest
 * globem powłoki i bez `:(glob)` gwiazdka przechodzi przez `/`, więc wzorzec
 * z gwiazdką potrafi zwrócić ZERO plików zamiast błędu (lesson-48).
 */
const plikiRepozytorium = () =>
  execFileSync('git', ['ls-files', '-z', TOKENY, KOMPONENTY], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Składa spreparowane wejście: kopia bazy, na nią pliki przypadku, usunięcia
 * z `fixture.json`, potem PRAWDZIWY `build.mjs` z repozytorium — i na końcu
 * jeszcze raz pliki przypadku, żeby przypadek mógł podmienić także artefakt
 * w `dist/`.
 *
 * Ta ostatnia warstwa jest jedynym sposobem na kontrolę odniesienia dla punktów
 * 1 i 2: gdyby fixture zawsze dostawał `dist/` wygenerowane ze swoich źródeł,
 * artefakt byłby z nimi zgodny z definicji, a oba punkty nie miałyby jak zapalić.
 * Uruchamiamy przy tym generator z repozytorium, a nie jego kopię w fixtures —
 * inaczej kontrola sprawdzałaby nieaktualne zdanie o tym, co robi build.
 *
 * Spreparowany `tokens.ts` leży w repozytorium jako `tokens.ts.txt` i staje się
 * `.ts` dopiero tutaj — ten sam ruch co w `check-styles` i z tego samego powodu:
 * plik `.ts` w `tools/` nie należy do żadnego programu kompilatora, więc zapaliłby
 * `check-typecheck` (punkt 1 — plik bez projektu). Fixture jednej bramki nie może
 * być wadą dla drugiej. Zmierzone, nie przewidziane: bramka typechecku zapaliła na
 * nim przy pierwszym przebiegu po dodaniu pliku do indeksu gita.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-tokens-'));
  const overlay = () =>
    cpSync(join(FIXTURES, nazwa), cel, {
      recursive: true,
      filter: (src) => !src.endsWith('fixture.json'),
    });

  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  if (nazwa !== BAZA) overlay();
  for (const sciezka of fx.usun ?? [])
    rmSync(join(cel, sciezka), { recursive: true, force: true });

  cpSync(join(ROOT, TOKENY, 'build.mjs'), join(cel, TOKENY, 'build.mjs'));
  execFileSync(process.execPath, ['build.mjs'], {
    cwd: join(cel, TOKENY),
    stdio: 'pipe',
  });
  if (nazwa !== BAZA) overlay();
  for (const plik of globSync('**/*.ts.txt', { cwd: cel }))
    renameSync(join(cel, plik), join(cel, plik.replace(/\.txt$/, '')));
  return cel;
};

const wejscieFixture = (katalog) =>
  zbierzWejscie(
    katalog,
    globSync('**/*.{json,scss}', { cwd: katalog })
      .map((p) => p.split('\\').join('/'))
      .sort(),
  );

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

// Ścieżka utrzymaniowa: przepisz snapshot fixture'a i wyjdź. Nie miesza się
// z przebiegiem sprawdzającym, bo to nie jest sprawdzanie — to jest złożenie
// wejścia wzorcowego z tego samego renderera, którym mierzy się repozytorium.
if (WRITE_FIXTURE) {
  const katalog = zlozFixture(WRITE_FIXTURE, {});
  const cel = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    sprawdzTokeny(wejscieFixture(katalog));
    console.log(`✓ ${WRITE_FIXTURE}: snapshot był już aktualny.`);
  } catch (blad) {
    if (!(blad instanceof BladTokenu) || blad.kontrola !== 'snapshot')
      throw blad;
    writeFileSync(cel, blad.snapshot);
    console.log(`✓ Rewrote ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const wynik = sprawdzTokeny(zbierzWejscie(ROOT, plikiRepozytorium()));
  opis = wynik.opis;
} catch (blad) {
  if (!(blad instanceof BladTokenu)) throw blad;
  // `--write` istnieje po to, żeby rozjazd snapshotu dało się zaakceptować
  // jednym poleceniem. Wszystkie pozostałe punkty zostają błędem także z nim:
  // przepisanie snapshotu nie jest odpowiedzią na nazwę spoza schematu.
  if (WRITE && blad.kontrola === 'snapshot') {
    writeFileSync(join(ROOT, SNAPSHOT), blad.snapshot);
    console.log(
      `✓ Rewrote ${SNAPSHOT}. Run the gate once more — the negative control did not run ` +
        `in this pass.`,
    );
    process.exit(0);
  }
  problems.push(`${blad.kontrola}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-tokens.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść: gdyby baza sama była wadliwa, każdy przypadek
// zapalałby z jej powodu, a nie ze swojego, i wszystkie „odrzucone" byłyby
// fałszywe — czyli ta kontrola stałaby się tym, przed czym stoi.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzTokeny(wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladTokenu)) throw blad;
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
    sprawdzTokeny(wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTokenu)) throw blad;
    if (blad.kontrola !== fx.kontrola)
      problems.push(
        `${nazwa}: check \`${blad.kontrola}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}\`) was meant to — the fixture proves something other than what it declares`,
      );
    // Punkt to nie jedno zdanie (lesson-50). Przypadek, który deklaruje regułę,
    // musi zapalić na NIEJ, a nie na sąsiedniej regule tego samego punktu —
    // inaczej identyfikator punktu potwierdza wyłącznie sam siebie.
    else if (fx.regula && blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: w punkcie ${fx.punkt} rule \`${blad.regula}\` fired, and \`${fx.regula}\` — ten sam punkt, inne zdanie`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Token gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Tokens: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
