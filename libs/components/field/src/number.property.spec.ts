import {
  Component,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  pctDecimal,
  pctForAll,
  pctInt,
  pctOneOf,
  pctRecord,
} from '../../testing/src/property.testkit';
import { PctNumber } from './number';

/**
 * The one promise `[pctNumber]` makes that no list of examples can keep: a number this
 * control formatted is a number it reads back — in ANY locale, not in the two whose notation
 * the author happens to write in. That is the open control of `req-api-number` and plan item
 * 5.1, and the reason it stayed open is that parsing is wider than formatting: there are more
 * cases here than anybody thinks up.
 *
 * **The sweep goes through the control, never through `parse`.** The method is private, and
 * more to the point only half of what can break lives in it: the formatter that wrote the
 * text, the effect that put it in the DOM and the commit that rounds are the other half. So a
 * case writes a value to the host, reads back the text the control itself produced, and types
 * that text in. Nothing here formats a number of its own — a sweep that built its own
 * expected text would be checking `Intl` against `Intl`. Where a law needs to know WHERE the
 * decimals of a text begin, or WHICH character a locale groups with, the answer comes from
 * `Intl` directly (`separatorsOf` below): the platform is an oracle the control has no say
 * in, and no assertion here compares control output against a text this file built.
 *
 * **What the central law deliberately does not say.** `Number(n.toFixed(max))` reads like the
 * obvious way to write "n, as the commit rounds it", and it is wrong: `Intl` and `toFixed`
 * round the same decimal tie in different directions whenever the binary double lands just
 * short of it (`-995067.95` at one place is `-995068` to the formatter and `-995067.9` to
 * `toFixed` — about one case in two hundred). So the round trip is asked of values the
 * configured precision holds exactly, where the answer is `n` itself and no rounding
 * convention is under examination; the rounding gets a law of its own, stated as a bound in
 * whole units of the smallest place so that no float subtraction can decide the verdict.
 *
 * **The dot means two things and cannot mean both.** In a locale that GROUPS with a dot
 * (`de-DE`, `es-ES`, `tr-TR`, `vi-VN`) a typed `0.123` is read as the grouped 123, and that is
 * the control's decision, not a defect: three digits and then the end of the text is exactly
 * the shape `Intl` writes a thousand in, so grouping has to win the tie or the field could not
 * read back its own output (`parse`'s own docstring). So the keypad law is stated where it
 * holds — every locale that does not group with a dot, at every decimal length — and the tie
 * is stated as a law of its own, so the next reader finds it measured rather than argued.
 *
 * The case counts are small on purpose. Every sweep here is executed once per mutant of
 * `number.ts` in the mutation run (`req-quality-unit`), and each case drives a TestBed
 * fixture — so one fixture serves a whole sweep and `locale` is written as a signal. Six
 * sweeps, 284 cases, and 180 of those type a text the control itself wrote: disabling in
 * `parse` each of the three widenings the 22-locale list was grown for turns 7 (the bidi marks
 * of `he-IL` / `ar-EG` / `fa-IR`), 30 (the Arabic-Indic and Devanagari digits of four locales)
 * and 24 (the Indian grouping of `hi-IN` / `bn-IN` / `ne-NP`) of them red — counted by
 * replaying this seed's stream through a replica of `parse`, since a sweep cannot mutate the
 * source it runs against.
 */

// --- the fixture a sweep drives ---

/**
 * `locale` is an input on the control, so the application's `LOCALE_ID` never comes into it
 * and one fixture can be every locale in turn.
 */
@Component({
  imports: [PctNumber],
  template: `<input
    pctNumber
    [locale]="locale()"
    [minFractionDigits]="minFrac()"
    [maxFractionDigits]="maxFrac()"
    [useGrouping]="grouping()"
    [(value)]="value"
  />`,
})
class SweepHost {
  value = signal<number | null>(null);
  locale = signal('en-US');
  minFrac = signal(0);
  maxFrac = signal(0);
  grouping = signal(true);
}

