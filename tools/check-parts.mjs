#!/usr/bin/env node
/**
 * Bramka inwentarza części: pilnuje obietnicy `req-api-parts` — że atrybuty
 * `data-pct-part` są SPISANE i WERSJONOWANE, więc konsument może celować w nie
 * selektorem, który przeżyje aktualizację biblioteki.
 *
 * Powód istnienia. `data-pct-part` jest jedyną drogą zaawansowanego stylowania,
 * jaką ta biblioteka zostawia (decyzja 0013) — i jedynym publicznym API, którego
 * zmiana nie daje ani jednego czerwonego testu. Przemianowanie części zmienia
 * szablon i arkusz naraz, więc wszystko w repozytorium dalej się zgadza; psuje
 * się wyłącznie u kogoś, kto tę nazwę wpisał u siebie. Dziś atrybuty są
 * wystawiane, ale nikt ich nie liczy: `docs/components/field.md` do 2026-07-27
 * wymieniał 7 części z jedenastu i nikt tego nie zauważył, bo nie było czym.
 *
 * Sprawdzane jest pięć rzeczy:
 *  1. MIANOWNIK: parser widzi każdy dekorator, każdy szablon należy do
 *     komponentu i każde wystąpienie `data-pct-part` w szablonie zostało
 *     rozpoznane,
 *  2. ZBIÓR: części odczytane ze źródeł zgadzają się z odczytanymi ze
 *     ZBUDOWANEGO pakietu — i żadna strona nie jest pusta,
 *  3. STATYCZNOŚĆ: nazwa części nigdzie nie jest wiązana wyrażeniem,
 *  4. POWIERZCHNIA: rubryki **Parts** w `docs/components/` niosą dokładnie te
 *     nazwy, które wystawia entrypoint,
 *  5. SNAPSHOT: wersjonowany inwentarz zgadza się z bieżącym.
 *
 * Punkty 3 i 5 to same reguły; punkty 1, 2 i 4 pilnują MIANOWNIKA, z którego te
 * reguły powstają — tego samego, który w A2 kurczył się jako próbka plików
 * w raporcie pokrycia, w A5 jako zbiór deklaracji widzianych przez skaner, a w A6
 * jako zbiór mierzonych komponentów. Tutaj kurczy się zbiór CZĘŚCI: część,
 * której bramka nie zobaczy, wejdzie do pakietu bez wpisu w inwentarzu, a punkt 5
 * potwierdzi, że „nic się nie zmieniło".
 *
 * Skąd biorą się dwa odczyty. Odczyt ze źródeł czyta szablony i bloki `host`
 * z indeksu gita. Odczyt z pakietu wczytuje `dist/` przez JIT (`import
 * '@angular/compiler'`, ten sam krok co w `check-zoneless`) i pyta o `ɵcmp.consts`
 * oraz `ɵdir.hostAttrs`, czyli o wynik PRAWDZIWEGO parsera szablonów Angulara.
 * Niezależność jest tu całą wartością: pierwszy łapie część, która jest
 * w szablonie, a nie dojechała do pakietu (komponent bez eksportu, nieaktualne
 * `dist`); drugi — część, której nasz skaner nie rozumie, bo powstała z szablonu
 * wpisanego w dekorator, z mixinu obiektu `host` albo ze składni, na którą regex
 * jest ślepy. To ten sam ruch co „nie czytaj `include`, uruchom kompilator" (A7)
 * i „czytaj `ɵcmp` z `dist`, nie ze źródła" (A6).
 *
 * Do tego szósty przebieg, który nie bada biblioteki, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-parts.fixtures/` (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-parts.mjs                    sprawdza
 *   node tools/check-parts.mjs --write            przepisuje snapshot repozytorium
 *   node tools/check-parts.mjs --write <fixture>  przepisuje snapshot fixture'a
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
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const DOKUMENTY = 'docs/components';
const SNAPSHOT = `${PROJEKT}/czesci.snapshot.md`;
const FIXTURES = join(ROOT, 'tools/check-parts.fixtures');
const BAZA = '_poprawny';

const WRITE = process.argv.includes('--write');
const WRITE_FIXTURE = (() => {
  const kolejny = process.argv[process.argv.indexOf('--write') + 1];
  return WRITE && kolejny && !kolejny.startsWith('--') ? kolejny : null;
})();

const ATRYBUT = 'data-pct-part';

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

const posortuj = (zbior) => [...zbior].sort();

// ── skanery źródła ────────────────────────────────────────────────────────────

/**
 * Dekorator komponentu albo dyrektywy w źródle. Kotwiczy się na formatowaniu,
 * które wymusza `nx format:check` (`@Component({` i `})` w kolumnie zero) — i
 * właśnie dlatego liczba dopasowań jest osobno porównywana z licznikiem, który
 * tej kotwicy NIE powtarza. Licznik dopuszcza wcięcie, bo powtórzenie kotwicy
 * gasiłoby obie strony porównania naraz i punkt 1 przechodziłby, przestawszy
 * mierzyć cały komponent (`lesson-48`). Wystąpienia w komentarzu odsiewa
 * `[ \t]*` — linia JSDoc zaczyna się od gwiazdki.
 *
 * `@Directive` jest tu razem z `@Component`, bo cztery części obudowy
 * (`field-prefix-item`, `field-suffix-item`, `field-label-aux-item`,
 * `field-message-aux-item`) siedzą wyłącznie w blokach `host` dyrektyw. Bramka
 * czytająca same komponenty orzekałaby o inwentarzu bez nich.
 */
const DEKORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DEKORATOR_LICZNIK = /^[ \t]*@(?:Component|Directive)\(/gm;

/** `templateUrl: './x.html'` — jedno wystąpienie na dekorator. */
const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
/** `template:` w dekoratorze — wartość dosłowna, żeby odróżnić pusty od reszty. */
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** `'data-pct-part': 'nazwa'` w bloku `host`. */
const HOST_STATYCZNY = new RegExp(
  `(['"])${ATRYBUT}\\1\\s*:\\s*(['"])([^'"]*)\\2`,
  'g',
);
/** `'[attr.data-pct-part]': 'wyrażenie()'` — nazwa części z wyrażenia. */
const HOST_DYNAMICZNY = new RegExp(
  `(['"])\\[attr\\.${ATRYBUT}\\]\\1\\s*:`,
  'g',
);

/** `data-pct-part="nazwa"` w szablonie. */
const SZABLON_STATYCZNY = new RegExp(
  `${ATRYBUT}\\s*=\\s*(['"])([^'"]*)\\1`,
  'g',
);
/** `[attr.data-pct-part]="wyrażenie"` w szablonie. */
const SZABLON_DYNAMICZNY = new RegExp(`\\[attr\\.${ATRYBUT}\\]\\s*=`, 'g');
/** Niezależny licznik: KAŻDE wystąpienie nazwy atrybutu w tekście szablonu. */
const SZABLON_LICZNIK = new RegExp(ATRYBUT, 'g');

const ile = (tekst, wzorzec) => (tekst.match(wzorzec) ?? []).length;

/**
 * Entrypoint z układu katalogów: `libs/components/select/src/select.ts` →
 * `./select`, a `libs/components/src/index.ts` → `.`. Ta sama postać, w jakiej
 * klucze stoją w mapie `exports` spakowanego manifestu, więc punkt 2 porównuje
 * przynależność bez tłumaczenia jednej konwencji na drugą.
 */
const entrypointZeSciezki = (plik) => {
  const segment = plik.slice(`${PROJEKT}/`.length).split('/')[0];
  return segment === 'src' ? '.' : `./${segment}`;
};

/**
 * Klasy z dekoratorami — `[{ plik, klasa, entrypoint, szablon, inline, czesci,
 * dynamiczne }]`. `czesci` biorą się tu wyłącznie z bloku `host`; części
 * z szablonu dokleja punkt 1, bo szablon jest osobnym plikiem i osobnym
 * mianownikiem — jego skan musi się najpierw obronić.
 *
 * Blok `host` bywa składany rozwinięciem cudzego obiektu (`...fitHost`
 * w `field/src/affix.ts`) i ten skaner tego nie widzi — świadomie. Część wniesiona
 * takim rozwinięciem pojawi się w odczycie z pakietu i zniknie z odczytu ze
 * źródeł, czyli zapali punkt 2 z nazwą części w komunikacie. To jest dokładnie
 * ta praca, którą ma wykonywać drugi odczyt.
 */
const czytajZrodla = (root, pliki) => {
  const klasy = [];
  let deklaracji = 0;

  for (const plik of pliki) {
    const tresc = readFileSync(join(root, plik), 'utf8');
    deklaracji += ile(tresc, DEKORATOR_LICZNIK);

    for (const [, rodzaj, cialo, klasa] of tresc.matchAll(DEKORATOR)) {
      const url = TEMPLATE_URL.exec(cialo);
      const inline = TEMPLATE_INLINE.exec(cialo);
      klasy.push({
        plik,
        klasa,
        rodzaj,
        entrypoint: entrypointZeSciezki(plik),
        szablon: url
          ? relative(root, resolve(join(root, dirname(plik)), url[2]))
              .split('\\')
              .join('/')
          : null,
        // Pusty szablon (`template: ''` w `number.ts` i `text.ts`) nie może
        // wnieść części, więc nie jest dziurą w mianowniku. Każdy inny zapis
        // wpisany w dekorator już nią jest.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        czesci: new Set([...cialo.matchAll(HOST_STATYCZNY)].map((m) => m[3])),
        dynamiczne: ile(cialo, HOST_DYNAMICZNY),
      });
    }
  }

  return { klasy, deklaracji };
};

/**
 * Szablon: części statyczne, liczba wiązań i licznik wszystkich wystąpień.
 *
 * Wartość z interpolacją (`data-pct-part="{{nazwa()}}"`) jest wiązaniem, mimo że
 * wygląda jak literał — zmierzone: Angular emituje ją do `consts` jako
 * `[3, 'data-pct-part']`, czyli po markerze wiązań, i wypisuje nazwę atrybutu do
 * treści funkcji szablonu. Bez tego rozróżnienia skaner wpisałby do inwentarza
 * część o nazwie `{{nazwa()}}`, a punkt 3 nigdy by jej nie zobaczył.
 */
const czytajSzablon = (tresc) => {
  const trafienia = [...tresc.matchAll(SZABLON_STATYCZNY)].map((m) => m[2]);
  const interpolowane = trafienia.filter((w) => w.includes('{{'));
  return {
    czesci: trafienia.filter((w) => !w.includes('{{')),
    dynamiczne: ile(tresc, SZABLON_DYNAMICZNY) + interpolowane.length,
    wystapien: ile(tresc, SZABLON_LICZNIK),
  };
};

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Naruszenie jednej z pięciu kontroli — z identyfikatorem, nie tylko
 * komunikatem. Kontrola odniesienia musi sprawdzić, że spreparowane wejście
 * zapaliło NA SWOIM punkcie: wejście wywalające się z innego powodu, niż
 * deklaruje, dowodzi czegoś innego, niż deklaruje.
 */
class BladCzesci extends Error {
  constructor(kontrola, opis) {
    super(opis);
    this.kontrola = kontrola;
  }
}

/**
 * Komplet kontroli na gotowym wejściu:
 *   `klasy`, `deklaracji` — z dekoratorów w źródłach (odczyt A),
 *   `szablony`   — `[{ plik, tresc }]` wszystkich szablonów projektu,
 *   `pakiet`     — `[{ wejscie, klasa, czesci, dynamiczne }]` ze zbudowanego
 *                  pakietu (odczyt B),
 *   `dokumenty`  — `[{ plik, entrypoint, czesci }]` z `docs/components/`,
 *   `entrypointy`— klucze mapy `exports` spakowanego manifestu,
 *   `snapshot`   — treść pliku albo `null`.
 * Rzuca `BladCzesci` przy pierwszym naruszeniu i zwraca `{ opis, snapshot }` —
 * wyrenderowany snapshot wraca także z przebiegu sprawdzającego, bo `--write` ma
 * zapisać dokładnie to, co bramka przed chwilą policzyła, a nie policzyć drugi
 * raz osobną ścieżką.
 */
const sprawdzCzesci = (we) => {
  const { klasy, deklaracji, szablony, pakiet, dokumenty, entrypointy } = we;

  // 1. MIANOWNIK. Zanim cokolwiek porównamy, odczyt ze źródeł musi umieć
  //    powiedzieć, że widział wszystko, co miał zobaczyć. Bez tego punkt 2
  //    porównywałby dwie listy, z których jedna po cichu się skurczyła.
  if (!klasy.length)
    throw new BladCzesci(
      'mianownik',
      `nie znalazłem ani jednego dekoratora \`@Component\`/\`@Directive\` w źródłach ` +
        `(${PROJEKT}) — porównanie z licznikiem przeszłoby wtedy zawsze, bo zero równa ` +
        `się zeru (lesson-48).\n    Najczęstsza przyczyna: lista plików źródłowych ` +
        `przestała cokolwiek zwracać.`,
    );

  if (klasy.length !== deklaracji)
    throw new BladCzesci(
      'mianownik',
      `parser rozpoznał ${klasy.length} z ${deklaracji} dekoratorów — reszta wypadłaby ` +
        `z inwentarza bez śladu. Najczęstsza przyczyna: dekorator zapisany inaczej, niż ` +
        `formatuje prettier (\`@Component({\` i \`})\` w kolumnie zero).`,
    );

  const inline = klasy.filter((k) => k.inline);
  if (inline.length)
    throw new BladCzesci(
      'mianownik',
      `${inline.length} klas bierze szablon z dekoratora, a nie z pliku:\n` +
        lista(inline.map((k) => `${k.plik}: ${k.klasa}`)) +
        `\n    Skaner źródeł czyta szablony, nie dekoratory, więc części zapisane tam ` +
        `zobaczy dopiero odczyt z pakietu — czyli jako rozjazd dwóch list, a nie jako ` +
        `to, czym są. Wynieś szablon do \`templateUrl\`.`,
    );

  const uzywane = new Map(); // szablon -> [klasy]
  for (const k of klasy)
    if (k.szablon)
      uzywane.set(k.szablon, [...(uzywane.get(k.szablon) ?? []), k]);

  const znane = new Set(szablony.map((s) => s.plik));
  const brakujace = [...uzywane.keys()].filter((s) => !znane.has(s));
  if (brakujace.length)
    throw new BladCzesci(
      'mianownik',
      `${brakujace.length} szablonów wskazanych przez \`templateUrl\` nie ma na liście ` +
        `plików bramki:\n` +
        lista(brakujace) +
        `\n    Ich części nie wejdą do inwentarza. Najczęstsza przyczyna: plik poza ` +
        `indeksem gita albo pathspec, który przestał go obejmować.`,
    );

  const osierocone = szablony.filter((s) => !uzywane.has(s.plik));
  if (osierocone.length)
    throw new BladCzesci(
      'mianownik',
      `${osierocone.length} szablonów nie należy do żadnego dekoratora:\n` +
        lista(osierocone.map((s) => s.plik)) +
        `\n    Skaner przypisuje części do klasy przez \`templateUrl\`; szablon, do którego ` +
        `nikt nie wskazuje, jest dla inwentarza niewidzialny — a do przeglądarki jedzie ` +
        `tak samo jak każdy inny.`,
    );

  const skany = new Map(szablony.map((s) => [s.plik, czytajSzablon(s.tresc)]));
  const nierozpoznane = szablony
    .map((s) => ({ plik: s.plik, ...skany.get(s.plik) }))
    .filter((s) => s.czesci.length + s.dynamiczne !== s.wystapien);
  if (nierozpoznane.length)
    throw new BladCzesci(
      'mianownik',
      `${nierozpoznane.length} szablonów ma wystąpienia \`${ATRYBUT}\`, których skaner ` +
        `nie rozpoznał:\n` +
        lista(
          nierozpoznane.map(
            (s) =>
              `${s.plik}: rozpoznane ${s.czesci.length} statycznych + ` +
              `${s.dynamiczne} wiązanych, a nazwa atrybutu pada ${s.wystapien} razy`,
          ),
        ) +
        `\n    Licznik jest niezależny od skanera właśnie po to: część zapisana składnią, ` +
        `na którą regex jest ślepy, ma wypaść z inwentarza GŁOŚNO, a nie po cichu.`,
    );

  // Części ze źródeł: blok `host` plus szablon wskazany przez `templateUrl`.
  const zeZrodel = new Map(); // klasa -> { entrypoint, plik, czesci, dynamiczne }
  for (const k of klasy) {
    const zeSzablonu = k.szablon ? skany.get(k.szablon) : null;
    const czesci = new Set([...k.czesci, ...(zeSzablonu?.czesci ?? [])]);
    if (!czesci.size && !k.dynamiczne && !zeSzablonu?.dynamiczne) continue;
    zeZrodel.set(k.klasa, {
      entrypoint: k.entrypoint,
      plik: k.plik,
      czesci,
      dynamiczne: k.dynamiczne + (zeSzablonu?.dynamiczne ?? 0),
    });
  }

  // 2. ZBIÓR — dwa niezależne odczyty tej samej listy.
  //
  //    Odczyt A (wyżej) czyta ŹRÓDŁA: tekst szablonu i tekst dekoratora.
  //    Odczyt B czyta ZBUDOWANY PAKIET przez JIT, czyli wynik prawdziwego
  //    parsera szablonów Angulara. Gdyby lista brała się tylko ze źródeł,
  //    komponent, który wypadł z pakietu, dalej miałby swoje części
  //    w inwentarzu — a konsument nie miałby ich w ogóle. Gdyby tylko
  //    z pakietu — część wniesiona składnią, której nasz skaner nie rozumie,
  //    weszłaby do inwentarza jako fakt dokonany, bez linii w diffie.
  const zPakietu = new Map(
    pakiet
      .filter((p) => p.czesci.length || p.dynamiczne)
      .map((p) => [
        p.klasa,
        {
          entrypoint: p.wejscie,
          czesci: new Set(p.czesci),
          dynamiczne: p.dynamiczne,
        },
      ]),
  );

  if (!zeZrodel.size || !zPakietu.size)
    throw new BladCzesci(
      'zbior',
      `pusty zbiór części (źródła: ${zeZrodel.size} klas, pakiet: ${zPakietu.size}) — ` +
        `wszystkie dalsze punkty przeszłyby wtedy, nie orzekając o niczym.\n` +
        `    Najczęstsza przyczyna: nieaktualne albo puste \`${DIST}\` (bramka wymaga ` +
        `\`dependsOn: build\`) albo lista plików, która przestała cokolwiek zwracać.`,
    );

  const rozjazdy = [];
  for (const klasa of new Set([
    ...zeZrodel.keys(),
    ...zPakietu.keys(),
  ]).values()) {
    const a = zeZrodel.get(klasa);
    const b = zPakietu.get(klasa);
    if (!b) {
      rozjazdy.push(
        `${klasa} (${a.plik}): części w źródłach, a klasy nie ma w pakiecie — ` +
          `${posortuj(a.czesci).join(', ')}`,
      );
      continue;
    }
    if (!a) {
      rozjazdy.push(
        `${klasa} (${b.entrypoint}): części w pakiecie, a klasy nie widzi skaner źródeł — ` +
          `${posortuj(b.czesci).join(', ')}`,
      );
      continue;
    }
    if (a.entrypoint !== b.entrypoint)
      rozjazdy.push(
        `${klasa}: leży w \`${a.entrypoint}\`, a pakiet eksportuje ją z \`${b.entrypoint}\``,
      );
    const brakWPakiecie = posortuj(a.czesci).filter((c) => !b.czesci.has(c));
    const brakWZrodlach = posortuj(b.czesci).filter((c) => !a.czesci.has(c));
    if (brakWPakiecie.length)
      rozjazdy.push(
        `${klasa}: w źródłach, a nie w pakiecie — ${brakWPakiecie.join(', ')}`,
      );
    if (brakWZrodlach.length)
      rozjazdy.push(
        `${klasa}: w pakiecie, a nie w źródłach — ${brakWZrodlach.join(', ')}`,
      );
  }
  if (rozjazdy.length)
    throw new BladCzesci(
      'zbior',
      `dwa odczyty inwentarza się nie zgadzają (${rozjazdy.length}):\n` +
        lista(skroc(rozjazdy, 12)) +
        `\n    Pierwsze to część, która nie dojechała do konsumenta (komponent bez ` +
        `eksportu albo nieaktualne \`dist\`); drugie — część, której nie widzi skaner ` +
        `źródeł, więc weszłaby do pakietu bez linii w diffie.`,
    );

  // 3. STATYCZNOŚĆ. Nazwa złożona w runtime nie daje się spisać ani zamrozić:
  //    inwentarz i snapshot byłyby wtedy zielone dokładnie dlatego, że nie mają
  //    czego zobaczyć. Mierzone po obu stronach — w źródłach jako `[attr.…]`,
  //    w pakiecie jako wystąpienie nazwy atrybutu w treści skompilowanej funkcji
  //    szablonu (atrybut wiązany nie trafia do `consts`, tylko do instrukcji).
  const wiazane = [
    ...[...zeZrodel]
      .filter(([, w]) => w.dynamiczne)
      .map(([klasa, w]) => `${klasa} (${w.plik}): ${w.dynamiczne} w źródłach`),
    ...[...zPakietu]
      .filter(([, w]) => w.dynamiczne)
      .map(
        ([klasa, w]) =>
          `${klasa} (${w.entrypoint}): ${w.dynamiczne} w pakiecie`,
      ),
  ];
  if (wiazane.length)
    throw new BladCzesci(
      'statycznosc',
      `${wiazane.length} miejsc wiąże nazwę części wyrażeniem:\n` +
        lista(wiazane) +
        `\n    Część, której nazwa powstaje w runtime, nie jest publicznym API — jest ` +
        `nazwą, której nikt nie zapisał i której snapshot nie potrafi zamrozić. ` +
        `\`${ATRYBUT}\` ma być literałem w szablonie albo w bloku \`host\`.`,
    );

  // 4. POWIERZCHNIA. Inwentarz istnieje po to, żeby ktoś go PRZECZYTAŁ, a
  //    czytelną powierzchnią są dziś karty w `docs/components/`. Rubryka
  //    **Parts** jest pisana ręką i dokładnie dlatego kłamie: `field.md`
  //    wymieniał 7 części z jedenastu. Porównanie idzie per ENTRYPOINT, bo tak
  //    biblioteka jest importowana, a jedna karta bywa o dwóch klasach
  //    (`radio.md`) i jeden entrypoint o trzech kartach (`field`, `number`,
  //    `text`).
  const wgEntrypointu = new Map();
  for (const [, w] of zPakietu) {
    const zbior = wgEntrypointu.get(w.entrypoint) ?? new Set();
    for (const c of w.czesci) zbior.add(c);
    wgEntrypointu.set(w.entrypoint, zbior);
  }

  const nieznaneEntrypointy = dokumenty
    .filter((d) => d.entrypoint === null || !entrypointy.has(d.entrypoint))
    .map(
      (d) =>
        `${d.plik}: ${d.entrypoint === null ? 'brak nagłówka **Entrypoint:**' : `\`${d.entrypoint}\` nie jest entrypointem pakietu`}`,
    );
  if (nieznaneEntrypointy.length)
    throw new BladCzesci(
      'dokumentacja',
      `${nieznaneEntrypointy.length} kart wskazuje entrypoint, którego nie ma w pakiecie:\n` +
        lista(nieznaneEntrypointy) +
        `\n    Bramka przypisuje rubrykę **Parts** do entrypointu właśnie tym nagłówkiem; ` +
        `karta bez niego zostaje poza porównaniem, czyli poza inwentarzem.`,
    );

  const problemyDokumentacji = [];
  for (const [entrypoint, czesci] of [...wgEntrypointu].sort()) {
    const karty = dokumenty.filter((d) => d.entrypoint === entrypoint);
    if (!karty.length) {
      problemyDokumentacji.push(
        `\`${entrypoint}\` wystawia ${czesci.size} części i nie ma ani jednej karty ` +
          `w \`${DOKUMENTY}/\``,
      );
      continue;
    }

    const skad = new Map(); // część -> [karty]
    for (const karta of karty)
      for (const c of karta.czesci)
        skad.set(c, [...(skad.get(c) ?? []), karta.plik]);

    const dwaRazy = [...skad]
      .filter(([, gdzie]) => gdzie.length > 1)
      .map(([c, gdzie]) => `\`${c}\` w ${gdzie.join(' i ')}`);
    if (dwaRazy.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: ta sama część w dwóch kartach — ${dwaRazy.join('; ')}`,
      );

    const brakujeWKartach = posortuj(czesci).filter((c) => !skad.has(c));
    const nadmiarowe = [...skad.keys()].filter((c) => !czesci.has(c)).sort();
    if (brakujeWKartach.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: pakiet wystawia, a karty nie wymieniają — ` +
          brakujeWKartach.map((c) => `\`${c}\``).join(', '),
      );
    if (nadmiarowe.length)
      problemyDokumentacji.push(
        `\`${entrypoint}\`: karty wymieniają, a pakiet nie wystawia — ` +
          nadmiarowe.map((c) => `\`${c}\``).join(', '),
      );
  }
  if (problemyDokumentacji.length)
    throw new BladCzesci(
      'dokumentacja',
      `rubryki **Parts** rozjechały się z pakietem (${problemyDokumentacji.length}):\n` +
        lista(skroc(problemyDokumentacji, 12)) +
        `\n    Karta wymieniająca część, której nie ma, wysyła konsumenta pod selektor ` +
        `trafiający w nic; karta milcząca o istniejącej cofa obietnicę „spisane" do zera. ` +
        `Zapis rubryki: \`| **Parts** | \\\`nazwa\\\`, \\\`nazwa\\\` |\`.`,
    );

  // 5. SNAPSHOT — wersjonowany inwentarz, wobec którego mierzy się zmianę.
  // Stoi OSTATNI, bo zapala na każdej zmianie nazwy, także na tej, którą
  // wcześniejsze punkty potrafią nazwać po imieniu. Odwrotna kolejność dawałaby
  // na część wniesioną wiązaniem komunikat „snapshot się rozjechał", czyli
  // poprawną diagnozę problemu, którego nie ma.
  const wiersze = [...zPakietu]
    .flatMap(([klasa, w]) =>
      posortuj(w.czesci).map((c) => [w.entrypoint, klasa, c]),
    )
    .sort((a, b) => (a.join(' ') < b.join(' ') ? -1 : 1));
  const tresc = renderujSnapshot(wiersze);
  const rozjazd = (opis) =>
    Object.assign(new BladCzesci('snapshot', opis), { snapshot: tresc });

  if (we.snapshot === null)
    throw rozjazd(
      `brak \`${SNAPSHOT}\` — uruchom \`node tools/check-parts.mjs --write\`.\n` +
        `    Bez snapshotu ta bramka pilnuje spójności trzech odczytów, ale nie mierzy ` +
        `ZMIANY: przemianowanie części razem z kartą w docs przechodzi wtedy bez śladu, ` +
        `a u konsumenta psuje selektor.`,
    );
  if (we.snapshot !== tresc) {
    const stare = wierszeSnapshotu(we.snapshot);
    const nowe = wierszeSnapshotu(tresc);
    const usuniete = [...stare].filter((w) => !nowe.has(w));
    const dodane = [...nowe].filter((w) => !stare.has(w));
    throw rozjazd(
      `snapshot inwentarza rozjechał się z bieżącym:\n` +
        (usuniete.length
          ? `    zniknęło z API (${usuniete.length}):\n` +
            lista(skroc(usuniete)) +
            '\n'
          : '') +
        (dodane.length
          ? `    doszło do API (${dodane.length}):\n` +
            lista(skroc(dodane)) +
            '\n'
          : '') +
        (!usuniete.length && !dodane.length
          ? `    lista części jest ta sama — rozjechał się nagłówek albo kolejność wierszy.\n`
          : '') +
        `    \`${ATRYBUT}\` jest publicznym API stylowania (decyzja 0013): część, która ` +
        `zniknęła, zabiera konsumentowi selektor i nie daje przy tym ani jednego czerwonego ` +
        `testu, bo szablon i arkusz zmieniają się razem. Jeśli zmiana jest świadoma — ` +
        `\`node tools/check-parts.mjs --write\`.`,
    );
  }

  return {
    opis:
      `${wiersze.length} części w ${zPakietu.size} klasach ` +
      `(${wgEntrypointu.size} entrypointów), ${dokumenty.length} kart w docs`,
    snapshot: tresc,
  };
};

