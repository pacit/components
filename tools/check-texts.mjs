#!/usr/bin/env node
/**
 * Bramka kanału tekstów: pilnuje obietnicy `req-api-texts` — że napis, który
 * biblioteka wypisuje SAMA, idzie przez token `PCT_TEXTS`, a nie stoi wpisany
 * w szablon albo w wartość domyślną wejścia.
 *
 * Powód istnienia. Dotąd sprawdzone było wyłącznie nadpisanie CZĘŚCIOWE
 * (`select.spec.ts`) — czyli że mechanizm działa dla napisów, które już w nim
 * są. Nic nie sprawdzało, że nowy napis do niego trafia: literał dopisany do
 * szablonu kompiluje się, przechodzi testy, przechodzi audyt axe i wygląda
 * poprawnie w każdym zrzucie — psuje się dopiero u konsumenta, który tłumaczy
 * aplikację i dostaje w środku jedno zdanie po angielsku. Tego nie widać
 * w review, bo diff pokazuje poprawny szablon.
 *
 * Sprawdzane jest sześć rzeczy:
 *  1. MIANOWNIK: parser widzi każdy dekorator, każdy szablon ma właściciela,
 *     żaden szablon nie siedzi w dekoratorze, a odczyt AST nie napotkał węzła,
 *     którego nie rozumie,
 *  2. ARTEFAKT: klasy i statyczne atrybuty odczytane ze źródeł zgadzają się
 *     z tymi w ZBUDOWANYM pakiecie,
 *  3. SZABLON: żaden węzeł tekstowy ani atrybut MÓWIĄCY nie niesie literału
 *     z literą — ani wprost, ani przez literał w wyrażeniu,
 *  4. TYPESCRIPT: wartość domyślna sygnału nie jest prozą i nie czyta
 *     `PCT_TEXTS` (odczyt przy konstrukcji to napis sprzed zmiany języka),
 *  5. KANAŁ: klucze `PctTexts`, ich wartości domyślne i ich odczyty są jednym
 *     zbiorem — bez kluczy martwych i bez odczytów donikąd,
 *  6. OSTRZEŻENIA: `console.*` nie czerpie z `PCT_TEXTS` i gaśnie poza
 *     `isDevMode()` — dokładnie tak, jak zastrzega to wymaganie.
 *
 * Punkty 3, 4 i 6 to reguły; punkty 1, 2 i 5 pilnują MIANOWNIKA, z którego te
 * reguły powstają. Ten sam mianownik kurczył się w A2 jako próbka plików
 * w raporcie pokrycia, w A5 jako zbiór deklaracji widzianych przez skaner,
 * w A6 jako zbiór mierzonych komponentów, a w A3 jako zbiór części. Tutaj
 * kurczy się zbiór POWIERZCHNI, na których w ogóle może stanąć napis.
 *
 * Skąd bierze się odczyt szablonu. Nie z regexa — z `parseTemplate`
 * `@angular/compiler`, czyli z tego samego parsera, którym kompilator czyta
 * szablon naprawdę, i przez `TmplAstRecursiveVisitor`, czyli obejście drzewa
 * utrzymywane przez Angulara, a nie przeze mnie. Ma to jedną cenę i jedną
 * korzyść. Cena: tekst jest czytany RAZ, bo po zlinkowaniu nie da się go
 * z pakietu wydobyć — literał węzła tekstowego trafia do treści zagnieżdżonej
 * funkcji szablonu, do której `ɵcmp.template` nie prowadzi (zmierzone).
 * Korzyść: ten odczyt nie potrafi po cichu zgubić składni, bo nie zgaduje —
 * a to, że widzi WSZYSTKO, pilnują cztery reguły punktu 1: brak błędów parsera,
 * brak nieznanego rodzaju węzła, brak szablonu w dekoratorze i niezerowy pomiar.
 *
 * Do tego siódmy przebieg, który nie bada biblioteki, tylko TĘ BRAMKĘ: kontrola
 * odniesienia z `tools/check-texts.fixtures/` (`req-quality-negative-control`).
 *
 * Użycie:
 *   node tools/check-texts.mjs
 */
import {
  parseTemplate,
  RecursiveAstVisitor,
  TmplAstRecursiveVisitor,
  visitAll,
} from '@angular/compiler';
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
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJEKT = 'libs/components';
const DIST = 'dist/libs/components';
const FIXTURES = join(ROOT, 'tools/check-texts.fixtures');
const BAZA = '_poprawny';

/**
 * Atrybuty, których wartość użytkownik WIDZI albo SŁYSZY. Lista jest zamknięta
 * i to jest jej wada znana z góry: nie ma sposobu, żeby maszyna wywiodła ją
 * sama. Jest za to widoczna — dopisanie pozycji to linia w diffie, tak samo jak
 * słownik nazw w `check-tokens` (A4).
 *
 * Pierwsza grupa to właściwości ARIA o wartości NAPISOWEJ (a nie idref, enum
 * czy liczbie) — tylko one niosą tekst dla czytnika ekranu. Druga to atrybuty
 * HTML, których wartość ląduje na ekranie. `role`, `type` czy `aria-haspopup`
 * do żadnej nie należą: ich wartości są słowami kluczowymi specyfikacji, nie
 * tekstem — i dlatego `role="combobox"` nie jest tu naruszeniem.
 */
const ATRYBUTY_MOWIACE = new Set([
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'aria-keyshortcuts',
  'aria-description',
  'aria-braillelabel',
  'aria-brailleroledescription',
  'title',
  'placeholder',
  'alt',
  'label',
  'abbr',
  'download',
]);

/** `<input type="submit">` wypisuje `value` jako etykietę przycisku. */
const PRZYCISKI = new Set(['submit', 'button', 'reset']);

const LITERA = /\p{L}/u;

/**
 * Proza w TypeScripcie. W szablonie o tym, czy literał jest tekstem, decyduje
 * POZYCJA (węzeł tekstowy jest tekstem z definicji); w TS pozycji nie ma, więc
 * decyduje kształt. Wielka litera na początku albo spacja w środku odróżnia
 * zdanie od wartości osi (`md`, `solid`, `inset`, `pctPrefix`) — zmierzone na
 * całej bibliotece: przy tej regule dziś nie zapala nic, a `Select…` i
 * `No options` zapalają obie.
 *
 * Znana granica: jednowyrazowy napis pisany z małej litery (`close`) jest dla
 * tej reguły nie do odróżnienia od wartości osi. Domyka to druga reguła punktu
 * — wejście zadeklarowane jako `input<string>` jest z definicji tekstem
 * dowolnym, więc literał w jego wartości domyślnej zapala niezależnie od
 * kształtu.
 */
const jestProza = (v) => LITERA.test(v) && (/^\p{Lu}/u.test(v) || /\s/.test(v));

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

const ile = (tekst, wzorzec) => (tekst.match(wzorzec) ?? []).length;

// ── skanery źródła ────────────────────────────────────────────────────────────

/**
 * Ta sama kotwica co w `check-parts` i z tego samego powodu: formatowanie
 * wymuszone przez `nx format:check` stawia `@Component({` i `})` w kolumnie
 * zero. Licznik kotwicy NIE powtarza, bo powtórzona gasiłaby obie strony
 * porównania naraz (`lesson-48`).
 */
const DEKORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DEKORATOR_LICZNIK = /^[ \t]*@(?:Component|Directive)\(/gm;

const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** Literał napisowy w wyrażeniu (wiązanie w bloku `host` jest napisem). */
const LITERAL_W_WYRAZENIU = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * Klucz wpisu w bloku `host` — cudzysłów jest opcjonalny, bo prettier go nie
 * dokłada: `role: 'spinbutton'` i `'[attr.aria-label]': 'x()'` stoją obok siebie
 * w tym samym bloku (`field/src/number.ts`). Wzorzec wymagający cudzysłowu
 * przepuściłby pierwszy z nich MILCZĄCO — a to jest dokładnie ta połowa, w której
 * siedzą atrybuty statyczne.
 */
const HOST_KLUCZ = /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:/g;

/**
 * Wpisy bloku `host` jako pary klucz/wartość — z wartościami czytanymi ze
 * świadomością znaku ucieczki, bo wiązania niosą w środku drugi rodzaj
 * cudzysłowu (`'open() ? "" : null'`).
 *
 * Wpis, którego ten skaner nie rozumie (rozwinięcie `...fitHost`, wartość
 * złożona wyrażeniem), jest pomijany BEZ komunikatu — świadomie: jego
 * mianownikiem jest punkt 2, czyli porównanie ze zbudowanym pakietem. Atrybut
 * statyczny wniesiony taką składnią pojawi się po stronie artefaktu i zniknie
 * po stronie źródeł, więc zapali z nazwą w komunikacie.
 */
const czytajHost = (blok) => {
  const wpisy = [];
  for (const m of blok.matchAll(HOST_KLUCZ)) {
    const klucz = m[1] ?? m[2] ?? m[3];
    let i = m.index + m[0].length;
    while (/\s/.test(blok[i])) i++;
    const cudzyslow = blok[i];
    if (cudzyslow !== "'" && cudzyslow !== '"') continue;
    let k = i + 1;
    let wartosc = '';
    while (k < blok.length && blok[k] !== cudzyslow) {
      if (blok[k] === '\\') k++;
      wartosc += blok[k];
      k++;
    }
    if (k >= blok.length) continue;
    wpisy.push([klucz, wartosc]);
  }
  return wpisy;
};

/**
 * Blok `host` z ciała dekoratora — z klamrami dopasowanymi, a nie regexem do
 * pierwszego `}`: wartości potrafią zawierać klamry (`'open() ? "" : null'`).
 */
const blokHost = (cialo) => {
  const i = cialo.search(/(^|\s)host\s*:\s*\{/m);
  if (i === -1) return null;
  const start = cialo.indexOf('{', i);
  let glebokosc = 0;
  for (let k = start; k < cialo.length; k++) {
    if (cialo[k] === '{') glebokosc++;
    else if (cialo[k] === '}' && --glebokosc === 0)
      return cialo.slice(start + 1, k);
  }
  return null;
};

/** Nazwa atrybutu z klucza bloku `host`: `[attr.aria-label]` → `aria-label`. */
const nazwaZKlucza = (klucz) => {
  const wiazane = /^\[(?:attr\.)?([^\]]+)\]$/.exec(klucz);
  return wiazane
    ? { nazwa: wiazane[1], wiazane: true }
    : { nazwa: klucz, wiazane: false };
};

/**
 * Klasy z dekoratorami. `atrybuty` to statyczne atrybuty bloku `host`
 * (para nazwa/wartość), `literaly` — literały napisowe z wyrażeń wiązań
 * atrybutów mówiących.
 *
 * Blok `host` bywa składany rozwinięciem cudzego obiektu (`...fitHost`
 * w `field/src/affix.ts`) i ten skaner tego nie widzi — świadomie, tak samo jak
 * w `check-parts`. Atrybut wniesiony rozwinięciem pojawi się w odczycie
 * z pakietu i zniknie z odczytu ze źródeł, czyli zapali punkt 2. To jest
 * dokładnie ta praca, którą ma wykonywać drugi odczyt.
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
      const host = blokHost(cialo) ?? '';
      const atrybuty = [];
      const literaly = [];

      for (const [klucz, wartosc] of czytajHost(host)) {
        const { nazwa, wiazane } = nazwaZKlucza(klucz);
        if (!wiazane) {
          atrybuty.push([nazwa, wartosc]);
          continue;
        }
        if (!ATRYBUTY_MOWIACE.has(nazwa)) continue;
        for (const l of wartosc.matchAll(LITERAL_W_WYRAZENIU))
          literaly.push([nazwa, l[1] ?? l[2]]);
      }

      klasy.push({
        plik,
        klasa,
        rodzaj,
        szablon: url
          ? relative(root, resolve(join(root, dirname(plik)), url[2]))
              .split('\\')
              .join('/')
          : null,
        // Pusty szablon (`template: ''` w `number.ts` i `text.ts`) nie ma czym
        // wypisać napisu. Każdy inny zapis wpisany w dekorator jest dziurą:
        // ten skaner czyta pliki `.html`, więc tekst z dekoratora byłby dla
        // niego niewidzialny, a do przeglądarki jedzie tak samo.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        atrybuty,
        literaly,
      });
    }
  }

  return { klasy, deklaracji };
};

/**
 * Rodzaje węzłów, które to obejście rozumie. Lista jest po to, żeby dzień,
 * w którym Angular doda nowy rodzaj węzła niosącego tekst (dziś na horyzoncie
 * `TmplAstComponent` i `TmplAstDirective` ze składni selectorless), był dniem,
 * w którym ta bramka o tym MÓWI — a nie dniem, w którym cicho przestaje mierzyć
 * jego zawartość.
 */
const ZNANE_WEZLY = new Set([
  'Text',
  'BoundText',
  'TextAttribute',
  'BoundAttribute',
  'BoundEvent',
  'Element',
  'Template',
  'Content',
  'Reference',
  'Variable',
  'LetDeclaration',
  'IfBlock',
  'IfBlockBranch',
  'ForLoopBlock',
  'ForLoopBlockEmpty',
  'SwitchBlock',
  'SwitchBlockCase',
  'SwitchBlockCaseGroup',
  'DeferredBlock',
  'DeferredBlockPlaceholder',
  'DeferredBlockLoading',
  'DeferredBlockError',
  'Icu',
  'UnknownBlock',
]);

/** Literały napisowe z wyrażenia — bez argumentów pipe'a (patrz `visitPipe`). */
class LiteralyWyrazenia extends RecursiveAstVisitor {
  constructor(zbierz) {
    super();
    this.zbierz = zbierz;
  }
  visitLiteralPrimitive(node) {
    if (typeof node.value === 'string') this.zbierz(node.value);
  }
  visitTemplateLiteralElement(node) {
    this.zbierz(node.text);
  }
  /**
   * Argument pipe'a nie dociera do DOM — jest znacznikiem formatu
   * (`date: 'short'`), a nie tekstem. Reguła mówi o prozie lądującej na
   * ekranie, więc obejmowanie go byłoby niezgodne z nią samą.
   */
  visitPipe(node, ctx) {
    node.exp.visit(this, ctx);
  }
}

/**
 * Jedno przejście po drzewie szablonu. Zbiera to, co widzi użytkownik:
 * teksty węzłów, wartości atrybutów mówiących i literały z wyrażeń, które
 * do takiego miejsca trafiają. Liczy przy okazji odwiedzone węzły — punkt 1
 * porównuje tę liczbę z zerem, bo przebieg, który nie odwiedził niczego,
 * orzeka o wszystkim (`lesson-48`).
 */
class SkanerSzablonu extends TmplAstRecursiveVisitor {
  constructor(plik) {
    super();
    this.plik = plik;
    this.teksty = [];
    this.atrybuty = [];
    this.wyrazenia = [];
    this.icu = 0;
    this.wezlow = 0;
    this.nieznane = new Set();
    this.tag = null;
    this.typ = null;
  }

  odwiedz(node) {
    const rodzaj = node?.constructor?.name;
    this.wezlow++;
    if (!ZNANE_WEZLY.has(rodzaj)) this.nieznane.add(rodzaj);
  }

  visitText(node) {
    this.odwiedz(node);
    if (node.value.trim() !== '')
      this.teksty.push({ wartosc: node.value.trim(), linia: linia(node) });
  }

  visitBoundText(node) {
    this.odwiedz(node);
    node.value.visit(
      new LiteralyWyrazenia((v) =>
        this.wyrazenia.push({
          gdzie: 'interpolacja',
          wartosc: v,
          linia: linia(node),
        }),
      ),
    );
  }

  visitElement(node) {
    this.odwiedz(node);
    const poprzedni = [this.tag, this.typ];
    this.tag = node.name;
    this.typ =
      node.attributes.find((a) => a.name === 'type')?.value?.toLowerCase() ??
      null;
    super.visitElement(node);
    [this.tag, this.typ] = poprzedni;
  }

  mowiacy(nazwa) {
    return (
      ATRYBUTY_MOWIACE.has(nazwa) ||
      (nazwa === 'value' && this.tag === 'input' && PRZYCISKI.has(this.typ))
    );
  }

  visitTextAttribute(node) {
    this.odwiedz(node);
    if (this.mowiacy(node.name))
      this.atrybuty.push({
        nazwa: node.name,
        wartosc: node.value,
        linia: linia(node),
      });
  }

  visitBoundAttribute(node) {
    this.odwiedz(node);
    if (!this.mowiacy(node.name)) return;
    node.value.visit(
      new LiteralyWyrazenia((v) =>
        this.wyrazenia.push({
          gdzie: `wiązanie \`${node.name}\``,
          wartosc: v,
          linia: linia(node),
        }),
      ),
    );
  }

  /**
   * ICU niesie warianty tekstu w osobnym drzewie i18n, do którego to obejście
   * nie sięga — a `PCT_TEXTS` nie ma czym takiego napisu obsłużyć, bo jest mapą
   * napisów, nie gramatyką. Zamiast czytać go po połowie, punkt 3 go zakazuje:
   * to ten sam ruch co zakaz wiązania nazwy części w `check-parts` — rzecz,
   * której pomiar nie potrafi zobaczyć, ma być głośna, a nie niewidzialna.
   */
  visitIcu(node) {
    this.odwiedz(node);
    this.icu++;
    return super.visitIcu(node);
  }

  visitBoundEvent(node) {
    this.odwiedz(node);
  }
  visitReference(node) {
    this.odwiedz(node);
  }
  visitVariable(node) {
    this.odwiedz(node);
  }
  visitContent(node) {
    this.odwiedz(node);
    return super.visitContent(node);
  }
  visitTemplate(node) {
    this.odwiedz(node);
    return super.visitTemplate(node);
  }
  visitLetDeclaration(node) {
    this.odwiedz(node);
  }
  visitIfBlock(node) {
    this.odwiedz(node);
    return super.visitIfBlock(node);
  }
  visitIfBlockBranch(node) {
    this.odwiedz(node);
    return super.visitIfBlockBranch(node);
  }
  visitForLoopBlock(node) {
    this.odwiedz(node);
    return super.visitForLoopBlock(node);
  }
  visitForLoopBlockEmpty(node) {
    this.odwiedz(node);
    return super.visitForLoopBlockEmpty(node);
  }
  visitSwitchBlock(node) {
    this.odwiedz(node);
    return super.visitSwitchBlock(node);
  }
  visitSwitchBlockCase(node) {
    this.odwiedz(node);
    return super.visitSwitchBlockCase(node);
  }
  visitDeferredBlock(node) {
    this.odwiedz(node);
    return super.visitDeferredBlock(node);
  }
  visitDeferredBlockPlaceholder(node) {
    this.odwiedz(node);
    return super.visitDeferredBlockPlaceholder(node);
  }
  visitDeferredBlockLoading(node) {
    this.odwiedz(node);
    return super.visitDeferredBlockLoading(node);
  }
  visitDeferredBlockError(node) {
    this.odwiedz(node);
    return super.visitDeferredBlockError(node);
  }
  visitUnknownBlock(node) {
    this.odwiedz(node);
  }
}

const linia = (node) => node?.sourceSpan?.start?.line + 1 || '?';

/**
 * `preserveWhitespaces: false` — tak kompiluje się szablon naprawdę, więc tak
 * wygląda zbiór węzłów, które dojadą do przeglądarki. Przy `true` każde wcięcie
 * byłoby osobnym węzłem tekstowym i punkt 3 orzekałby o białych znakach.
 */
const czytajSzablon = (plik, tresc) => {
  const wynik = parseTemplate(tresc, plik, { preserveWhitespaces: false });
  const skaner = new SkanerSzablonu(plik);
  if (!wynik.errors?.length) visitAll(skaner, wynik.nodes);
  return { plik, bledy: wynik.errors ?? [], skaner };
};

// ── skaner TypeScriptu ────────────────────────────────────────────────────────

/**
 * Wywołania fabryk sygnałów wraz z ich pierwszym argumentem. Nie parsuję
 * generyka regexem: `input<readonly PctSelectOption<T>[]>([])` ma `>` w środku,
 * więc wzorzec `<[^>]*>` przepuściłby go MILCZĄCO — a wejście, którego skaner
 * nie zobaczył, jest dokładnie tym, czego ten punkt szuka. Nawiasy kątowe są
 * więc liczone tak samo jak okrągłe.
 */
const FABRYKI = ['input', 'model', 'signal', 'computed'];
/**
 * Niezależny licznik nie może liczyć wywołań — skaner znajduje ich WIĘCEJ niż
 * przypisań (fabryka wywołana w ciele funkcji, w argumencie, w wyrażeniu
 * warunkowym), więc porównanie sum przechodziłoby także wtedy, gdyby jedno
 * przypisanie zniknęło. Liczone są więc PRZYPISANIA, a warunkiem jest, żeby
 * każde z nich skaner rozwiązał do wywołania.
 */
const PRZYPISANIE = /=\s*$/;

const dopasuj = (tekst, i, otw, zam) => {
  let glebokosc = 0;
  for (let k = i; k < tekst.length; k++) {
    if (tekst[k] === otw) glebokosc++;
    else if (tekst[k] === zam && --glebokosc === 0) return k;
  }
  return -1;
};

const czytajFabryki = (plik, tresc) => {
  const wywolania = [];
  const nierozpoznane = [];
  const wzorzec = new RegExp(`\\b(${FABRYKI.join('|')})\\b`, 'g');

  for (const m of tresc.matchAll(wzorzec)) {
    const przypisanie = PRZYPISANIE.test(tresc.slice(0, m.index));
    const zglos = () => {
      if (przypisanie)
        nierozpoznane.push(
          `${plik}:${tresc.slice(0, m.index).split('\n').length}: ` +
            `= ${m[1]} bez rozpoznanego wywołania`,
        );
    };
    let k = m.index + m[1].length;
    // `.required` i generyk są opcjonalne i mogą wystąpić w tej kolejności.
    for (;;) {
      while (/\s/.test(tresc[k])) k++;
      if (tresc.startsWith('.required', k)) {
        k += '.required'.length;
        continue;
      }
      if (tresc[k] === '<') {
        const koniec = dopasuj(tresc, k, '<', '>');
        if (koniec === -1) break;
        k = koniec + 1;
        continue;
      }
      break;
    }
    if (tresc[k] !== '(') {
      zglos();
      continue;
    }
    const koniec = dopasuj(tresc, k, '(', ')');
    if (koniec === -1) {
      zglos();
      continue;
    }

    // Sam pierwszy argument: `input('x', { alias: 'Nazwa' })` niesie w drugim
    // nazwę atrybutu, a nie napis. Przecinek liczony poza zagnieżdżeniem.
    const cale = tresc.slice(k + 1, koniec);
    let g = 0;
    let przecinek = cale.length;
    for (let i = 0; i < cale.length; i++) {
      const c = cale[i];
      if ('([{'.includes(c)) g++;
      else if (')]}'.includes(c)) g--;
      else if (c === ',' && g === 0) {
        przecinek = i;
        break;
      }
    }

    wywolania.push({
      plik,
      fabryka: m[1],
      linia: tresc.slice(0, m.index).split('\n').length,
      // Deklarowany typ pierwszego parametru — `input<string>` znaczy „tekst
      // dowolny", czyli miejsce, w którym literał jest prozą z definicji.
      napisowe: /^\s*<\s*string\s*[,>]/.test(
        tresc.slice(m.index + m[1].length),
      ),
      argument: cale.slice(0, przecinek),
    });
  }

  return { wywolania, nierozpoznane };
};

const KLUCZE_INTERFEJSU = /export interface PctTexts \{([\s\S]*?)^\}/m;
const DOMYSLNE = /export const PCT_DEFAULT_TEXTS[^=]*=\s*\{([\s\S]*?)^\};/m;
const POLE = /^\s*(?:readonly\s+)?([A-Za-z_$][\w$]*)\s*:/gm;
const DOMYSLNA_PARA =
  /^\s*([A-Za-z_$][\w$]*)\s*:\s*(['"])((?:[^'\\]|\\.)*)\2/gm;