async function sweepFixture() {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(SweepHost);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const inputOf = (f: ComponentFixture<SweepHost>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

interface Settings {
  readonly locale: string;
  readonly minFrac: number;
  readonly maxFrac: number;
  readonly grouping: boolean;
}

/**
 * Writes the case's settings AND flushes. The tick is not a nicety: a host signal reaches an
 * `input()` only through change detection, so a case that typed before ticking would be
 * parsed with the precision of the case before it — measured, and it read as a rounding bug
 * in the control rather than in the sweep.
 */
function apply(fixture: ComponentFixture<SweepHost>, s: Settings): void {
  const host = fixture.componentInstance;
  host.locale.set(s.locale);
  host.minFrac.set(s.minFrac);
  host.maxFrac.set(s.maxFrac);
  host.grouping.set(s.grouping);
  TestBed.tick();
}

/**
 * A case runs synchronously: `pctForAll` takes a plain function, and nothing on this road
 * needs a task boundary. The host listeners write the signals on the spot; `TestBed.tick()`
 * is what makes the effect put the formatted text back into the input.
 */
function commit(fixture: ComponentFixture<SweepHost>, text: string): void {
  const el = inputOf(fixture);
  el.value = text;
  el.dispatchEvent(new Event('input'));
  el.dispatchEvent(new Event('blur'));
  TestBed.tick();
}

/** The text the control writes for `n` under these settings — the sweep formats nothing. */
function shownFor(
  fixture: ComponentFixture<SweepHost>,
  s: Settings,
  n: number,
): string {
  apply(fixture, s);
  fixture.componentInstance.value.set(n);
  TestBed.tick();
  return inputOf(fixture).value;
}

// --- the platform as oracle ---

const SEPARATORS = new Map<string, { group: string; decimal: string }>();

/**
 * What the locale groups and separates decimals with, asked of `Intl` rather than of the
 * control. Two laws need it and neither compares texts: one SORTS locales (does this one
 * group with a dot?), the other locates the decimals of a text the control wrote so their
 * NUMBER can be held against the configured minimum.
 */
function separatorsOf(locale: string): { group: string; decimal: string } {
  const known = SEPARATORS.get(locale);
  if (known !== undefined) return known;
  const parts = new Intl.NumberFormat(locale, {
    useGrouping: true,
    maximumFractionDigits: 2,
  }).formatToParts(1234567.5);
  const found = {
    group: parts.find((p) => p.type === 'group')?.value ?? '',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  };
  SEPARATORS.set(locale, found);
  return found;
}

/**
 * How many decimals a shown text carries. Every one of the 22 locales writes its fraction as
 * digits of its own numbering system and nothing else — measured over all of them, for
 * magnitudes from 1000 to 999_999 and every `min`/`max` pair — so counting characters past
 * the last decimal separator counts digits.
 */
function shownFractionDigits(text: string, locale: string): number {
  const { decimal } = separatorsOf(locale);
  const at = text.lastIndexOf(decimal);
  return at === -1 ? 0 : Array.from(text.slice(at + decimal.length)).length;
}

/** Is `outer` `inner` with characters inserted — same characters, same order, more of them? */
function isSubsequence(inner: string, outer: string): boolean {
  const wanted = Array.from(inner);
  let at = 0;
  for (const character of Array.from(outer)) if (wanted[at] === character) at++;
  return at === wanted.length;
}

// --- the cases ---

/**
 * The list is the whole point of the item, not decoration. Every widening the parser grew
 * past `pl`/`en` was named by one of these: `he-IL` writes a bidi mark in front of its minus,
 * `ar-EG` and `fa-IR` format in Arabic-Indic digits, `hi-IN` / `bn-IN` / `ne-NP` / `en-IN`
 * group as `1,23,456`, `de-CH` separates thousands with an apostrophe and `fr-FR` with a
 * narrow no-break space.
 *
 * `en-US` stands first because `pctOneOf` shrinks towards the first entry, and a failure
 * reported in ASCII is one a reader can see.
 */
const LOCALES = [
  'en-US',
  'pl-PL',
  'en-GB',
  'de-DE',
  'de-CH',
  'fr-FR',
  'es-ES',
  'ru-RU',
  'cs-CZ',
  'sv-SE',
  'tr-TR',
  'ja-JP',
  'zh-CN',
  'hi-IN',
  'en-IN',
  'bn-IN',
  'ar-EG',
  'fa-IR',
  'he-IL',
  'th-TH',
  'ne-NP',
  'vi-VN',
] as const;

/** The four of them in which a typed dot is ambiguous — `Intl` says which, not this file. */
const DOT_GROUPING = LOCALES.filter(
  (locale) => separatorsOf(locale).group === '.',
);

/** The other eighteen, where a keypad dot can only be a decimal point. */
const DOT_FREE = LOCALES.filter((locale) => separatorsOf(locale).group !== '.');

/**
 * Six digits and up to four decimals: enough for two group separators under Indian grouping,
 * and small enough that every value is an exact multiple of `0.0001` a double can hold.
 */
const PLACES = 4;
const SCALE = 10 ** PLACES;
const anyNumber = pctDecimal(-999_999, 999_999, PLACES);

/**
 * A case whose value the precision holds exactly: `places` decimals written into a field that
 * allows at least that many, so formatting throws nothing away and the round trip has one
 * right answer rather than a rounding convention.
 */
const exactCase = pctRecord({
  raw: anyNumber,
  places: pctInt(0, PLACES),
  spare: pctInt(0, 3),
  minFrac: pctInt(0, PLACES),
  grouping: pctOneOf([true, false]),
  locale: pctOneOf(LOCALES),
});

/**
 * Six whole digits, so the grouped text differs from the plain one in every locale: `es-ES`
 * and its kin group only from five digits up (`minimumGroupingDigits: 2`), and the law that
 * grouping is VISIBLE would be vacuous on `1000` there. Measured over all 22 locales and
 * every `min`/`max` pair for this window: the plain text is always strictly shorter.
 */
const groupedCase = pctRecord({
  magnitude: pctDecimal(100_000, 999_999, PLACES),
  negative: pctOneOf([false, true]),
  minFrac: pctInt(0, PLACES),
  maxFrac: pctInt(0, PLACES),
  locale: pctOneOf(LOCALES),
});

/**
 * The precision stops one short of `PLACES` on purpose. With four allowed places the typed
 * four-decimal text needs no rounding at all: `step` is 1 and "sits on the allowed place"
 * reads `units % 1`, which is 0 for anything the control can produce — 22 of the 60 cases of
 * this seed were vacuous that way. Below four every case really rounds, and the place the law
 * is about is a thousandth at its finest rather than a ten-thousandth.
 */
const roundingCase = pctRecord({
  n: anyNumber,
  minFrac: pctInt(0, PLACES - 1),
  maxFrac: pctInt(0, PLACES - 1),
  grouping: pctOneOf([true, false]),
  locale: pctOneOf(LOCALES),
});

/**
 * A keypad's separator at every decimal length, in the eighteen locales where a dot can only
 * be a decimal point. The field is given all four places, so the typed value never rounds and
 * the only question left is how the text was read.
 */
const keypadCase = pctRecord({
  raw: anyNumber,
  places: pctInt(0, PLACES),
  minFrac: pctInt(0, PLACES),
  locale: pctOneOf(DOT_FREE),
});

/** Every length but three — the one the tie owns, and this sweep types it on every case. */
const tieCase = pctRecord({
  raw: anyNumber,
  places: pctOneOf([0, 1, 2, 4]),
  locale: pctOneOf(DOT_GROUPING),
});

/**
 * Text the control cannot read a number out of, and text that is merely blank — two outcomes,
 * not one. `String.trim()` leaves a bidi mark where it stands, so `‏` alone is a field
 * with content and no digit in it; a space, U+00A0 and U+202F all trim away to nothing.
 */
const junkCase = pctRecord({
  junk: pctOneOf([
    'abc',
    'n/a',
    '- -',
    '.',
    '−',
    // The only entry whose answer `|| !/\d/.test(s)` decides. `.` and `−` reach that guard
    // too, but `Number` maps them to NaN and the line below rejects them anyway; a bidi mark
    // survives `trim()`, `BLANK` strips it to the empty string, and `Number('')` is 0 — so
    // without the guard the field would commit nought for it. Drawn 5 times of these 40.
    '‏',
    // A magnitude no double holds, and the only road to `Number.isFinite(n) ? n : null`:
    // 'Infinity' as a word never gets past the character class. Drawn 6 times of the 40.
    '9'.repeat(400),
  ]),
  blank: pctOneOf(['', ' ', ' ', ' ']),
  start: pctInt(-999, 999),
  maxFrac: pctInt(0, PLACES),
  locale: pctOneOf(LOCALES),
});

/**
 * In whole units of the smallest place, where the arithmetic is integer and exact — the
 * subtraction of two doubles gets no say in a verdict.
 */
const units = (n: number) => Math.round(n * SCALE);

/**
 * How far a value sits off the place it is allowed to land on, in those same units.
 *
 * The `Math.abs` is not tidiness: a commit CAN come back as a negative zero (`-0.005` into a
 * field of two decimals is `Number((-0.005).toFixed(2))`, that is `-0.01`, and `-0.0001` into
 * one of none is `-0` outright), and `-100 % 100` is `-0`, which `toBe` — `Object.is` — tells
 * apart from zero. The sign of a remainder is nothing this law means to be about.
 */
const offPlace = (value: number, step: number) => Math.abs(units(value) % step);

describe('PctNumber, over generated cases', () => {
  describe('the round trip', () => {
    /**
     * `parse(format(n)) === n` — the sentence `req-api-number` leaves as a gap. It is asked
     * of the whole control, so a break can be the formatter, the effect, the parser or the
     * commit; and it is asked of twenty-two locales, because the three mechanisms the parser
     * needs beyond `pl`/`en` are invisible in `pl`/`en`.
     *
     * Four more things ride on the same commit, because each is about the value that came
     * back and none needs a case of its own — a sweep of 40 cases asking them separately cost
     * a fixture drive per case and said nothing this one cannot:
     *
     * - what a spinbutton reports as its raw number, held against the case's `n` rather than
     *   against the signal the attribute is bound to (`[attr.aria-valuenow]: 'value()'` put
     *   against `value()` is Angular compared with itself, and passes for any reason);
     * - what it announces as text, which is the formatter read at a second call site
     *   (`valueText`) while the field's own text comes from the effect — an effect writing
     *   `String(v)` where `valueText` keeps `format(v)` is what this catches;
     * - the padding, which nothing in this file observed before: `minimumFractionDigits: min`
     *   could be replaced by `0` and the previous version stayed green. 36 of these 80 ask more
     *   decimals than the value has, and the replacement turns exactly those 36 red (counted
     *   by formatting the drawn cases both ways);
     * - the quiet half of the report: a field showing a number the control accepted carries no
     *   `aria-invalid` at all. Only the `'true'` direction was ever asserted, so `showInvalid`
     *   could be replaced by the constant `true` and the previous version stayed green.
     */
    it('a number this control formatted is the number it reads back, in every locale', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        exactCase,
        ({ raw, places, spare, minFrac, grouping, locale }) => {
          // `+ 0` keeps a rounded-away negative off the comparison: `toBe` is `Object.is`,
          // and `Object.is(-0, 0)` is false.
          const n = Number(raw.toFixed(places)) + 0;
          const settings = {
            locale,
            minFrac,
            maxFrac: places + spare,
            grouping,
          };

          commit(fixture, shownFor(fixture, settings, n));

          const el = inputOf(fixture);
          expect(fixture.componentInstance.value()).toBe(n);
          expect(el.getAttribute('aria-valuenow')).toBe(String(n));
          expect(el.getAttribute('aria-valuetext')).toBe(el.value);
          expect(el.getAttribute('aria-invalid')).toBeNull();
          expect(shownFractionDigits(el.value, locale)).toBeGreaterThanOrEqual(
            minFrac,
          );
        },
        { runs: 80 },
      );
    });

    /**
     * Grouping is a matter of appearance: it changes what the field shows and nothing about
     * what the form receives. Both halves are stated, and the first one was missing — with
     * only the values compared, `useGrouping: this.useGrouping()` could be replaced by the
     * constant `true` and every sweep of the previous version stayed green. Against the visible
     * half it is red on all 40 of these cases.
     *
     * The visible half is stated without building a text: grouping only INSERTS separators,
     * so the ungrouped text is the grouped one with characters taken out — a subsequence of
     * it, and strictly shorter. That is what the constant `true` breaks (the two texts become
     * equal), and it also catches a grouped text that differs in more than separators.
     *
     * The guard on `withGrouping` is what makes this sweep able to see a parse that fails:
     * with both commits reading as `null`, "the same value either way" is `null === null`.
     */
    it('grouping is visible in the text and absent from the value', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        groupedCase,
        ({ magnitude, negative, minFrac, maxFrac, locale }) => {
          const n = negative ? -magnitude : magnitude;
          const base = { locale, minFrac, maxFrac };

          const grouped = shownFor(fixture, { ...base, grouping: true }, n);
          commit(fixture, grouped);
          const withGrouping = fixture.componentInstance.value();

          const plain = shownFor(fixture, { ...base, grouping: false }, n);
          commit(fixture, plain);

          expect(withGrouping).not.toBeNull();
          expect(fixture.componentInstance.value()).toBe(withGrouping);
          expect(isSubsequence(plain, grouped)).toBe(true);
          expect(plain.length).toBeLessThan(grouped.length);
        },
        { runs: 40 },
      );
    });
  });

  describe('the commit', () => {
    /**
     * More decimals than the field allows is what a numeric keypad produces, so the text is
     * typed with an ASCII dot — four decimals, the one length no locale can read as grouping.
     * What the commit then owes the caller is stated from outside, as the two halves of
     * "nearest": the value sits on the allowed place, and it is no further from what was typed
     * than half of that place. Saying `Number(n.toFixed(max))` instead would be the
     * implementation's own line read back to it, green for whatever reason the code is green.
     *
     * The second blur rides here rather than on a sweep of its own. A commit is a fixed
     * point: the user who leaves the field twice leaves with the value they had the first
     * time, and this is the road where the first commit really MOVED the value. The guards are
     * the repair: without them the law holds of an empty field too — `null` and `''` on both
     * sides — which is how the previous version's own sweep stayed green for a control whose
     * effect never wrote the DOM at all (the reviewer deleted both writes and only the round
     * trip noticed). It is the law that catches a parser and a formatter that each work and
     * disagree: a text whose reading formats into a different text would walk the value a step
     * further on every blur.
     */
    it('a commit rounds to the nearest allowed place, and a second one moves nothing', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        roundingCase,
        ({ n, minFrac, maxFrac, grouping, locale }) => {
          // The control raises max to min where a consumer asks for more padding than places.
          const allowed = Math.max(minFrac, maxFrac);
          apply(fixture, { locale, minFrac, maxFrac, grouping });
          commit(fixture, n.toFixed(PLACES));
          const committed = fixture.componentInstance.value();

          expect(committed).not.toBeNull();
          const step = 10 ** (PLACES - allowed);
          expect(offPlace(committed as number, step)).toBe(0);
          expect(
            Math.abs(units(committed as number) - units(n)) * 2,
          ).toBeLessThanOrEqual(step);

          const text = inputOf(fixture).value;
          expect(text).not.toBe('');
          commit(fixture, text);

          expect(fixture.componentInstance.value()).toBe(committed);
          expect(inputOf(fixture).value).toBe(text);
        },
        { runs: 60 },
      );
    });

    /**
     * A numeric keypad gives a dot whatever the region, and the docstring of `parse` promises
     * to take one. The previous version typed it at four decimals only — the single length no
     * locale can read as grouping — so the promise was never asked where it is delicate. Here
     * it is asked at every length from none to four, in the eighteen locales that do not group
     * with a dot, which is where it holds without exception; the four that do are the sweep
     * below.
     *
     * The comma rides on the same cases at two decimals, a length no locale reads as grouping.
     * Nothing observed it before: `.replace(/,/g, '.')` could be deleted with the previous
     * version green, because a locale writing its decimals with a comma reaches the same
     * reading through `split(decimal)`. 33 of these 40 cases stand in a locale whose own decimal
     * separator is something else, and there deleting it turns `1,5` into junk.
     */
    it('a keypad separator is a decimal point at every length, dot or comma', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        keypadCase,
        ({ raw, places, minFrac, locale }) => {
          const n = Number(raw.toFixed(places)) + 0;
          apply(fixture, {
            locale,
            minFrac,
            maxFrac: PLACES,
            grouping: true,
          });

          commit(fixture, n.toFixed(places));
          expect(fixture.componentInstance.value()).toBe(n);

          const short = Number(n.toFixed(2)) + 0;
          commit(fixture, short.toFixed(2).replace('.', ','));
          expect(fixture.componentInstance.value()).toBe(short);
        },
        { runs: 40 },
      );
    });

    /**
     * Where a dot cannot be both things. In the four locales that group with one, a typed
     * `0.123` is the grouped 123 — three digits and then the end of the text is exactly what
     * `Intl` writes a thousand as, and grouping wins the tie because losing it would mean the
     * field could not read back its own output (`parse`'s docstring). Every other length is an
     * ordinary decimal point even here, which is the half a reader doubts.
     *
     * Both halves are stated against the typed text itself — the grouped reading is that text
     * with the dot deleted — and not against anything the control produced. The edit they are
     * here for is the `$` alternative dropped out of the lookahead
     * `${g}(?=\d{3}(\D|$)|\d{2}${g})`, so that a separator at the end of a text stops counting
     * as grouping: this sweep is red on all 24 of its cases, while the round trip notices it on
     * 2 of 80 and the grouping sweep on 1 of 40 — the formatted texts that end in a group of
     * three are rare draws, and a text typed with three decimals is nothing but that shape.
     * The opposite edit — the tie widened to every locale — is the sweep above, red there on
     * the 8 of its 40 cases that type three decimals.
     */
    it('a dot typed where the locale groups with one is read as grouping', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        tieCase,
        ({ raw, places, locale }) => {
          const n = Number(raw.toFixed(places)) + 0;
          apply(fixture, {
            locale,
            minFrac: 0,
            maxFrac: PLACES,
            grouping: true,
          });

          commit(fixture, n.toFixed(places));
          expect(fixture.componentInstance.value()).toBe(n);

          const three = n.toFixed(3);
          commit(fixture, three);
          expect(fixture.componentInstance.value()).toBe(
            Number(three.replace('.', '')),
          );
        },
        { runs: 24 },
      );
    });

    /**
     * The control's second channel (0070) and the two outcomes it has to tell apart. Text with
     * no number in it empties the value and STAYS where the user left it, named as wrong — the
     * native number field drops it, and with it the only record of what the person typed.
     * Blank text is not wrong: it clears the field and reports nothing. And a value arriving
     * from outside takes a standing report back, which is the one thing a commit cannot see.
     *
     * The three phases are what the file was missing. (1) Nothing committed an empty field
     * before, so `text.trim() !== ''` in `onBlur` could be dropped — an empty field reported as
     * malformed — with the previous version green; 10 of these 40 cases type the empty string,
     * the rest a blank that trims away to it. (2) The junk list reached neither parse guard it
     * looked like it covered, which is why `‏` and 400 digits are in it now. (3) Only the
     * `'true'` direction of `aria-invalid` was ever asserted, so `showInvalid` could be
     * replaced by the constant `true`; two of the three phases now read it as absent. The last
     * phase holds one more line: `untracked(() => this.rejected.set(null))` in the effect —
     * delete it and a field showing a good number goes on reporting the junk typed before it.
     */
    it('junk is kept and named, blank clears the field, and a good value takes the report back', async () => {
      const fixture = await sweepFixture();

      pctForAll(
        junkCase,
        ({ junk, blank, start, maxFrac, locale }) => {
          const shown = shownFor(
            fixture,
            { locale, minFrac: 0, maxFrac, grouping: true },
            start,
          );

          commit(fixture, blank);
          expect(fixture.componentInstance.value()).toBeNull();
          expect(inputOf(fixture).value).toBe('');
          expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();

          commit(fixture, junk);
          expect(fixture.componentInstance.value()).toBeNull();
          expect(inputOf(fixture).value).toBe(junk);
          expect(inputOf(fixture).getAttribute('aria-invalid')).toBe('true');

          fixture.componentInstance.value.set(start);
          TestBed.tick();
          expect(inputOf(fixture).value).toBe(shown);
          expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();
        },
        { runs: 40 },
      );
    });
  });
});