// ── snapshot ──────────────────────────────────────────────────────────────────

/**
 * Ten sam wybór formatu co w `libs/tokens/tokens.snapshot.md` i z tego samego
 * powodu: tabela markdowna po przejściu prettiera wyrównuje kolumny do
 * najdłuższej komórki, więc jedna długa nazwa przepisuje CAŁY plik, a diff
 * przestaje pokazywać, co się naprawdę zmieniło.
 */
const renderujSnapshot = (wiersze) =>
  [
    '# Snapshot inwentarza części',
    '',
    '> **Ten plik jest generowany.** Nie edytuj go ręcznie —',
    '> `node tools/check-parts.mjs --write`. Bramka `check-parts` odrzuca rozjazd.',
    '',
    'Atrybut `data-pct-part` jest publicznym API stylowania — jedyną drogą, jaką ta',
    'biblioteka zostawia do wnętrza komponentu ([decyzja 0013](../../docs/decisions/0013-no-headless-split.md)).',
    'Jego zmiana nie daje ani jednego czerwonego testu, bo szablon i arkusz zmieniają się',
    'razem; psuje się wyłącznie u kogoś, kto tę nazwę wpisał u siebie.',
    '',
    'Ten plik jest listą, wobec której mierzy się zmianę. Rozjazd nie znaczy „błąd" —',
    'znaczy „zmiana publicznego API, która ma być widoczna w review".',
    '',
    'Kolumny: entrypoint · klasa wystawiająca część · nazwa części. Lista powstaje',
    'z **zbudowanego pakietu** (`ɵcmp.consts` i `ɵdir.hostAttrs` po zlinkowaniu), czyli',
    'z tego, co naprawdę dostaje przeglądarka.',
    '',
    '```',
    ...wiersze.map((w) => w.join(' ')),
    '```',
    '',
  ].join('\n');

