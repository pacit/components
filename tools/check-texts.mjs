#!/usr/bin/env node
/**
 * Texts channel gate: `req-api-texts` — a string the library prints ITSELF goes through the
 * `PCT_TEXTS` token, not into a template or an input's default. A literal added to a template
 * compiles, passes the tests and looks right in every screenshot; it breaks at a consumer.
 *
 *  1. DENOMINATOR: every decorator parsed, every template owned, no unknown AST node,
 *  2. ARTIFACT: the classes and static attributes from the sources match the BUILT package,
 *  3. TEMPLATE: no text node and no SPEAKING attribute carries a literal with a letter,
 *  4. TYPESCRIPT: a signal's default is not prose and does not read `PCT_TEXTS`,
 *  5. CHANNEL: the `PctTexts` keys, their defaults and their reads are one set,
 *  6. WARNINGS: `console.*` draws nothing from `PCT_TEXTS` and is quiet outside `isDevMode()`.
 *
 * The template is read by `parseTemplate` from `@angular/compiler` and walked by
 * `TmplAstRecursiveVisitor`: it cannot lose syntax quietly, and point 1's four rules watch
 * that it sees EVERYTHING.
 *
 * Usage: node tools/check-texts.mjs
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
 * The attributes whose value a user SEES or HEARS. The list is closed, and that is its
 * defect, known in advance: there is no way for a machine to derive it. It is visible,
 * though — adding an entry is a line in the diff, exactly like the name dictionary in
 * `check-tokens` (A4).
 *
 * The first group holds the ARIA properties with a STRING value (not an idref, an enum or
 * a number) — only they carry text for a screen reader. The second holds the HTML
 * attributes whose value lands on screen. `role`, `type` and `aria-haspopup` belong to
 * neither: their values are keywords of a specification, not text — which is why
 * `role="combobox"` is no violation here.
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

/** `<input type="submit">` prints `value` as the button's label. */
const PRZYCISKI = new Set(['submit', 'button', 'reset']);

const LITERA = /\p{L}/u;

/**
 * Prose in TypeScript. In a template it is POSITION that decides whether a literal is text
 * (a text node is text by definition); in TS there is no position, so shape decides. A
 * capital letter at the start or a space in the middle tells a sentence from an axis value
 * (`md`, `solid`, `inset`, `pctPrefix`) — measured across the whole library: nothing fires
 * on this rule today, and `Select…` and `No options` both do.
 *
 * A known limit: a one-word lowercase string (`close`) is indistinguishable from an axis
 * value to this rule. The point's second rule closes that — an input declared as
 * `input<string>` is arbitrary text by definition, so a literal in its default fires
 * whatever its shape.
 */
const jestProza = (v) => LITERA.test(v) && (/^\p{Lu}/u.test(v) || /\s/.test(v));

const lista = (wpisy) => wpisy.map((w) => `      ${w}`).join('\n');

const skroc = (wpisy, ile = 8) =>
  wpisy.length <= ile
    ? wpisy
    : [...wpisy.slice(0, ile), `… i ${wpisy.length - ile} dalszych`];

const ile = (tekst, wzorzec) => (tekst.match(wzorzec) ?? []).length;

// ── source scanners ────────────────────────────────────────────────────────────

/**
 * Ta sama kotwica co w `check-parts` i z tego samego powodu: formatowanie
 * enforced by `nx format:check` puts `@Component({` and `})` in column zero. The counter
 * does NOT repeat that anchor — a repeated one would put out both sides of the comparison
 * at once (`lesson-48`).
 */