/** `texts().klucz` — jedyna droga odczytu po decyzji 0014. */
const ODCZYT = /\btexts\(\)\.([A-Za-z_$][\w$]*)/g;
/** `inject(PCT_TEXTS)` musi wylądować pod nazwą `texts` — inaczej odczyt znika. */
const WSTRZYKNIECIE = /(?:(\w+)\s*=\s*)?inject\(\s*PCT_TEXTS\s*\)/g;

const KONSOLA = /\bconsole\.(log|warn|error|info|debug)\s*\(/g;

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * Naruszenie — z identyfikatorem punktu ORAZ reguły. Sam punkt nie wystarczy:
 * punkt 3 niesie cztery reguły, punkt 5 sześć, a kontrola odniesienia
 * porównująca wyłącznie punkt przepuściłaby przypadek, który zapalił na regule
 * sąsiedniej (`lesson-50`, wniosek z A12).
 */
class BladTekstu extends Error {
  constructor(kontrola, regula, opis) {
    super(opis);
    this.kontrola = kontrola;
    this.regula = regula;
  }
}

const sprawdzTeksty = (we) => {
  const { klasy, deklaracji, szablony, pakiet, zrodla } = we;

  // ── 1. MIANOWNIK ────────────────────────────────────────────────────────────
  if (!klasy.length || !zrodla.length)
    throw new BladTekstu(
      'mianownik',
      'pusta-lista',
      `nie znalazłem ani jednego dekoratora \`@Component\`/\`@Directive\` ` +
        `w źródłach (${PROJEKT}; plików: ${zrodla.length}) — wszystkie dalsze punkty ` +
        `przeszłyby wtedy, nie orzekając o niczym (lesson-48).\n    Najczęstsza ` +
        `przyczyna: lista plików źródłowych przestała cokolwiek zwracać.`,
    );

  if (klasy.length !== deklaracji)
    throw new BladTekstu(
      'mianownik',
      'parser-dekoratorow',
      `parser rozpoznał ${klasy.length} z ${deklaracji} dekoratorów — reszta wypadłaby ` +
        `z pomiaru bez śladu, razem ze swoim blokiem \`host\`. Najczęstsza przyczyna: ` +
        `dekorator zapisany inaczej, niż formatuje prettier (\`@Component({\` i \`})\` ` +
        `w kolumnie zero).`,
    );

  const wInline = klasy.filter((k) => k.inline);
  if (wInline.length)
    throw new BladTekstu(
      'mianownik',
      'szablon-w-dekoratorze',
      `${wInline.length} klas bierze szablon z dekoratora, a nie z pliku:\n` +
        lista(wInline.map((k) => `${k.plik}: ${k.klasa}`)) +
        `\n    Ten skaner czyta pliki \`.html\`, więc napis wpisany w dekorator byłby dla ` +
        `niego niewidzialny — a do przeglądarki jedzie tak samo. Wynieś szablon do ` +
        `\`templateUrl\`.`,
    );

  const uzywane = new Map();
  for (const k of klasy)
    if (k.szablon)
      uzywane.set(k.szablon, [...(uzywane.get(k.szablon) ?? []), k]);

  const znane = new Set(szablony.map((s) => s.plik));
  const brakujace = [...uzywane.keys()].filter((s) => !znane.has(s));
  if (brakujace.length)
    throw new BladTekstu(
      'mianownik',
      'szablon-bez-pliku',
      `${brakujace.length} szablonów wskazanych przez \`templateUrl\` nie ma na liście ` +
        `plików bramki:\n` +
        lista(brakujace) +
        `\n    Ich teksty nie wejdą do pomiaru. Najczęstsza przyczyna: plik poza indeksem ` +
        `gita albo pathspec, który przestał go obejmować.`,
    );

  const osierocone = szablony.filter((s) => !uzywane.has(s.plik));
  if (osierocone.length)
    throw new BladTekstu(
      'mianownik',
      'szablon-bez-wlasciciela',
      `${osierocone.length} szablonów nie należy do żadnego dekoratora:\n` +
        lista(osierocone.map((s) => s.plik)) +
        `\n    Szablon, do którego nikt nie wskazuje, jest dla pomiaru sierotą — a do ` +
        `przeglądarki jedzie tak samo jak każdy inny.`,
    );

  const skany = szablony.map((s) => czytajSzablon(s.plik, s.tresc));

  const zBledem = skany.filter((s) => s.bledy.length);
  if (zBledem.length)
    throw new BladTekstu(
      'mianownik',
      'parser-szablonu',
      `parser Angulara odrzucił ${zBledem.length} szablonów:\n` +
        lista(
          zBledem.map((s) => `${s.plik}: ${s.bledy[0].msg.split('\n')[0]}`),
        ) +
        `\n    Drzewo, którego nie ma, nie ma też ani jednego węzła tekstowego — punkt 3 ` +
        `przeszedłby na nim bez zastrzeżeń.`,
    );

  const nieznane = skany.filter((s) => s.skaner.nieznane.size);
  if (nieznane.length)
    throw new BladTekstu(
      'mianownik',
      'nieznany-wezel',
      `${nieznane.length} szablonów niesie rodzaj węzła, którego to obejście nie zna:\n` +
        lista(
          nieznane.map(
            (s) => `${s.plik}: ${[...s.skaner.nieznane].join(', ')}`,
          ),
        ) +
        `\n    Nowy rodzaj węzła może nieść tekst, a domyślne obejście przeszłoby przez ` +
        `niego bez słowa. Dopisz go do \`ZNANE_WEZLY\` razem z decyzją, czy niesie napis.`,
    );

  const wezlow = skany.reduce((n, s) => n + s.skaner.wezlow, 0);
  if (!wezlow)
    throw new BladTekstu(
      'mianownik',
      'pusty-pomiar',
      `${szablony.length} szablonów, 0 odwiedzonych węzłów — pomiar nie ruszył.\n` +
        `    Kontrola niepustości stoi po stronie WYNIKU, nie wejścia: liczba plików ` +
        `bywa poprawna wtedy, gdy pusty jest sam odczyt (lesson-48, ta sama pomyłka co ` +
        `w A5 i A12).`,
    );

  // ── 2. ARTEFAKT ─────────────────────────────────────────────────────────────
  //
  //    Odczyt ze źródeł czyta tekst dekoratora, więc jest ślepy na blok `host`
  //    składany rozwinięciem cudzego obiektu (`...fitHost`). Odczyt z pakietu
  //    czyta `ɵdir.hostAttrs` i `ɵcmp.consts` po zlinkowaniu, czyli wynik
  //    PRAWDZIWEGO kompilatora. Ten sam ruch co w A3 i A6.
  if (!pakiet.length)
    throw new BladTekstu(
      'artefakt',
      'pakiet-pusty',
      `zbudowany pakiet nie dał ani jednej klasy z definicją Angulara — porównanie ` +
        `przeszłoby, nie mając czego porównać.\n    Najczęstsza przyczyna: nieaktualne ` +
        `albo puste \`${DIST}\` (bramka wymaga \`dependsOn: build\`).`,
    );

  const zeZrodel = new Map(klasy.map((k) => [k.klasa, k]));
  const zPakietu = new Map(pakiet.map((p) => [p.klasa, p]));

  const bezPakietu = [...zeZrodel.keys()].filter((k) => !zPakietu.has(k));
  if (bezPakietu.length)
    throw new BladTekstu(
      'artefakt',
      'klasa-bez-pakietu',
      `${bezPakietu.length} klas ze źródeł nie ma w zbudowanym pakiecie:\n` +
        lista(bezPakietu.map((k) => `${k} (${zeZrodel.get(k).plik})`)) +
        `\n    Pomiar liczyłby wtedy napisy komponentu, którego konsument nie dostaje — ` +
        `albo, częściej, czytałby nieaktualne \`${DIST}\`.`,
    );

  const bezZrodel = [...zPakietu.keys()].filter((k) => !zeZrodel.has(k));
  if (bezZrodel.length)
    throw new BladTekstu(
      'artefakt',
      'klasa-bez-zrodel',
      `${bezZrodel.length} klas z pakietu nie widzi skaner źródeł:\n` +
        lista(bezZrodel.map((k) => `${k} (${zPakietu.get(k).wejscie})`)) +
        `\n    Klasa, której skaner nie zobaczył, wnosi do wydania napisy, o których ta ` +
        `bramka nie orzeka.`,
    );

  // Właściciel szablonu ma SWÓJ warunek wstępny, mimo że gwarantuje go punkt 1.
  // Bez niego rozbrojenie reguły `szablon-bez-wlasciciela` zamieniało tę pętlę
  // w `TypeError` — czyli kontrola odniesienia przestawała umieć zbadać regułę,
  // którą miała zbadać. Ta sama wada co w A3, A4, A7, A8 i A12; zapis „nie ufaj
  // poprzedniemu punktowi" najwyraźniej trzeba powtarzać w każdej bramce.
  const wlascicielem = (plik) => uzywane.get(plik)?.[0]?.klasa ?? plik;

  const mowiaceZrodel = new Set();
  for (const k of klasy)
    for (const [nazwa, wartosc] of k.atrybuty)
      if (ATRYBUTY_MOWIACE.has(nazwa))
        mowiaceZrodel.add(`${k.klasa} ${nazwa}=${wartosc}`);
  for (const s of skany)
    for (const a of s.skaner.atrybuty)
      if (ATRYBUTY_MOWIACE.has(a.nazwa))
        mowiaceZrodel.add(`${wlascicielem(s.plik)} ${a.nazwa}=${a.wartosc}`);

  const mowiacePakietu = new Set();
  for (const p of pakiet)
    for (const [nazwa, wartosc] of p.atrybuty)
      if (ATRYBUTY_MOWIACE.has(nazwa))
        mowiacePakietu.add(`${p.klasa} ${nazwa}=${wartosc}`);

  const tylkoWPakiecie = [...mowiacePakietu].filter(
    (w) => !mowiaceZrodel.has(w),
  );
  if (tylkoWPakiecie.length)
    throw new BladTekstu(
      'artefakt',
      'atrybut-tylko-w-pakiecie',
      `${tylkoWPakiecie.length} atrybutów mówiących jest w pakiecie, a nie w odczycie ` +
        `ze źródeł:\n` +
        lista(skroc(tylkoWPakiecie)) +
        `\n    Tak wygląda atrybut wniesiony składnią, której skaner nie rozumie — ` +
        `rozwinięciem obiektu w bloku \`host\`, mixinem, dziedziczeniem. Punkt 3 nie ` +
        `oglądałby go w ogóle.`,
    );

  const tylkoWZrodlach = [...mowiaceZrodel].filter(
    (w) => !mowiacePakietu.has(w),
  );
  if (tylkoWZrodlach.length)
    throw new BladTekstu(
      'artefakt',
      'atrybut-tylko-w-zrodlach',
      `${tylkoWZrodlach.length} atrybutów mówiących jest w źródłach, a nie w pakiecie:\n` +
        lista(skroc(tylkoWZrodlach)) +
        `\n    Najczęstsza przyczyna: nieaktualne \`${DIST}\`. Punkt 3 orzekałby wtedy ` +
        `o tekście, którego konsument nie dostaje.`,
    );

  // ── 3. SZABLON ──────────────────────────────────────────────────────────────
  const naruszeniaTekstu = [];
  for (const s of skany)
    for (const t of s.skaner.teksty)
      if (LITERA.test(t.wartosc))
        naruszeniaTekstu.push(
          `${s.plik}:${t.linia}: ${JSON.stringify(t.wartosc)}`,
        );
  if (naruszeniaTekstu.length)
    throw new BladTekstu(
      'szablon',
      'tekst-literalny',
      `${naruszeniaTekstu.length} węzłów tekstowych niesie napis wpisany w szablon:\n` +
        lista(skroc(naruszeniaTekstu)) +
        `\n    Napis, który biblioteka wypisuje sama, idzie przez \`PCT_TEXTS\`: pole ` +
        `w \`PctTexts\`, wartość domyślna w \`PCT_DEFAULT_TEXTS\`, odczyt \`texts().klucz\` ` +
        `w szablonie (req-api-texts). Znak bez litery (\`*\`, \`×\`) tekstem nie jest ` +
        `i tu nie zapala — nie ma w nim czego przetłumaczyć.`,
    );

  const naruszeniaAtrybutu = [];
  for (const s of skany)
    for (const a of s.skaner.atrybuty)
      if (LITERA.test(a.wartosc))
        naruszeniaAtrybutu.push(
          `${s.plik}:${a.linia}: ${a.nazwa}="${a.wartosc}"`,
        );
  for (const k of klasy)
    for (const [nazwa, wartosc] of k.atrybuty)
      if (ATRYBUTY_MOWIACE.has(nazwa) && LITERA.test(wartosc))
        naruszeniaAtrybutu.push(`${k.plik}: host \`${nazwa}\` = "${wartosc}"`);
  if (naruszeniaAtrybutu.length)
    throw new BladTekstu(
      'szablon',
      'atrybut-mowiacy',
      `${naruszeniaAtrybutu.length} atrybutów mówiących niesie napis wpisany wprost:\n` +
        lista(skroc(naruszeniaAtrybutu)) +
        `\n    Wartość \`aria-label\`, \`title\` czy \`placeholder\` czyta użytkownik — to ` +
        `tekst, nie słowo kluczowe specyfikacji (jak \`role="combobox"\`). Idzie przez ` +
        `\`PCT_TEXTS\`.`,
    );

  const naruszeniaWyrazenia = [];
  for (const s of skany)
    for (const w of s.skaner.wyrazenia)
      if (LITERA.test(w.wartosc))
        naruszeniaWyrazenia.push(
          `${s.plik}:${w.linia}: ${w.gdzie} → ${JSON.stringify(w.wartosc)}`,
        );
  for (const k of klasy)
    for (const [nazwa, wartosc] of k.literaly)
      if (LITERA.test(wartosc))
        naruszeniaWyrazenia.push(
          `${k.plik}: host \`${nazwa}\` → ${JSON.stringify(wartosc)}`,
        );
  if (naruszeniaWyrazenia.length)
    throw new BladTekstu(
      'szablon',
      'literal-w-wyrazeniu',
      `${naruszeniaWyrazenia.length} literałów napisowych trafia do DOM z wyrażenia:\n` +
        lista(skroc(naruszeniaWyrazenia)) +
        `\n    \`{{ open() ? 'Zamknij' : 'Otwórz' }}\` omija kanał tak samo jak napis ` +
        `wpisany w tekst węzła — z tą różnicą, że wygląda na kod. Argument pipe'a się ` +
        `nie liczy: to znacznik formatu, a nie tekst.`,
    );

  const zIcu = skany.filter((s) => s.skaner.icu);
  if (zIcu.length)
    throw new BladTekstu(
      'szablon',
      'icu',
      `${zIcu.length} szablonów używa wyrażenia ICU:\n` +
        lista(zIcu.map((s) => `${s.plik}: ${s.skaner.icu} wystąpień`)) +
        `\n    ICU trzyma warianty tekstu w drzewie i18n, do którego ten odczyt nie ` +
        `sięga — a \`PCT_TEXTS\` jest mapą napisów, nie gramatyką, więc nie ma czym ich ` +
        `obsłużyć. Liczba mnoga w bibliotece jest decyzją do zapisania (ADR), a nie ` +
        `składnią do wpisania.`,
    );

  // ── 4. TYPESCRIPT ───────────────────────────────────────────────────────────
  const fabryki = we.fabryki.wywolania;
  if (!fabryki.length || we.fabryki.nierozpoznane.length)
    throw new BladTekstu(
      'typescript',
      'pusty-pomiar',
      `skaner rozpoznał ${fabryki.length} wywołań fabryk sygnałów, a ` +
        `${we.fabryki.nierozpoznane.length} przypisań zostawił nierozwiązanych:\n` +
        lista(skroc(we.fabryki.nierozpoznane)) +
        `\n    Wejście, którego skaner nie rozwiązał do wywołania, wnosi wartość ` +
        `domyślną, o której ten punkt nie orzeka. Licznik liczy PRZYPISANIA, a nie ` +
        `wywołania: wywołań skaner znajduje więcej (fabryka w ciele funkcji, ` +
        `w argumencie), więc porównanie sum przechodziłoby także wtedy, gdyby jedno ` +
        `przypisanie zniknęło.`,
    );

  const proza = fabryki.flatMap((f) =>
    [...f.argument.matchAll(LITERAL_W_WYRAZENIU)]
      .map((m) => m[1] ?? m[2])
      .filter(jestProza)
      .map(
        (v) => `${f.plik}:${f.linia}: ${f.fabryka}(…) → ${JSON.stringify(v)}`,
      ),
  );
  if (proza.length)
    throw new BladTekstu(
      'typescript',
      'proza-w-fabryce',
      `${proza.length} wartości domyślnych sygnału jest prozą:\n` +
        lista(skroc(proza)) +
        `\n    Napis biblioteki idzie przez \`PCT_TEXTS\`. Wartość osi (\`md\`, \`solid\`, ` +
        `\`inset\`) prozą nie jest i tu nie zapala — rozróżnia je kształt: wielka litera ` +
        `na początku albo spacja w środku.`,
    );

  const tekstDomyslny = fabryki
    .filter(
      (f) =>
        f.napisowe &&
        [...f.argument.matchAll(LITERAL_W_WYRAZENIU)].some(
          (m) => (m[1] ?? m[2]) !== '',
        ),
    )
    .map((f) => `${f.plik}:${f.linia}: ${f.fabryka}<string>(${f.argument})`);
  if (tekstDomyslny.length)
    throw new BladTekstu(
      'typescript',
      'tekst-jako-domyslna',
      `${tekstDomyslny.length} wejść zadeklarowanych jako \`<string>\` ma literał ` +
        `w wartości domyślnej:\n` +
        lista(skroc(tekstDomyslny)) +
        `\n    \`<string>\` znaczy „tekst dowolny", więc literał w tym miejscu jest ` +
        `napisem biblioteki niezależnie od tego, jak wygląda. Pusty (\`''\`) znaczy „brak ` +
        `wartości" i jest dozwolony.`,
    );

  const przyKonstrukcji = fabryki
    .filter(
      (f) => f.fabryka !== 'computed' && /\btexts\s*\(\s*\)/.test(f.argument),
    )
    .map((f) => `${f.plik}:${f.linia}: ${f.fabryka}(…${f.argument.trim()}…)`);
  if (przyKonstrukcji.length)
    throw new BladTekstu(
      'typescript',
      'napis-przy-konstrukcji',
      `${przyKonstrukcji.length} wartości domyślnych czyta \`PCT_TEXTS\` przy ` +
        `KONSTRUKCJI:\n` +
        lista(skroc(przyKonstrukcji)) +
        `\n    Wartość domyślna wejścia powstaje raz, więc aplikacja przełączająca język ` +
        `bez przeładowania zostaje z napisem sprzed zmiany — dokładnie ta wada, którą ` +
        `zamknęła decyzja 0014. Czytaj przez \`computed()\`, czyli przy renderowaniu.`,
    );

  // ── 5. KANAŁ ────────────────────────────────────────────────────────────────
  const { klucze, domyslne, odczyty, wstrzykniecia } = we.kanal;

  if (!klucze.length)
    throw new BladTekstu(
      'kanal',
      'pusty-pomiar',
      `nie znalazłem ani jednego pola w \`export interface PctTexts\` — cały punkt 5 ` +
        `przeszedłby wtedy, nie mając czego porównać.\n    Najczęstsza przyczyna: ` +
        `interfejs przeniesiony do innego pliku albo zapisany inaczej.`,
    );

  const zleWstrzykniecia = wstrzykniecia
    .filter((w) => w.nazwa !== 'texts')
    .map((w) => `${w.plik}:${w.linia}: ${w.nazwa ?? '(bez przypisania)'}`);
  if (zleWstrzykniecia.length)
    throw new BladTekstu(
      'kanal',
      'inject-pod-inna-nazwa',
      `${zleWstrzykniecia.length} wstrzyknięć \`PCT_TEXTS\` ląduje pod nazwą inną niż ` +
        `\`texts\`:\n` +
        lista(zleWstrzykniecia) +
        `\n    Odczyty liczy się wzorcem \`texts().klucz\`, więc inna nazwa czyni je ` +
        `niewidzialnymi — a wtedy reguła „klucz musi być używany" orzeka o kluczach, ` +
        `których po prostu nie widzi.`,
    );

  const bezDomyslnej = klucze.filter((k) => !(k in domyslne));
  if (bezDomyslnej.length)
    throw new BladTekstu(
      'kanal',
      'klucz-bez-domyslnej',
      `${bezDomyslnej.length} pól \`PctTexts\` nie ma wartości domyślnej:\n` +
        lista(bezDomyslnej) +
        `\n    Nadpisanie jest częściowe (decyzja 0007), więc pole bez domyślnej dociera ` +
        `do DOM jako \`undefined\` u każdego, kto go nie przetłumaczył.`,
    );

  const bezKlucza = Object.keys(domyslne).filter((k) => !klucze.includes(k));
  if (bezKlucza.length)
    throw new BladTekstu(
      'kanal',
      'domyslna-bez-klucza',
      `${bezKlucza.length} wartości domyślnych nie ma pola w \`PctTexts\`:\n` +
        lista(bezKlucza) +
        `\n    Napis, którego nie ma w typie, jest napisem, którego konsument nie ma jak ` +
        `nadpisać — \`providePctTexts\` przyjmuje \`Partial<PctTexts>\`.`,
    );

  const puste = klucze.filter(
    (k) => k in domyslne && domyslne[k].trim() === '',
  );
  if (puste.length)
    throw new BladTekstu(
      'kanal',
      'domyslna-pusta',
      `${puste.length} wartości domyślnych jest pustych:\n` +
        lista(puste) +
        `\n    Pusta domyślna zamienia „biblioteka wypisuje to sama" w „biblioteka nie ` +
        `wypisuje nic" u każdego, kto nie przetłumaczył tego pola.`,
    );

  const uzyte = new Set(odczyty.map((o) => o.klucz));
  const martwe = klucze.filter((k) => !uzyte.has(k));
  if (martwe.length)
    throw new BladTekstu(
      'kanal',
      'klucz-martwy',
      `${martwe.length} pól \`PctTexts\` nie czyta żaden komponent:\n` +
        lista(martwe) +
        `\n    To pokrycie, którego nie ma: pole stoi w publicznym typie, konsument je ` +
        `tłumaczy, a nie widać go nigdzie. Ten sam ruch co usunięcie martwego ` +
        `\`--pct-on-danger\` w A12 — pole wraca z komponentem, który je wypisze.`,
    );

  const donikad = odczyty
    .filter((o) => !klucze.includes(o.klucz))
    .map((o) => `${o.plik}: texts().${o.klucz}`);
  if (donikad.length)
    throw new BladTekstu(
      'kanal',
      'odczyt-donikad',
      `${donikad.length} odczytów wskazuje pole, którego nie ma w \`PctTexts\`:\n` +
        lista(skroc(donikad)) +
        `\n    W szablonie taki odczyt nie jest błędem kompilacji — jest pustym miejscem ` +
        `na ekranie.`,
    );

  // ── 6. OSTRZEŻENIA ──────────────────────────────────────────────────────────
  const zKanalu = we.ostrzezenia
    .filter((o) => /\btexts\s*\(\s*\)/.test(o.argument))
    .map((o) => `${o.plik}:${o.linia}`);
  if (zKanalu.length)
    throw new BladTekstu(
      'ostrzezenia',
      'ostrzezenie-z-kanalu',
      `${zKanalu.length} ostrzeżeń deweloperskich czerpie z \`PCT_TEXTS\`:\n` +
        lista(zKanalu) +
        `\n    Ostrzeżenie czyta programista, nie użytkownik — tłumaczenie go nikomu nie ` +
        `pomaga i zabiera miejsce w typie, który konsument musi wypełnić (decyzja 0007).`,
    );

  const bezDevMode = we.ostrzezenia
    .filter((o) => !o.strzezone)
    .map((o) => `${o.plik}:${o.linia}: console.${o.metoda}(…)`);
  if (bezDevMode.length)
    throw new BladTekstu(
      'ostrzezenia',
      'ostrzezenie-bez-devmode',
      `${bezDevMode.length} wywołań \`console.*\` nie gaśnie poza \`isDevMode()\`:\n` +
        lista(bezDevMode) +
        `\n    Wymaganie zastrzega ten kanał dla trybu deweloperskiego. Strażnik może ` +
        `stać w tej samej funkcji albo przy KAŻDYM jej wywołaniu — bramka uznaje oba ` +
        `zapisy, bo \`if (isDevMode()) this.ostrzez()\` jest lepszy, a nie gorszy.`,
    );

  const tekstow = skany.reduce((n, s) => n + s.skaner.teksty.length, 0);
  return {
    opis:
      `${szablony.length} szablonów (${wezlow} węzłów, ${tekstow} tekstów), ` +
      `${klasy.length} klas, ${fabryki.length} sygnałów, ` +
      `${klucze.length} pól PctTexts w ${odczyty.length} odczytach, ` +
      `${we.ostrzezenia.length} ostrzeżeń deweloperskich`,
  };
};

// ── wejście z dysku ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

const jestZrodlem = (p) =>
  p.startsWith(`${PROJEKT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const jestSzablonem = (p) => p.startsWith(`${PROJEKT}/`) && p.endsWith('.html');

/**
 * Statyczne atrybuty z płaskiej tablicy Angulara (`consts`, `hostAttrs`).
 * Liczba otwiera sekcję o innym znaczeniu (klasy, style, wiązania), więc
 * czytamy wyłącznie prefiks przed pierwszą liczbą — dalej stoją nazwy bez
 * wartości. Ten sam parser co w `check-parts`.
 */
const parujAtrybuty = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i++) {
    if (typeof attrs[i] === 'number') break;
    out.push([attrs[i], attrs[i + 1]]);
    i++;
  }
  return out;
};

/**
 * Definicje ze ZBUDOWANEGO pakietu. `@angular/compiler` jest wczytany pierwszy,
 * bo pakiet jest skompilowany częściowo i `ɵcmp` powstaje dopiero przy dostępie
 * — ten sam krok, który u konsumenta wykonuje linker (`lesson-46`).
 */
const komponentyPakietu = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new BladTekstu(
      'artefakt',
      'pakiet-pusty',
      `brak zbudowanego pakietu w ${DIST} — bramka czyta artefakt, nie same źródła.\n` +
        `    Target musi mieć \`dependsOn\` na build biblioteki.`,
    );

  await import('@angular/compiler');
  const exports =
    JSON.parse(czytaj(root, `${DIST}/package.json`)).exports ?? {};
  const out = [];

  for (const [wejscie, cel] of Object.entries(exports)) {
    const plik = typeof cel === 'object' ? cel.default : cel;
    if (typeof plik !== 'string' || !plik.endsWith('.mjs')) continue;

    const modul = await import(
      pathToFileURL(join(dist, plik.replace(/^\.\//, ''))).href
    );
    for (const [klasa, wartosc] of Object.entries(modul)) {
      if (typeof wartosc !== 'function') continue;
      const def = wartosc['ɵcmp'] ?? wartosc['ɵdir'];
      if (!def) continue;

      const consts =
        typeof def.consts === 'function' ? def.consts() : (def.consts ?? []);
      out.push({
        wejscie,
        klasa,
        atrybuty: [
          ...consts.filter(Array.isArray).flatMap(parujAtrybuty),
          ...parujAtrybuty(def.hostAttrs ?? []),
        ],
      });
    }
  }
  return out;
};

/**
 * Ostrzeżenia deweloperskie z jednego pliku. Strażnik `isDevMode()` uznawany
 * jest w dwóch miejscach: w tej samej funkcji, w której stoi `console.*`, albo
 * przy każdym jej wywołaniu. Drugi zapis jest w bibliotece lepszy — nie wchodzi
 * w funkcję, której i tak nie ma po co wykonywać — więc bramka nie może go
 * karać.
 */
const czytajOstrzezenia = (plik, tresc) => {
  const out = [];
  for (const m of tresc.matchAll(KONSOLA)) {
    const otw = m.index + m[0].length - 1;
    const zam = dopasuj(tresc, otw, '(', ')');
    const argument = zam === -1 ? '' : tresc.slice(otw + 1, zam);
    const przed = tresc.slice(0, m.index);
    const linia = przed.split('\n').length;

    // Funkcja otaczająca: ostatnia deklaracja metody przed wywołaniem.
    const metody = [
      ...przed.matchAll(
        /^ {2}(?:private |protected )?([A-Za-z_$][\w$]*)\s*\(/gm,
      ),
    ];
    const metoda = metody.at(-1)?.[1] ?? null;
    const cialoOd = metody.at(-1)?.index ?? 0;

    const wFunkcji = /\bisDevMode\s*\(\s*\)/.test(
      tresc.slice(cialoOd, m.index),
    );
    const wywolania = metoda
      ? [...tresc.matchAll(new RegExp(`\\bthis\\.${metoda}\\s*\\(`, 'g'))]
      : [];
    const przyWywolaniach =
      wywolania.length > 0 &&
      wywolania.every((w) =>
        /\bisDevMode\s*\(\s*\)/.test(
          tresc.slice(tresc.lastIndexOf('\n', w.index) + 1, w.index),
        ),
      );

    out.push({
      plik,
      linia,
      metoda,
      metodaWywolan: wywolania.length,
      argument,
      strzezone: wFunkcji || przyWywolaniach,
    });
  }
  return out;
};

/** Wejście złożone z listy plików — ta sama postać dla repo i dla fixture'a. */
const zbierzWejscie = async (root, pliki, pakietZDysku) => {
  const zrodla = pliki.filter(jestZrodlem);
  const tresci = new Map(zrodla.map((p) => [p, czytaj(root, p)]));

  const fabryki = { wywolania: [], nierozpoznane: [] };
  const odczyty = [];
  const wstrzykniecia = [];
  const ostrzezenia = [];
  let klucze = [];
  const domyslne = {};

  for (const [plik, tresc] of tresci) {
    const f = czytajFabryki(plik, tresc);
    fabryki.wywolania.push(...f.wywolania);
    fabryki.nierozpoznane.push(...f.nierozpoznane);
    ostrzezenia.push(...czytajOstrzezenia(plik, tresc));

    for (const m of tresc.matchAll(ODCZYT)) odczyty.push({ plik, klucz: m[1] });
    for (const m of tresc.matchAll(WSTRZYKNIECIE))
      wstrzykniecia.push({
        plik,
        linia: tresc.slice(0, m.index).split('\n').length,
        nazwa: m[1] ?? null,
      });

    const interfejs = KLUCZE_INTERFEJSU.exec(tresc);
    if (interfejs) klucze = [...interfejs[1].matchAll(POLE)].map((m) => m[1]);
    const dom = DOMYSLNE.exec(tresc);
    if (dom)
      for (const m of dom[1].matchAll(DOMYSLNA_PARA)) domyslne[m[1]] = m[3];
  }

  const szablony = pliki
    .filter(jestSzablonem)
    .map((plik) => ({ plik, tresc: czytaj(root, plik) }));
  for (const { plik, tresc } of szablony)
    for (const m of tresc.matchAll(ODCZYT)) odczyty.push({ plik, klucz: m[1] });

  return {
    ...czytajZrodla(root, zrodla),
    zrodla,
    szablony,
    fabryki,
    kanal: { klucze, domyslne, odczyty, wstrzykniecia },
    ostrzezenia,
    pakiet: pakietZDysku ?? (await komponentyPakietu(root)),
  };
};

/**
 * Pliki z INDEKSU GITA, nie z globa po dysku — ten sam powód co w pozostałych
 * bramkach: indeks jest niezależnym spisem tego, co repozytorium naprawdę
 * wiezie. Pathspec jest KATALOGIEM, a filtrowanie siedzi w JS-ie, bo pathspec
 * gita nie jest globem powłoki i wzorzec z gwiazdką potrafi zwrócić ZERO plików
 * zamiast błędu (`lesson-48`).
 */
const plikiRepozytorium = () =>
  execFileSync('git', ['ls-files', '-z', PROJEKT], {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\0')
    .filter(Boolean)
    .map((p) => p.split('\\').join('/'))
    .sort();

// ── kontrola odniesienia ──────────────────────────────────────────────────────

/**
 * Składa spreparowane wejście: kopia bazy, na nią pliki przypadku, potem
 * usunięcia z `fixture.json`. Katalog przypadku zawiera więc WYŁĄCZNIE swoją
 * wadę, a nie kolejny egzemplarz poprawnego wejścia, w którym trzeba jej
 * szukać.
 *
 * Odczyt z pakietu przychodzi jako DANE (`pakiet.json`), a nie z prawdziwego
 * builda — ten sam wybór co w `check-parts` i `check-zoneless` i z tego samego
 * powodu: zbudowanie pakietu Angulara na każdy z kilkunastu przypadków
 * kosztowałoby minuty na przebieg. Cenę widać wprost: fixtures NIE ćwiczą kodu
 * czytającego `ɵcmp` — ćwiczą wszystkie pozostałe parsery i cały układ kontroli.
 * Sam odczyt z pakietu jest ćwiczony przy każdym przebiegu na repozytorium.
 *
 * Źródła leżą w repozytorium jako `*.ts.txt` i dopiero tutaj stają się `*.ts` —
 * plik `.ts` w `tools/` nie należy do żadnego programu kompilatora, więc
 * zapaliłby `check-typecheck`. Fixture jednej bramki nie może być wadą dla
 * drugiej.
 */
const zlozFixture = (nazwa, fx) => {
  const cel = mkdtempSync(join(tmpdir(), 'pct-check-texts-'));
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

const wejscieFixture = (katalog) =>
  zbierzWejscie(
    katalog,
    globSync('**/*.{ts,html}', { cwd: katalog })
      .map((p) => p.split('\\').join('/'))
      .sort(),
    JSON.parse(readFileSync(join(katalog, 'pakiet.json'), 'utf8')).klasy,
  );

// ── przebieg ──────────────────────────────────────────────────────────────────

const problems = [];
let opis = null;

try {
  opis = sprawdzTeksty(
    await zbierzWejscie(ROOT, plikiRepozytorium(), null),
  ).opis;
} catch (blad) {
  if (!(blad instanceof BladTekstu)) throw blad;
  problems.push(`${blad.kontrola}/${blad.regula}: ${blad.message}`);
}

const przypadki = readdirSync(FIXTURES, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== BAZA)
  .map((d) => d.name)
  .sort();

if (przypadki.length === 0)
  problems.push(
    `tools/check-texts.fixtures: brak spreparowanych wejść — bramka bez dowodu, ` +
      `że potrafi nie przejść, jest kolejną cichą wadą (req-quality-negative-control)`,
  );

// Wejście wzorcowe MUSI przejść: gdyby baza sama była wadliwa, każdy przypadek
// zapalałby z jej powodu, a nie ze swojego, i wszystkie „odrzucone" byłyby
// fałszywe — czyli ta kontrola stałaby się tym, przed czym stoi.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzTeksty(await wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladTekstu)) throw blad;
    problems.push(
      `${BAZA}: wejście wzorcowe NIE przechodzi (${blad.kontrola}/${blad.regula}) — ` +
        `każdy spreparowany przypadek zapala teraz z jego powodu.\n    ${blad.message}`,
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
    sprawdzTeksty(await wejscieFixture(katalog));
    problems.push(
      `${nazwa}: spreparowane wejście PRZESZŁO, a miało nie przejść — ` +
        `punkt ${fx.punkt} (\`${fx.kontrola}/${fx.regula}\`) przestał cokolwiek badać`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTekstu)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: zapaliła \`${blad.kontrola}/${blad.regula}\`, a miał punkt ${fx.punkt} ` +
          `(\`${fx.kontrola}/${fx.regula}\`) — fixture dowodzi czegoś innego, niż deklaruje`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── wynik ─────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Bramka kanału tekstów — ${problems.length} naruszeń:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Teksty: ${opis}. Kontrola odniesienia: wejście wzorcowe przechodzi, ` +
    `${przypadki.length} spreparowanych odrzuconych na swoich regułach.`,
);