/**
 * Same wiersze danych — do policzenia różnicy, bez nagłówka.
 *
 * Brak pliku (`null`) jest tu pustą listą, a nie awarią, choć gałąź wyżej łapie
 * ten przypadek osobno i wcześniej. Zależność między gałęziami jednego punktu
 * jest normalna; zapisanie jej tak, że jej naruszenie nie daje zdania, nie jest:
 * pierwsza wersja czytała `null.split` i rozbrojenie gałęzi „brak snapshotu"
 * w ramach kontroli odniesienia zamieniało bramkę w `TypeError` — czyli kontrola
 * przestawała umieć zbadać punkt, który miała zbadać. Ta sama wada co w A4 i A7,
 * znaleziona tą samą kontrolą.
 */
const wierszeSnapshotu = (tresc) =>
  new Set(
    (tresc ?? '').split('\n').filter((w) => /^\.(\/[a-z0-9-]+)?\s/.test(w)),
  );

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

/**
 * Karta komponentu: entrypoint z nagłówka i nazwy części z rubryki **Parts**.
 * `_template.md` i `README.md` odpadają — pierwszy jest formularzem do skopiowania
 * (jego rubryka opisuje, co wpisać), drugi spisem treści.
 */
const NAGLOWEK_ENTRYPOINT =
  /^\*\*Entrypoint:\*\*\s*`@pacit\/components(\/[a-z-]+)?`/m;