const DEKORATOR =
  /^@(Component|Directive)\(\{\r?\n([\s\S]*?)^\}\)\r?\n(?:export\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/gm;
const DEKORATOR_LICZNIK = /^[ \t]*@(?:Component|Directive)\(/gm;

const TEMPLATE_URL = /templateUrl\s*:\s*(['"])([^'"]*)\1/;
const TEMPLATE_INLINE = /^\s{2}template\s*:\s*([\s\S]*?),?\s*$/m;

/** A string literal in an expression (a binding in a `host` block is a string). */
const LITERAL_W_WYRAZENIU = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"/g;

/**
 * The key of a `host` block entry — the quotes are optional, because prettier does not add
 * them: `role: 'spinbutton'` and `'[attr.aria-label]': 'x()'` stand side by side in the same
 * block (`field/src/number.ts`). A pattern demanding quotes would let the first through
 * SILENTLY — and that is exactly the half the static attributes sit in.
 */
const HOST_KLUCZ = /(?:'([^']*)'|"([^"]*)"|([A-Za-z_$][\w$]*))\s*:/g;

/**
 * The `host` block's entries as key/value pairs — with the values read with escapes in
 * mind, because bindings carry the other kind of quote inside (`'open() ? "" : null'`).
 *
 * An entry this scanner does not understand (a `...fitHost` spread, a value composed by an
 * expression) is skipped WITHOUT a message — deliberately: its denominator is point 2, the
 * comparison against the built package. A static attribute brought in by such syntax will
 * appear on the artifact's side and be missing on the sources' side, so it fires with its
 * name in the message.
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
 * The `host` block from a decorator's body — with braces matched rather than a regex up to
 * the first `}`: values can contain braces (`'open() ? "" : null'`).
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
 * Decorated classes. `atrybuty` are the `host` block's static attributes (name/value
 * pairs), `literaly` the string literals from the expressions of speaking-attribute
 * bindings.
 *
 * A `host` block is sometimes composed by spreading somebody else's object (`...fitHost` in
 * `field/src/affix.ts`) and this scanner does not see that — deliberately, exactly as in
 * `check-parts`. An attribute brought in by a spread appears in the package read and is
 * missing from the source read, so it fires point 2. Exactly the work the second read is
 * there to do.
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
        // An empty template (`template: ''` in `number.ts` and `text.ts`) has nothing to
        // print a string with. Any other notation written into the decorator is a hole:
        // this scanner reads `.html` files, so text from a decorator would be invisible to
        // it and travels to the browser all the same.
        inline: inline !== null && !/^(''|"")$/.test(inline[1].trim()),
        atrybuty,
        literaly,
      });
    }
  }

  return { klasy, deklaracji };
};

/**
 * The node kinds this walk understands. The list exists so that the day Angular adds a new
 * kind of node carrying text (on the horizon today: `TmplAstComponent` and
 * `TmplAstDirective` from the selectorless syntax) is the day this gate SAYS so — rather
 * than the day it quietly stops measuring that node's contents.
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

/** String literals from an expression — pipe arguments excluded (see `visitPipe`). */
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
   * A pipe's argument never reaches the DOM — it is a format marker (`date: 'short'`),
   * not text. The rule speaks of prose landing on screen, so covering it would contradict
   * the rule itself.
   */
  visitPipe(node, ctx) {
    node.exp.visit(this, ctx);
  }
}

/**
 * One walk over a template's tree. It collects what the user sees: node texts, the values
 * of speaking attributes and the literals from expressions that land in such a place. It
 * counts visited nodes along the way — point 1 compares that count against zero, because a
 * pass that visited nothing
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
          gdzie: `binding \`${node.name}\``,
          wartosc: v,
          linia: linia(node),
        }),
      ),
    );
  }

  /**
   * ICU keeps its text variants in a separate i18n tree this walk does not reach — and
   * `PCT_TEXTS` has nothing to handle such a string with, being a map of strings rather
   * than a grammar. Instead of reading it by halves, point 3 forbids it: the same move as
   * forbidding a bound part name in `check-parts` — a thing the measurement cannot see is
   * to be loud rather than invisible.
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
 * `preserveWhitespaces: false` — that is how a template really compiles, so that is the set
 * of nodes reaching the browser. Under `true` every indent would be a text node of its own
 * and point 3 would be pronouncing on whitespace.
 */
const czytajSzablon = (plik, tresc) => {
  const wynik = parseTemplate(tresc, plik, { preserveWhitespaces: false });
  const skaner = new SkanerSzablonu(plik);
  if (!wynik.errors?.length) visitAll(skaner, wynik.nodes);
  return { plik, bledy: wynik.errors ?? [], skaner };
};

// ── skaner TypeScriptu ────────────────────────────────────────────────────────

/**
 * Signal factory calls together with their first argument. The generic is not parsed with a
 * regex: `input<readonly PctSelectOption<T>[]>([])` has a `>` inside, so a `<[^>]*>` pattern
 * would let it through SILENTLY — and an input the scanner did not see is exactly what this
 * point is looking for. Angle brackets are therefore counted like round ones.
 */
const FABRYKI = ['input', 'model', 'signal', 'computed'];
/**
 * The independent counter cannot count calls — the scanner finds MORE of them than
 * assignments (a factory called in a function body, in an argument, in a conditional), so
 * comparing the sums would pass even with one assignment gone. ASSIGNMENTS are counted
 * instead, and the condition is that the scanner resolves each of them to a call.
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
            `= ${m[1]} with no recognised call`,
        );
    };
    let k = m.index + m[1].length;
    // `.required` and the generic are optional and may appear in that order.
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

    // The first argument alone: `input('x', { alias: 'Name' })` carries an attribute name
    // in the second, not a string. The comma is counted outside any nesting.
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
      // The declared type of the first parameter — `input<string>` means „arbitrary
      // text", that is, a place where a literal is prose by definition.
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
/** `inject(PCT_TEXTS)` has to land under the name `texts` — else the read disappears. */
const WSTRZYKNIECIE = /(?:(\w+)\s*=\s*)?inject\(\s*PCT_TEXTS\s*\)/g;

const KONSOLA = /\bconsole\.(log|warn|error|info|debug)\s*\(/g;

// ── kontrole ──────────────────────────────────────────────────────────────────

/**
 * A violation — with the identifier of the point AND of the rule. The point alone is not
 * enough: point 3 carries four rules, point 5 six, and a negative control comparing only
 * the point would let through a case that fired on a neighbouring rule (`lesson-50`, the
 * conclusion of A12).
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
      `no \`@Component\`/\`@Directive\` decorator found in the sources ` +
        `(${PROJEKT}; files: ${zrodla.length}) — every later point would then pass ` +
        `without pronouncing on anything (lesson-48).\n    Usual cause: the list of ` +
        `source files stopped returning anything.`,
    );

  if (klasy.length !== deklaracji)
    throw new BladTekstu(
      'mianownik',
      'parser-dekoratorow',
      `the parser recognised ${klasy.length} of ${deklaracji} decorators — the rest ` +
        `would drop out of the measurement without a trace, together with their \`host\` ` +
        `block. Usual cause: a decorator written otherwise than prettier formats it ` +
        `(\`@Component({\` and \`})\` in column zero).`,
    );

  const wInline = klasy.filter((k) => k.inline);
  if (wInline.length)
    throw new BladTekstu(
      'mianownik',
      'szablon-w-dekoratorze',
      `${wInline.length} klas bierze szablon z dekoratora, a nie z pliku:\n` +
        lista(wInline.map((k) => `${k.plik}: ${k.klasa}`)) +
        `\n    This scanner reads \`.html\` files, so a string written into a decorator ` +
        `would be invisible to it — and travels to the browser all the same. Move the ` +
        `template out to ` +
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
      `${brakujace.length} templates named by \`templateUrl\` are not on the gate's ` +
        `file list:\n` +
        lista(brakujace) +
        `\n    Their texts will not enter the measurement. Usual cause: a file outside ` +
        `the git index, or a pathspec that stopped covering it.`,
    );

  const osierocone = szablony.filter((s) => !uzywane.has(s.plik));
  if (osierocone.length)
    throw new BladTekstu(
      'mianownik',
      'szablon-bez-wlasciciela',
      `${osierocone.length} templates belong to no decorator:\n` +
        lista(osierocone.map((s) => s.plik)) +
        `\n    A template nobody points at is an orphan to the measurement — and travels ` +
        `to the browser like every other one.`,
    );

  const skany = szablony.map((s) => czytajSzablon(s.plik, s.tresc));

  const zBledem = skany.filter((s) => s.bledy.length);
  if (zBledem.length)
    throw new BladTekstu(
      'mianownik',
      'parser-szablonu',
      `Angular's parser rejected ${zBledem.length} templates:\n` +
        lista(
          zBledem.map((s) => `${s.plik}: ${s.bledy[0].msg.split('\n')[0]}`),
        ) +
        `\n    A tree that does not exist has no text node either — point 3 would pass ` +
        `over it without objection.`,
    );

  const nieznane = skany.filter((s) => s.skaner.nieznane.size);
  if (nieznane.length)
    throw new BladTekstu(
      'mianownik',
      'nieznany-wezel',
      `${nieznane.length} templates carry a node kind this walk does not know:\n` +
        lista(
          nieznane.map(
            (s) => `${s.plik}: ${[...s.skaner.nieznane].join(', ')}`,
          ),
        ) +
        `\n    A new node kind may carry text, and the default walk would pass through ` +
        `it without a word. Add it to \`ZNANE_WEZLY\` with a decision on whether it does.`,
    );

  const wezlow = skany.reduce((n, s) => n + s.skaner.wezlow, 0);
  if (!wezlow)
    throw new BladTekstu(
      'mianownik',
      'pusty-pomiar',
      `${szablony.length} templates, 0 visited nodes — the measurement never started.\n` +
        `    The non-emptiness check stands on the RESULT's side, not the input's: the ` +
        `file count is sometimes right while the read itself is empty (lesson-48, the ` +
        `same mistake as ` +
        `w A5 i A12).`,
    );

  // ── 2. ARTIFACT ─────────────────────────────────────────────────────────────
  //
  //    The source read reads a decorator's text, so it is blind to a `host` block
  //    composed by spreading somebody else's object (`...fitHost`). The package read
  //    reads `ɵdir.hostAttrs` and `ɵcmp.consts` after linking — the output of the REAL
  //    compiler. The same move as in A3 and A6.
  if (!pakiet.length)
    throw new BladTekstu(
      'artefakt',
      'pakiet-pusty',
      `the built package gave not one class with an Angular definition — the comparison ` +
        `would pass with nothing to compare.\n    Usual cause: a stale or empty ` +
        `\`${DIST}\` (the gate needs \`dependsOn: build\`).`,
    );

  const zeZrodel = new Map(klasy.map((k) => [k.klasa, k]));
  const zPakietu = new Map(pakiet.map((p) => [p.klasa, p]));

  const bezPakietu = [...zeZrodel.keys()].filter((k) => !zPakietu.has(k));
  if (bezPakietu.length)
    throw new BladTekstu(
      'artefakt',
      'klasa-bez-pakietu',
      `${bezPakietu.length} classes from the sources are not in the built package:\n` +
        lista(bezPakietu.map((k) => `${k} (${zeZrodel.get(k).plik})`)) +
        `\n    The measurement would then count the strings of a component the consumer ` +
        `never gets — or, more often, would be reading a stale \`${DIST}\`.`,
    );

  const bezZrodel = [...zPakietu.keys()].filter((k) => !zeZrodel.has(k));
  if (bezZrodel.length)
    throw new BladTekstu(
      'artefakt',
      'klasa-bez-zrodel',
      `${bezZrodel.length} classes from the package are invisible to the source scanner:\n` +
        lista(bezZrodel.map((k) => `${k} (${zPakietu.get(k).wejscie})`)) +
        `\n    A class the scanner did not see brings strings into a release that this ` +
        `gate says nothing about.`,
    );

  // A template's owner has a precondition of ITS OWN, even though point 1 guarantees it.
  // Without that, disarming the `szablon-bez-wlasciciela` rule turned this loop into a
  // `TypeError` — the negative control lost the ability to examine the rule it was meant to
  // examine. The same defect as in A3, A4, A7, A8 and A12; „do not trust the previous
  // point" apparently has to be written out in every gate.
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
      `${tylkoWPakiecie.length} speaking attributes are in the package and not in the ` +
        `source read:\n` +
        lista(skroc(tylkoWPakiecie)) +
        `\n    This is what an attribute brought in by syntax the scanner cannot read ` +
        `looks like — an object spread in a \`host\` block, a mixin, inheritance. Point 3 ` +
        `would never look at it.`,
    );

  const tylkoWZrodlach = [...mowiaceZrodel].filter(
    (w) => !mowiacePakietu.has(w),
  );
  if (tylkoWZrodlach.length)
    throw new BladTekstu(
      'artefakt',
      'atrybut-tylko-w-zrodlach',
      `${tylkoWZrodlach.length} speaking attributes are in the sources and not in the package:\n` +
        lista(skroc(tylkoWZrodlach)) +
        `\n    Usual cause: a stale \`${DIST}\`. Point 3 would then be pronouncing on ` +
        `text the consumer never gets.`,
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
      `${naruszeniaTekstu.length} text nodes carry a string written into the template:\n` +
        lista(skroc(naruszeniaTekstu)) +
        `\n    A string the library prints itself goes through \`PCT_TEXTS\`: a field in ` +
        `\`PctTexts\`, a default in \`PCT_DEFAULT_TEXTS\`, a \`texts().key\` read ` +
        `in the template (req-api-texts). A character with no letter (\`*\`, \`×\`) is not ` +
        `text and does not fire here — there is nothing in it to translate.`,
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
      `${naruszeniaAtrybutu.length} speaking attributes carry a string written inline:\n` +
        lista(skroc(naruszeniaAtrybutu)) +
        `\n    The value of \`aria-label\`, \`title\` or \`placeholder\` is read by the ` +
        `user — that is text, not a keyword of a specification (like \`role="combobox"\`). ` +
        `It goes through ` +
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
      `${naruszeniaWyrazenia.length} string literals reach the DOM from an expression:\n` +
        lista(skroc(naruszeniaWyrazenia)) +
        `\n    \`{{ open() ? 'Close' : 'Open' }}\` bypasses the channel exactly like a ` +
        `string written into a node's text — only it looks like code. A pipe's argument ` +
        `does not count: that is a format marker, not text.`,
    );

  const zIcu = skany.filter((s) => s.skaner.icu);
  if (zIcu.length)
    throw new BladTekstu(
      'szablon',
      'icu',
      `${zIcu.length} templates use an ICU expression:\n` +
        lista(zIcu.map((s) => `${s.plik}: ${s.skaner.icu} occurrences`)) +
        `\n    ICU keeps its text variants in an i18n tree this read does not reach — and ` +
        `\`PCT_TEXTS\` is a map of strings, not a grammar, so it has nothing to handle ` +
        `them with. Plurals in a library are a decision to record (an ADR), not a syntax ` +
        `to write.`,
    );

  // ── 4. TYPESCRIPT ───────────────────────────────────────────────────────────
  const fabryki = we.fabryki.wywolania;
  if (!fabryki.length || we.fabryki.nierozpoznane.length)
    throw new BladTekstu(
      'typescript',
      'pusty-pomiar',
      `the scanner recognised ${fabryki.length} signal factory calls and left ` +
        `${we.fabryki.nierozpoznane.length} assignments unresolved:\n` +
        lista(skroc(we.fabryki.nierozpoznane)) +
        `\n    An input the scanner did not resolve to a call brings a default value this ` +
        `point says nothing about. The counter counts ASSIGNMENTS, not calls: the scanner ` +
        `finds more calls (a factory in a function body, in an argument), so comparing the ` +
        `sums would pass even with one assignment gone.`,
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
      `${proza.length} signal defaults are prose:\n` +
        lista(skroc(proza)) +
        `\n    A library string goes through \`PCT_TEXTS\`. An axis value (\`md\`, ` +
        `\`solid\`, \`inset\`) is not prose and does not fire here — shape tells them ` +
        `apart: a capital at the start or a space in the middle.`,
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
      `${tekstDomyslny.length} inputs declared as \`<string>\` carry a literal as their ` +
        `default:\n` +
        lista(skroc(tekstDomyslny)) +
        `\n    \`<string>\` means „arbitrary text", so a literal in that place is a ` +
        `library string whatever it looks like. An empty one (\`''\`) means „no value" ` +
        `and is allowed.`,
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
      `${przyKonstrukcji.length} defaults read \`PCT_TEXTS\` at CONSTRUCTION:\n` +
        lista(skroc(przyKonstrukcji)) +
        `\n    An input's default is created once, so an application switching language ` +
        `without a reload keeps the string from before the change — exactly the defect ` +
        `decision 0014 closed. Read through \`computed()\`, that is, at render time.`,
    );

  // ── 5. CHANNEL ────────────────────────────────────────────────────────────────
  const { klucze, domyslne, odczyty, wstrzykniecia } = we.kanal;

  if (!klucze.length)
    throw new BladTekstu(
      'kanal',
      'pusty-pomiar',
      `no field found in \`export interface PctTexts\` — the whole of point 5 would then ` +
        `pass with nothing to compare.\n    Usual cause: the interface moved to another ` +
        `file, or written differently.`,
    );

  const zleWstrzykniecia = wstrzykniecia
    .filter((w) => w.nazwa !== 'texts')
    .map((w) => `${w.plik}:${w.linia}: ${w.nazwa ?? '(bez przypisania)'}`);
  if (zleWstrzykniecia.length)
    throw new BladTekstu(
      'kanal',
      'inject-pod-inna-nazwa',
      `${zleWstrzykniecia.length} \`PCT_TEXTS\` injections land under a name other than ` +
        `\`texts\`:\n` +
        lista(zleWstrzykniecia) +
        `\n    Reads are counted by the \`texts().key\` pattern, so another name makes ` +
        `them invisible — and then the „a key has to be used" rule pronounces on keys it ` +
        `simply cannot see.`,
    );

  const bezDomyslnej = klucze.filter((k) => !(k in domyslne));
  if (bezDomyslnej.length)
    throw new BladTekstu(
      'kanal',
      'klucz-bez-domyslnej',
      `${bezDomyslnej.length} \`PctTexts\` fields have no default value:\n` +
        lista(bezDomyslnej) +
        `\n    Overriding is partial (decision 0007), so a field with no default reaches ` +
        `the DOM as \`undefined\` for everybody who did not translate it.`,
    );

  const bezKlucza = Object.keys(domyslne).filter((k) => !klucze.includes(k));
  if (bezKlucza.length)
    throw new BladTekstu(
      'kanal',
      'domyslna-bez-klucza',
      `${bezKlucza.length} default values have no field in \`PctTexts\`:\n` +
        lista(bezKlucza) +
        `\n    A string missing from the type is a string the consumer has no way of ` +
        `overriding — \`providePctTexts\` takes \`Partial<PctTexts>\`.`,
    );

  const puste = klucze.filter(
    (k) => k in domyslne && domyslne[k].trim() === '',
  );
  if (puste.length)
    throw new BladTekstu(
      'kanal',
      'domyslna-pusta',
      `${puste.length} default values are empty:\n` +
        lista(puste) +
        `\n    An empty default turns „the library prints this itself" into „the library ` +
        `prints nothing" for everybody who did not translate that field.`,
    );

  const uzyte = new Set(odczyty.map((o) => o.klucz));
  const martwe = klucze.filter((k) => !uzyte.has(k));
  if (martwe.length)
    throw new BladTekstu(
      'kanal',
      'klucz-martwy',
      `${martwe.length} \`PctTexts\` fields are read by no component:\n` +
        lista(martwe) +
        `\n    That is coverage which does not exist: the field stands in a public type, ` +
        `the consumer translates it, and it appears nowhere. The same move as removing the ` +
        `dead \`--pct-on-danger\` in A12 — the field comes back with a component that ` +
        `prints it.`,
    );

  const donikad = odczyty
    .filter((o) => !klucze.includes(o.klucz))
    .map((o) => `${o.plik}: texts().${o.klucz}`);
  if (donikad.length)
    throw new BladTekstu(
      'kanal',
      'odczyt-donikad',
      `${donikad.length} reads name a field that is not in \`PctTexts\`:\n` +
        lista(skroc(donikad)) +
        `\n    In a template such a read is no compilation error — it is an empty space ` +
        `na ekranie.`,
    );

  // ── 6. WARNINGS ──────────────────────────────────────────────────────────
  const zKanalu = we.ostrzezenia
    .filter((o) => /\btexts\s*\(\s*\)/.test(o.argument))
    .map((o) => `${o.plik}:${o.linia}`);
  if (zKanalu.length)
    throw new BladTekstu(
      'ostrzezenia',
      'ostrzezenie-z-kanalu',
      `${zKanalu.length} developer warnings draw on \`PCT_TEXTS\`:\n` +
        lista(zKanalu) +
        `\n    A warning is read by a developer, not a user — translating it helps nobody ` +
        `and takes up room in a type the consumer has to fill in (decision 0007).`,
    );

  const bezDevMode = we.ostrzezenia
    .filter((o) => !o.strzezone)
    .map((o) => `${o.plik}:${o.linia}: console.${o.metoda}(…)`);
  if (bezDevMode.length)
    throw new BladTekstu(
      'ostrzezenia',
      'ostrzezenie-bez-devmode',
      `${bezDevMode.length} \`console.*\` calls do not go quiet outside \`isDevMode()\`:\n` +
        lista(bezDevMode) +
        `\n    The requirement reserves this channel for development mode. The guard may ` +
        `stand in the same function or at EVERY call of it — the gate accepts both, ` +
        `because \`if (isDevMode()) this.warn()\` is better rather than worse.`,
    );

  const tekstow = skany.reduce((n, s) => n + s.skaner.teksty.length, 0);
  return {
    opis:
      `${szablony.length} templates (${wezlow} nodes, ${tekstow} texts), ` +
      `${klasy.length} classes, ${fabryki.length} signals, ` +
      `${klucze.length} PctTexts fields in ${odczyty.length} reads, ` +
      `${we.ostrzezenia.length} developer warnings`,
  };
};

// ── input from disk ───────────────────────────────────────────────────────────

const czytaj = (root, sciezka) => readFileSync(join(root, sciezka), 'utf8');

const jestZrodlem = (p) =>
  p.startsWith(`${PROJEKT}/`) && p.endsWith('.ts') && !p.endsWith('.spec.ts');
const jestSzablonem = (p) => p.startsWith(`${PROJEKT}/`) && p.endsWith('.html');

/**
 * Static attributes from Angular's flat array (`consts`, `hostAttrs`). A number opens a
 * section with a different meaning (classes, styles, bindings), so we read only the prefix
 * before the first number — beyond it stand names without values. The same parser as in
 * `check-parts`.
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
 * Definitions from the BUILT package. `@angular/compiler` is loaded first,
 * because the package is partially compiled and `ɵcmp` appears only on access — the same
 * step the linker performs at the consumer's (`lesson-46`).
 */
const komponentyPakietu = async (root) => {
  const dist = join(root, DIST);
  if (!existsSync(join(dist, 'package.json')))
    throw new BladTekstu(
      'artefakt',
      'pakiet-pusty',
      `no built package in ${DIST} — this gate reads the artifact, not the sources ` +
        `alone.\n    The target needs a \`dependsOn\` on the library's build.`,
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
 * The developer warnings of one file. An `isDevMode()` guard is accepted in two places: in
 * the same function the `console.*` stands in, or at every call of it. The second form is
 * better in a library — it does not enter a function there is no point running — so the
 * gate must not penalise it.
 */
const czytajOstrzezenia = (plik, tresc) => {
  const out = [];
  for (const m of tresc.matchAll(KONSOLA)) {
    const otw = m.index + m[0].length - 1;
    const zam = dopasuj(tresc, otw, '(', ')');
    const argument = zam === -1 ? '' : tresc.slice(otw + 1, zam);
    const przed = tresc.slice(0, m.index);
    const linia = przed.split('\n').length;

    // The enclosing function: the last method declaration before the call.
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

/** An input built from a file list — the same shape for the repo and for a fixture. */
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
 * Files from the GIT INDEX, not from a glob over the disk — the same reason as in the other
 * gates: the index is an independent record of what the repository really
 * carries. The pathspec is a DIRECTORY and the filtering sits in JS, because a git
 * pathspec is not a shell glob and a pattern with a star can return ZERO files rather than
 * an error (`lesson-48`).
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

// ── negative control ──────────────────────────────────────────────────────────

/**
 * Builds a prepared input: a copy of the base, the case's files on top, then the deletions
 * from `fixture.json`. The case directory then holds NOTHING BUT its own defect, rather
 * than one more copy of a correct input to hunt through.
 *
 * The package read arrives as DATA (`pakiet.json`) rather than from a real build — the same
 * choice as in `check-parts` and `check-zoneless` and for the same reason: building an
 * Angular package for each of a dozen-odd cases would cost minutes per run. The price is
 * plain: the fixtures do NOT exercise the code that reads `ɵcmp` — they exercise every
 * other parser and the whole arrangement of checks. The package read itself is exercised on
 * every run against the repository.
 *
 * The sources sit in the repository as `*.ts.txt` and become `*.ts` only here — a `.ts` file
 * in `tools/` belongs to no compiler program, so it would fire `check-typecheck`. One
 * gate's fixture must not be another's defect.
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

// ── the run ───────────────────────────────────────────────────────────────────

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
    `tools/check-texts.fixtures: no prepared inputs — a gate with no proof that it can ` +
      `fail is one more silent defect (req-quality-negative-control)`,
  );

// The reference input MUST pass: were the base defective itself, every case would fire
// because of it rather than its own defect, and every „rejected" would be false — this
// control would become the very thing it stands against.
{
  const katalog = zlozFixture(BAZA, {});
  try {
    sprawdzTeksty(await wejscieFixture(katalog));
  } catch (blad) {
    if (!(blad instanceof BladTekstu)) throw blad;
    problems.push(
      `${BAZA}: the reference input does NOT pass (${blad.kontrola}/${blad.regula}) — ` +
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
    sprawdzTeksty(await wejscieFixture(katalog));
    problems.push(
      `${nazwa}: the prepared input PASSED and was meant not to — ` +
        `point ${fx.punkt} (\`${fx.kontrola}/${fx.regula}\`) stopped examining anything`,
    );
  } catch (blad) {
    if (!(blad instanceof BladTekstu)) throw blad;
    if (blad.kontrola !== fx.kontrola || blad.regula !== fx.regula)
      problems.push(
        `${nazwa}: \`${blad.kontrola}/${blad.regula}\` fired, and point ${fx.punkt} ` +
          `(\`${fx.kontrola}/${fx.regula}\`) was meant to — the fixture proves something other than what it declares`,
      );
  } finally {
    rmSync(katalog, { recursive: true, force: true });
  }
}

// ── result ────────────────────────────────────────────────────────────────────

if (problems.length) {
  console.error(`X Texts channel gate — ${problems.length} violations:\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✓ Texts: ${opis}. Negative control: the reference input passes, ` +
    `${przypadki.length} prepared ones rejected on their own rules.`,
);