const RUBRYKA_CZESCI = /^\|\s*\*\*Parts\*\*.*$/m;

const czytajKarte = (plik, tresc) => {
  const naglowek = NAGLOWEK_ENTRYPOINT.exec(tresc);
  const rubryka = RUBRYKA_CZESCI.exec(tresc);
  return {
    plik,
    entrypoint: naglowek ? `.${naglowek[1] ?? ''}` : null,
    czesci: new Set(
      rubryka
        ? [...rubryka[0].matchAll(/`([^`]+)`/g)]
            .map((m) => m[1])
            .filter((n) => /^[a-z][a-z0-9-]*$/.test(n))
        : [],
    ),
  };
};

/**
 * Definicje ze ZBUDOWANEGO pakietu. `@angular/compiler` jest wczytany pierwszy,
 * bo pakiet jest skompilowany częściowo i `ɵcmp` powstaje dopiero przy dostępie
 * — to ten sam krok, który u konsumenta wykonuje linker, i ten sam co
 * w `check-zoneless`.
 *
 * `consts` niesie atrybuty STATYCZNE każdego elementu, w postaci płaskiej
 * tablicy, w której liczba otwiera sekcję o innym znaczeniu (klasy, style,
 * wiązania). Czytamy więc wyłącznie prefiks przed pierwszą liczbą — dalej stoją
 * już nazwy bez wartości.
 *
 * Nazwa atrybutu WIĄZANEGO nie trafia do `consts` w ogóle, tylko do treści
 * skompilowanej funkcji (`ɵɵattribute('data-pct-part', ctx.x)`) — zmierzone, nie
 * założone. Stąd drugi odczyt po tekście funkcji: bez niego punkt 3 miałby
 * w pakiecie ślepą stronę.
 */
const parujAtrybuty = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i++) {
    if (typeof attrs[i] === 'number') break;
    if (attrs[i] === ATRYBUT) out.push(attrs[i + 1]);
    i++;
  }
  return out;
};

const komponentyPakietu = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new BladCzesci(
      'zbior',
      `brak zbudowanego pakietu w ${DIST} — bramka czyta artefakt, nie same źródła.\n` +
        `    Target musi mieć \`dependsOn\` na build biblioteki.`,
    );

  await import('@angular/compiler');
  const exports =
    JSON.parse(czytaj(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];
  const entrypointy = new Set();

  for (const [wejscie, cel] of Object.entries(exports)) {
    const plik = typeof cel === 'object' ? cel.default : cel;
    if (typeof plik !== 'string' || !plik.endsWith('.mjs')) continue;
    entrypointy.add(wejscie);

    const modul = await import(
      pathToFileURL(join(dist, plik.replace(/^\.\//, ''))).href
    );
    for (const [klasa, wartosc] of Object.entries(modul)) {
      if (typeof wartosc !== 'function') continue;
      const def = wartosc['ɵcmp'] ?? wartosc['ɵdir'];
      if (!def) continue;

      const consts =
        typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
      const czesci = [
        ...consts.filter(Array.isArray).flatMap(parujAtrybuty),
        ...parujAtrybuty(def.hostAttrs ?? []),
      ];
      const funkcje = [def.template, def.hostBindings]
        .filter((f) => typeof f === 'function')
        .map((f) => f.toString());

      out.push({
        wejscie,
        klasa,
        czesci: [...new Set(czesci)],
        dynamiczne: funkcje.reduce(
          (n, t) => n + ile(t, new RegExp(ATRYBUT, 'g')),
          0,
        ),
      });
    }
  }
  return { pakiet: out, entrypointy };
};

/**
 * Źródła, w których szuka się dekoratorów. Specyfikacje odpadają świadomie:
 * definiują komponenty-gospodarzy z szablonem wpisanym w dekorator, a te nigdzie
 * nie jadą — punkt 1 zapalałby na każdym teście renderującym.
 */
const jestZrodlem = (p) =>
  p.startsWith(`${PROJEKT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const jestSzablonem = (p) => p.startsWith(`${PROJEKT}/`) && p.endsWith('.html');
const jestKarta = (p) =>
  p.startsWith(`${DOKUMENTY}/`) &&
  p.endsWith('.md') &&
  !['_template.md', 'README.md'].includes(basename(p));

/** Wejście złożone z listy plików — ta sama postać dla repo i dla fixture'a. */
const zbierzWejscie = async (root, pliki, pakietZDysku) => {
  const { pakiet, entrypointy } =
    pakietZDysku ?? (await komponentyPakietu(root));
  return {
    ...czytajZrodla(root, pliki.filter(jestZrodlem)),
    szablony: pliki
      .filter(jestSzablonem)
      .map((plik) => ({ plik, tresc: czytaj(root, plik) })),
    pakiet,
    entrypointy,
    dokumenty: pliki
      .filter(jestKarta)
      .map((plik) => czytajKarte(plik, czytaj(root, plik))),
    snapshot: existsSync(join(root, SNAPSHOT)) ? czytaj(root, SNAPSHOT) : null,
  };
};

/**
 * Pliki z INDEKSU GITA, nie z globa po dysku — ten sam powód co w `check-styles`,
 * `check-tokens`, `check-zoneless` i `check-typecheck`: indeks jest niezależnym
 * spisem tego, co repozytorium naprawdę wiezie.
 *
 * Pathspec jest KATALOGIEM, a filtrowanie siedzi w JS-ie: pathspec gita nie jest
 * globem powłoki i bez `:(glob)` gwiazdka przechodzi przez `/`, więc wzorzec
 * z gwiazdką potrafi zwrócić ZERO plików zamiast błędu (`lesson-48`).
 */
const plikiRepozytorium = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT, DOKUMENTY], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Składa spreparowane wejście: kopia bazy, na nią pliki przypadku, potem
 * usunięcia z `fixture.json`. Katalog przypadku zawiera więc WYŁĄCZNIE swoją
 * wadę, a nie kolejny egzemplarz poprawnego wejścia, w którym trzeba jej szukać.
 *
 * Odczyt z pakietu przychodzi jako DANE (`pakiet.json`), a nie z prawdziwego
 * builda: zbudowanie Angularowego pakietu na każdy z kilkunastu przypadków
 * kosztowałoby minuty na przebieg, a bramka ma biec przy każdym commicie. Ten
 * sam wybór co w `check-zoneless` i z tego samego powodu. Cenę widać wprost:
 * fixtures NIE ćwiczą kodu czytającego `ɵcmp` — ćwiczą wszystkie pozostałe
 * parsery i cały układ kontroli. Odczyt z pakietu jest za to ćwiczony przy
 * każdym przebiegu na prawdziwym repozytorium.
 *
 * Źródła leżą w repozytorium jako `*.ts.txt` i dopiero tutaj stają się `*.ts` —
 * ten sam ruch co w `check-styles` i `check-tokens`: plik `.ts` w `tools/` nie
 * należy do żadnego programu kompilatora, więc zapaliłby `check-typecheck`
 * (punkt 1 — plik bez projektu). Fixture jednej bramki nie może być wadą dla
 * drugiej.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-parts-'));
  cpSync(join(FIXTURES, BAZA), cel, { recursive: true });
  if (nazwa !== BAZA)
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

const wejscieFixture = (katalog) => {
  const pakiet = JSON.parse(readFileSync(join(katalog, 'pakiet.json'), 'utf8'));
  return zbierzWejscie(
    katalog,
    globSync('**/*.{ts,html,md}', { cwd: katalog })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    { pakiet: pakiet.klasy, entrypointy: new Set(pakiet.entrypointy) },
  );
};

// ── the run ───────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

// Ścieżka utrzymaniowa: przepisz snapshot fixture'a i wyjdź. Fixture ma własny
// snapshot i musi go dostać z tego samego renderera co repozytorium — inaczej
// wejście wzorcowe przestaje przechodzić przy pierwszej zmianie formatu pliku.
if (WRITE_FIXTURE) {
  const katalog = zlozFixture(WRITE_FIXTURE, {});
  const cel = join(FIXTURES, WRITE_FIXTURE, SNAPSHOT);
  try {
    sprawdzCzesci(await wejscieFixture(katalog));
    console.log(`✓ ${WRITE_FIXTURE}: snapshot był już aktualny.`);
  } catch (blad) {
    if (!(blad instanceof BladCzesci) || blad.kontrola !== 'snapshot')
      throw blad;
    writeFileSync(cel, blad.snapshot);
    console.log(`✓ Przepisano ${WRITE_FIXTURE}/${SNAPSHOT}.`);
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
  process.exit(0);
}

try {
  const wynik = sprawdzCzesci(
    await zbierzWejscie(ROOT, plikiRepozytorium(), null),
  );
  opis = wynik.opis;
} catch (blad) {
  if (!(blad instanceof BladCzesci)) throw blad;
  // `--write` istnieje po to, żeby rozjazd snapshotu dało się zaakceptować
  // jednym poleceniem. Wszystkie pozostałe punkty zostają błędem także z nim:
  // przepisanie snapshotu nie jest odpowiedzią na część wniesioną wiązaniem.
  if (WRITE && blad.kontrola === 'snapshot') {
    writeFileSync(join(ROOT, SNAPSHOT), blad.snapshot);
    console.log(
      `✓ Przepisano ${SNAPSHOT}. Uruchom bramkę jeszcze raz — kontrola odniesienia ` +
        `nie biegła w tym przebiegu.`,
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
    `tools/check-parts.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść: gdyby baza sama była wadliwa, każdy przypadek
// zapalałby z jej powodu, a nie ze swojego, i wszystkie „odrzucone" byłyby
// fałszywe — czyli ta kontrola stałaby się tym, przed czym stoi.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzCzesci(await wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladCzesci)) throw blad;
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
    sprawdzCzesci(await wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladCzesci)) throw blad;
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
  console.error(`X Part inventory gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Parts: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own points.`,
);
