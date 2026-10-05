import { pctTimeFormat } from './locale';

/**
 * The locales 0086 measured the hour cycle over (C1): the fourteen asked for first, then the ones
 * that test an edge — the period before the hour, a separator that is a letter, a numbering
 * system of its own, a language chromium writes in the browser's default.
 */
const LOCALES = [
  'en-US',
  'en-GB',
  'pl-PL',
  'de-DE',
  'fr-FR',
  'fi-FI',
  'da-DK',
  'ja-JP',
  'ko-KR',
  'zh-CN',
  'ar-EG',
  'hi-IN',
  'th-TH',
  'my-MM',
  'fa-IR',
  'he-IL',
  'zh-TW',
  'en-IN',
  'en-CA',
  'fr-CA',
  'es-ES',
  'es-MX',
  'pt-BR',
  'ru-RU',
  'tr-TR',
  'vi-VN',
  'bn-BD',
  'mr-IN',
  'ta-IN',
  'ur-PK',
  'nb-NO',
  'sv-SE',
  'it-IT',
  'nl-NL',
  'el-GR',
  'en-AU',
  'ne-NP',
  'ar-SA',
];

/**
 * Locales node writes oddly, beyond the languages the sweep reads off the platform: one whose
 * forced twelve-hour clock writes no day period, and Azerbaijani in Arabic-Indic digits, which it
 * writes with the words `standart onluq kəsr` inside every number.
 */
const EDGES = ['fr-CM', 'az-AZ-u-nu-arab', 'az-AZ-u-nu-arabext'];

/** The four clocks, each forced the one way the platform spells a forced clock: in the tag. */
const CYCLES = [
  'ja-JP-u-hc-h11',
  'ja-JP-u-hc-h12',
  'en-US-u-hc-h23',
  'en-US-u-hc-h24',
  'pl-PL-u-hc-h12',
];

/**
 * Times that reach every edge a cycle has: both midnights of the twelve-hour clocks, the hour
 * before noon and noon itself, the last second of the day — in both shapes.
 */
const TIMES = [
  '00:00',
  '00:05',
  '01:05:09',
  '11:59',
  '12:00',
  '12:05:30',
  '13:05',
  '23:59:59',
];

/**
 * Any run of spaces as one ASCII space. Node's `formatToParts` writes U+202F before a day period
 * where all three browsers write U+0020 (0086, D4, read off the parts), and a case about the
 * words is not a case about which space.
 */
const spaced = (text: string): string => text.replace(/\s+/g, ' ');

/** The narrow no-break space, built rather than written: an escape in a source is one edit away from the character itself. */
const NNBSP = String.fromCharCode(0x202f);

describe('writing a time', () => {
  it('writes it the way the language writes it', () => {
    expect(spaced(pctTimeFormat('en-US').format('13:05'))).toBe('1:05 PM');
    expect(pctTimeFormat('en-GB').format('13:05')).toBe('13:05');
    expect(pctTimeFormat('fi-FI').format('13:05')).toBe('13.05');
    expect(pctTimeFormat('da-DK').format('13:05')).toBe('13.05');
    expect(pctTimeFormat('fr-CA').format('13:05')).toBe('13 h 05');
    // The day period before the hour where the language puts it there (D1).
    expect(pctTimeFormat('ko-KR').format('13:05')).toBe('오후 1:05');
    expect(pctTimeFormat('zh-TW').format('13:05')).toBe('下午1:05');
  });

  it('writes two digits on a twenty-four-hour clock and the locale’s own on a twelve-hour one', () => {
    // 0086, D6: a numeric hour on a twenty-four-hour clock is `0:05` in two engines and `00:05`
    // in firefox, so the field asks for two digits there — and for the locale's own on a
    // twelve-hour clock, where `01:05 PM` is nobody's way of writing it.
    expect(pctTimeFormat('en-GB').format('00:05')).toBe('00:05');
    expect(pctTimeFormat('ja-JP').format('01:05')).toBe('01:05');
    expect(spaced(pctTimeFormat('en-US').format('01:05'))).toBe('1:05 AM');
    expect(spaced(pctTimeFormat('en-US').format('00:05'))).toBe('12:05 AM');
  });

  it('writes the seconds exactly when the value has them', () => {
    expect(pctTimeFormat('en-GB').format('13:05:00')).toBe('13:05:00');
    expect(pctTimeFormat('en-GB').format('13:05')).toBe('13:05');
    expect(spaced(pctTimeFormat('en-US').format('13:05:09'))).toBe(
      '1:05:09 PM',
    );
    expect(pctTimeFormat('fr-CA').format('13:05:09')).toBe('13 h 05 min 09 s');
  });

  it('writes the reader’s digits, read off the time formatter itself', () => {
    expect(spaced(pctTimeFormat('ar-EG').format('13:05'))).toBe('١:٠٥ م');
    expect(pctTimeFormat('fa-IR').format('13:05')).toBe('۱۳:۰۵');
    expect(pctTimeFormat('ne-NP').format('13:05')).toBe('१३:०५');
    // `my-MM` is `mymr` in node, firefox and webkit, and `latn` in chromium, which writes the
    // language in the browser's default (C5): the formatter is the source either way.
    expect(pctTimeFormat('my-MM').format('13:05')).toBe('၁၃:၀၅');
  });
});

describe('the clock', () => {
  it('is the formatter’s own answer for the language', () => {
    expect(pctTimeFormat('en-US').hourCycle).toBe('h12');
    expect(pctTimeFormat('en-GB').hourCycle).toBe('h23');
    expect(pctTimeFormat('ja-JP').hourCycle).toBe('h23');
    expect(pctTimeFormat('ko-KR').hourCycle).toBe('h12');
    expect(pctTimeFormat('pl-PL').hourCycle).toBe('h23');
  });

  it('is forced by the tag, the platform’s own spelling of a reader who counts otherwise', () => {
    // 0086, C7 — and there is no other input: an `hourCycle` beside the tag would be a second
    // way of saying it that could disagree with the first.
    expect(pctTimeFormat('en-US-u-hc-h23').hourCycle).toBe('h23');
    expect(pctTimeFormat('en-US-u-hc-h23').format('13:05')).toBe('13:05');
    expect(pctTimeFormat('pl-PL-u-hc-h12').hourCycle).toBe('h12');
    expect(spaced(pctTimeFormat('pl-PL-u-hc-h12').format('13:05'))).toBe(
      '1:05 PM',
    );
  });

  it('writes the first hour four ways, and every way reads back as the same time', () => {
    // The four cycles are four labels on one value (0086 §3).
    const written = Object.fromEntries(
      ['ja-JP-u-hc-h11', 'ja-JP-u-hc-h12', 'ja-JP', 'en-US-u-hc-h24'].map(
        (tag) => [
          pctTimeFormat(tag).hourCycle,
          pctTimeFormat(tag).format('00:05'),
        ],
      ),
    );
    expect(written).toEqual({
      h11: '午前0:05',
      h12: '午前12:05',
      h23: '00:05',
      h24: '24:05',
    });
    for (const tag of CYCLES) {
      const format = pctTimeFormat(tag);
      expect(format.parse(format.format('00:05'))).toBe('00:05');
    }
  });
});

describe('the day period', () => {
  it('is the field’s two words where the clock has them, and nothing where it has not', () => {
    expect(pctTimeFormat('en-US').dayPeriods).toEqual(['AM', 'PM']);
    expect(pctTimeFormat('ko-KR').dayPeriods).toEqual(['오전', '오후']);
    expect(pctTimeFormat('ar-EG').dayPeriods).toEqual(['ص', 'م']);
    expect(pctTimeFormat('en-GB').dayPeriods).toBeNull();
    expect(pctTimeFormat('ja-JP').dayPeriods).toBeNull();
  });

  it('stands where the language puts it, and the order says so', () => {
    expect(pctTimeFormat('en-US').order).toEqual([
      'hour',
      'minute',
      'second',
      'dayPeriod',
    ]);
    expect(pctTimeFormat('ko-KR').order).toEqual([
      'dayPeriod',
      'hour',
      'minute',
      'second',
    ]);
    expect(pctTimeFormat('en-GB').order).toEqual(['hour', 'minute', 'second']);
  });

  it('never moves the hour, the minute and the second out of that order', () => {
    // The parser reads the digits as hour, minute, second; this is where that assumption is
    // held to every locale it is made about, so a language that wrote the minutes first would
    // be a red line here rather than a misread in a field.
    for (const locale of [...LOCALES, ...CYCLES])
      expect(
        pctTimeFormat(locale).order.filter((field) => field !== 'dayPeriod'),
      ).toEqual(['hour', 'minute', 'second']);
  });
});

/**
 * Every language node's ICU has a formatter for — two letters and three, each in its likeliest
 * region, kept once per locale the platform resolves it to: read, not listed. The three-letter
 * ones are where the fourth round of review found its edges: `nds`, `hsb`, `brx` and `blo`.
 * Built once, for the two sweeps that read it.
 */
function everyLanguage(): readonly string[] {
  if (LANGUAGES.length) return LANGUAGES;
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const codes = letters.flatMap((a) =>
    letters.flatMap((b) => [a + b, ...letters.map((c) => a + b + c)]),
  );
  const resolved = new Set(
    Intl.DateTimeFormat.supportedLocalesOf(codes).map(
      (code) =>
        new Intl.DateTimeFormat(
          new Intl.Locale(code).maximize().baseName,
        ).resolvedOptions().locale,
    ),
  );
  LANGUAGES.push(...resolved);
  return LANGUAGES;
}
const LANGUAGES: string[] = [];

/**
 * Whether the field kept the formatter its tag asks for — that formatter's clock, and its digits
 * as the platform writes a number in them — rather than declining it.
 */
function kept(tag: string): boolean {
  const own = new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).resolvedOptions();
  const five = new Intl.NumberFormat(tag, {
    numberingSystem: own.numberingSystem,
    useGrouping: false,
  }).format(5);
  const format = pctTimeFormat(tag);
  return format.hourCycle === own.hourCycle && format.number(5) === five;
}

/** The four clocks a tag can force, and none — the locale's own. */
const FORCED = [undefined, 'h11', 'h12', 'h23', 'h24'] as const;

/** A tag with its clock forced the platform's way, beside any extension it already carries. */
const forcing = (locale: string, clock: (typeof FORCED)[number]): string =>
  clock === undefined
    ? locale
    : new Intl.Locale(locale, { hourCycle: clock }).toString();

describe('reading a time back', () => {
  it('reads what it writes, in all of 0086’s locales and on all four clocks', () => {
    const wrong: string[] = [];
    for (const locale of [...LOCALES, ...CYCLES]) {
      const format = pctTimeFormat(locale);
      for (const time of TIMES) {
        const written = format.format(time);
        const read = format.parse(written);
        if (read !== time)
          wrong.push(
            `${locale}: ${time} → ${JSON.stringify(written)} → ${read}`,
          );
      }
    }
    expect(wrong).toEqual([]);
  });

  it('sweeps every language the platform has a formatter for, and says how many', () => {
    // The denominator: the sweeps below are only worth what this says they reached — two-letter
    // languages and three-letter ones, twelve-hour clocks among them.
    const languages = everyLanguage();
    expect(languages.length).toBeGreaterThan(200);
    expect(languages).toEqual(expect.arrayContaining(['nds', 'hsb', 'brx']));
    expect(
      languages.filter((tag) => pctTimeFormat(tag).hourCycle === 'h12').length,
    ).toBeGreaterThan(10);
  });

  /**
   * A field that declines its formatter round-trips by construction, so a parser that stopped
   * reading some language would vanish among the declined ones and the round trip would stay
   * green. Hence the list per clock, exactly: every other formatter here is kept, its clock and
   * its digits. Two languages are declined, both on a forced twelve-hour clock — `fr-CM` writes no
   * day period, and Anii writes its two with a digit in each, `1ka` and `2ja`.
   */
  it.each([
    ['its own', undefined, []],
    ['h11', 'h11', ['blo-u-hc-h11', 'fr-CM-u-hc-h11']],
    ['h12', 'h12', ['blo-u-hc-h12', 'fr-CM-u-hc-h12']],
    ['h23', 'h23', []],
    ['h24', 'h24', []],
  ] as const)(
    'reads what it writes in every language the platform knows, on %s clock',
    (_name, clock, declinedHere) => {
      // No sample, for the reason the date's week table has none. The sweeps caught what the
      // forty-three locales above did not: Ewe writes its morning and its word for the hour in
      // one run (`ŋdi ga 12:00`); on a forced twelve-hour clock Bulgarian and Canadian French
      // write a separator and then the day period (`1:05 ч. pm`); Low German writes `Klock` on a
      // twelve-hour clock with seconds only — each read back wrong until the parser learned it.
      const wrong: string[] = [];
      const declined: string[] = [];
      for (const locale of [...everyLanguage(), ...LOCALES, ...EDGES]) {
        const tag = forcing(locale, clock);
        const format = pctTimeFormat(tag);
        if (!kept(tag)) declined.push(tag);
        for (const time of ['00:05', '12:05:30', '13:05', '23:59']) {
          const written = format.format(time);
          if (format.parse(written) !== time)
            wrong.push(`${tag}: ${time} → ${JSON.stringify(written)}`);
        }
      }
      expect(wrong).toEqual([]);
      expect(declined.sort()).toEqual(declinedHere);
    },
  );

  it('reads, on a twenty-four-hour clock, what its language writes on a twelve-hour one', () => {
    // The day-period words and the words between the fields both come from the twelve-hour
    // writer, so a time typed the way the language writes it there — `1:05:09 ч. pm`,
    // `ཆུ་ཚོད་ ༡ སྐར་མ་ ༠༥ …` — is the same time in a field that counts to twenty-four.
    const wrong: string[] = [];
    for (const language of everyLanguage()) {
      const twentyFour = pctTimeFormat(forcing(language, 'h23'));
      const twelveHour = pctTimeFormat(forcing(language, 'h12'));
      for (const time of ['00:05', '12:05:30', '13:05:09']) {
        const written = twelveHour.format(time);
        if (twentyFour.parse(written) !== time)
          wrong.push(`${language}: ${time} → ${JSON.stringify(written)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('keeps a formatter that writes words inside its numbers, and reads them back', () => {
    // Node's ICU writes Azerbaijani in Arabic-Indic digits with the words `standart onluq kəsr`
    // before every number. The field built on it once threw; now it writes what the platform
    // writes — as the date field on the same page does — and reads it back, the words being
    // written in the morning and the afternoon alike and so a separator.
    for (const tag of ['az-AZ-u-nu-arab', 'az-AZ-u-nu-arabext']) {
      const azerbaijani = pctTimeFormat(tag);
      const written = azerbaijani.format('13:05');
      expect(written).toBe(
        new Intl.DateTimeFormat(tag, {
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
          timeZone: 'UTC',
        }).format(new Date(Date.UTC(2026, 0, 1, 13, 5))),
      );
      expect(written).not.toBe('13:05');
      expect(azerbaijani.parse(written)).toBe('13:05');
      expect(azerbaijani.parse('13:05')).toBe('13:05');
      // Its hint counts the digits, not the words around them, as the date field's hint does.
      expect(
        azerbaijani.hint({ hour: 'h', minute: 'm', second: 's' }, true),
      ).toBe('hh:mm:ss');
    }
  });

  it('declines a formatter whose text it cannot read back, and counts to twenty-four in ASCII', () => {
    // Node writes `fr-CM-u-hc-h12` as `1:05` for 01:05 and for 13:05 alike — a clock that cannot
    // be read back, which the field does not use.
    const forced = pctTimeFormat('fr-CM-u-hc-h12');
    expect(forced.hourCycle).toBe('h23');
    expect(forced.dayPeriods).toBeNull();
    expect(forced.format('13:05')).toBe('13:05');
    expect(forced.format('01:05')).toBe('01:05');
    // The locale it reports is the one the platform resolved for the clock the field counts on.
    expect(forced.locale).toBe('fr-CM');
    expect(pctTimeFormat('fr-CM-u-hc-h11').hourCycle).toBe('h23');
    // Anii writes its day periods with a digit in each, `1ka` and `2ja`, which no parser that
    // splits on digits can tell from the time: declined too, and only on a twelve-hour clock.
    expect(pctTimeFormat('blo-u-hc-h12').hourCycle).toBe('h23');
    expect(pctTimeFormat('blo-u-hc-h12').format('13:05')).toBe('13:05');
    // A forced clock that does write its day period is honoured, separator first and all.
    const bulgarian = pctTimeFormat('bg-BG-u-hc-h12');
    expect(bulgarian.hourCycle).toBe('h12');
    expect(spaced(bulgarian.format('13:05'))).toBe('1:05 ч. pm');
    expect(bulgarian.parse(bulgarian.format('13:05'))).toBe('13:05');
  });

  it('reads a locale that writes its own digits, typed either way', () => {
    const ar = pctTimeFormat('ar-EG');
    expect(ar.parse('١:٠٥ م')).toBe('13:05');
    expect(ar.parse('1:05 م')).toBe('13:05');
    expect(ar.parse('1:05 pm')).toBe('13:05');
    expect(ar.parse('1:05 am')).toBe('01:05');
    expect(pctTimeFormat('my-MM').parse('၁၃:၀၅')).toBe('13:05');
    expect(pctTimeFormat('fa-IR').parse('13:05')).toBe('13:05');
    // Digits outside the basic plane are characters, not code units: an Adlam numbering system
    // writes, hints and reads back like any other.
    const adlam = pctTimeFormat('en-US-u-nu-adlm');
    expect(adlam.parse(adlam.format('13:05:09'))).toBe('13:05:09');
    expect(spaced(adlam.hint({ hour: 'h', minute: 'm', second: 's' }))).toBe(
      'h:mm AM/PM',
    );
  });

  it('refuses a digit of a numbering system the field does not write, rather than skip it', () => {
    // An Arabic-Indic three among Persian digits, which look alike, and a full-width two typed
    // with a Japanese input method on: read as separators they were 01:30, 01:05 and 13:30.
    expect(pctTimeFormat('fa-IR').parse('۱٣:۳۰')).toBeNull();
    expect(
      pctTimeFormat('ja-JP').parse(`1${String.fromCodePoint(0xff12)}:05`),
    ).toBeNull();
    expect(
      pctTimeFormat('en-US').parse(`1${String.fromCodePoint(0xff12)}:30 pm`),
    ).toBeNull();
    // Nor a number that is not a decimal digit at all: the `〇` a CJK input method types for
    // zero, a superscript two.
    expect(pctTimeFormat('zh-CN').parse('1〇:30')).toBeNull();
    expect(pctTimeFormat('en-GB').parse('1²:30')).toBeNull();
    // Where `〇` IS the locale's zero, it is a digit like the rest.
    const hanidec = pctTimeFormat('zh-CN-u-nu-hanidec');
    expect(hanidec.parse(hanidec.format('10:05:09'))).toBe('10:05:09');
  });

  it('reads either space before a day period', () => {
    // Node writes U+202F and the browsers U+0020 (D4): the tolerance is a rule, not a courtesy.
    const en = pctTimeFormat('en-US');
    expect(en.parse(`1:05${NNBSP}PM`)).toBe('13:05');
    expect(en.parse('1:05 PM')).toBe('13:05');
    expect(en.parse('1:05PM')).toBe('13:05');
  });

  it('accepts more widely than it writes', () => {
    for (const locale of ['en-US', 'pl-PL', 'fr-FR']) {
      const format = pctTimeFormat(locale);
      expect(format.parse('14:30')).toBe('14:30');
      expect(format.parse('14.30')).toBe('14:30');
      expect(format.parse('14h30')).toBe('14:30');
      expect(format.parse('14 h 30')).toBe('14:30');
      expect(format.parse('1430')).toBe('14:30');
      expect(format.parse('2 pm')).toBe('14:00');
      expect(format.parse('2pm')).toBe('14:00');
      expect(format.parse('2:30 p.m.')).toBe('14:30');
      expect(format.parse('2:30 P')).toBe('14:30');
      expect(format.parse('2:30a')).toBe('02:30');
      expect(format.parse('  09:05  ')).toBe('09:05');
    }
  });

  it('reads a single run of digits by its width, the keypad’s whole alphabet', () => {
    const pl = pctTimeFormat('pl-PL');
    expect(pl.parse('905')).toBe('09:05');
    expect(pl.parse('0905')).toBe('09:05');
    expect(pl.parse('1305')).toBe('13:05');
    expect(pl.parse('90509')).toBe('09:05:09');
    expect(pl.parse('130509')).toBe('13:05:09');
  });

  it('reads the locale’s own day-period words, before the hour where the language puts them', () => {
    expect(pctTimeFormat('ko-KR').parse('오후 2:30')).toBe('14:30');
    expect(pctTimeFormat('ko-KR').parse('오전 12:30')).toBe('00:30');
    expect(pctTimeFormat('zh-TW').parse('下午2:30')).toBe('14:30');
    expect(pctTimeFormat('ja-JP-u-hc-h11').parse('午後0:30')).toBe('12:30');
    // A twenty-four-hour field writes none, and reads the ones its language writes on a
    // twelve-hour clock: a Japanese field takes `午後` as a British one takes `pm`.
    expect(pctTimeFormat('ja-JP').parse('午後2:30')).toBe('14:30');
    expect(pctTimeFormat('ja-JP').dayPeriods).toBeNull();
    // And the words the language writes between the fields on that clock: Bulgarian writes `ч.`
    // after a time only on a twelve-hour clock, and a Bulgarian types it on any.
    expect(pctTimeFormat('bg-BG').parse('13:05 ч.')).toBe('13:05');
    // A day period the language writes glued to its word for the hour reads alone, too.
    expect(pctTimeFormat('ee-GH').parse('ŋdi 1:05')).toBe('01:05');
  });

  it('never reads an ASCII letter against the language’s own word for the other half', () => {
    // Albanian writes the morning `p.d.` and the afternoon `m.d.`: a `p` read as the afternoon
    // there would move a morning without a word, so the letter is not read at all.
    const sq = pctTimeFormat('sq-AL');
    expect(sq.parse('1:05 p.d.')).toBe('01:05');
    expect(sq.parse('1:05 m.d.')).toBe('13:05');
    expect(sq.parse('1:05 p')).toBeNull();
    expect(sq.parse('1:05 pm')).toBe('13:05');
    // Where no word of the language stands in its way, the letter is read.
    expect(pctTimeFormat('en-US').parse('1:05 p')).toBe('13:05');
  });

  it('reads both twelve-hour clocks’ first hour, and a twenty-four-hour time in a twelve-hour field', () => {
    const en = pctTimeFormat('en-US');
    expect(en.parse('12:30 am')).toBe('00:30');
    expect(en.parse('12:30 pm')).toBe('12:30');
    // `h11` writes the first hour `0`; read anywhere, it is the same hour.
    expect(en.parse('0:30 pm')).toBe('12:30');
    expect(en.parse('0:30 am')).toBe('00:30');
    // The keypad's road to the afternoon (0086 §2).
    expect(en.parse('14:30')).toBe('14:30');
    expect(en.parse('00:15')).toBe('00:15');
  });

  it('reads 24 as the first hour only on the clock that writes it so', () => {
    expect(pctTimeFormat('en-US-u-hc-h24').parse('24:05')).toBe('00:05');
    expect(pctTimeFormat('en-US-u-hc-h24').parse('00:05')).toBe('00:05');
    expect(pctTimeFormat('en-GB').parse('24:05')).toBeNull();
    expect(pctTimeFormat('en-US').parse('24:05')).toBeNull();
  });

  it('reads the words the locale writes between the fields, and only there', () => {
    expect(pctTimeFormat('fr-CA').parse('13 h 05 min 09 s')).toBe('13:05:09');
    // And punctuation anywhere, where the language writes a word: `fr-CA` writes no colon, and a
    // colon typed there separates like any other mark.
    expect(pctTimeFormat('fr-CA').parse('13:05')).toBe('13:05');
    // Dzongkha writes its word for the minute on a twelve-hour clock only; typed on a
    // twenty-four-hour one it is a separator still, and never a day period.
    expect(pctTimeFormat('dz-BT-u-hc-h23').parse('1 སྐར་མ་ 05')).toBe('01:05');
    // Low German writes `Klock` before the hour, on a twelve-hour clock and with seconds only —
    // in the morning and the afternoon alike, so it names neither: `Klock 9.30` is the morning.
    expect(pctTimeFormat('nds-DE').parse('Klock 9.30')).toBe('09:30');
    expect(pctTimeFormat('nds-DE').parse('Klock 13.05')).toBe('13:05');
    expect(pctTimeFormat('en-US').parse('13 h 05 min 09 s')).toBeNull();
    // A separator after the day period is still a separator, and only a separator: the words
    // a formatter writes as its day period do not become words it writes between the fields.
    expect(pctTimeFormat('en-US').parse('pm 2 h 30')).toBe('14:30');
    expect(pctTimeFormat('en-US').parse('1:05 pam')).toBeNull();
  });
});

describe('refusing what is not a time', () => {
  it('refuses rather than guessing at it', () => {
    const en = pctTimeFormat('en-US');
    for (const junk of [
      '',
      '   ',
      'noon',
      'tomorrow',
      // An hour alone is a time half typed, until a day period says the sentence is over.
      '2',
      '14',
      // A minute or a second in one digit, an hour in three.
      '13:5',
      '13:05:9',
      '013:05',
      // Too many fields — a fourth is refused, not dropped — and a run too long to read by width.
      '1:2:3:4',
      '1:05:09:07',
      '1234567',
      // Outside the clock.
      '24:00',
      '23:60',
      '13:05:60',
    ])
      expect(en.parse(junk)).toBeNull();
  });

  it('refuses a day period it cannot read, two of them, and one that contradicts the hour', () => {
    const en = pctTimeFormat('en-US');
    // A mistyped period is refused rather than read past: as nothing, it would turn an
    // afternoon into a morning without a word.
    expect(en.parse('1:05 pmm')).toBeNull();
    expect(en.parse('1:05 xm')).toBeNull();
    expect(en.parse('1:05 am pm')).toBeNull();
    expect(en.parse('am 1:05 pm')).toBeNull();
    // Past twelve a day period contradicts the hour it stands beside.
    expect(en.parse('13:05 pm')).toBeNull();
    expect(en.parse('13 pm')).toBeNull();
    // A separator glued to a day period is read only the way the language writes the two: no
    // language writes `hpm`, and `fr-CA`'s `s` beside `a` is not its `s a.m.`.
    expect(en.parse('1:05 hpm')).toBeNull();
    expect(en.parse('2 ha')).toBeNull();
    expect(pctTimeFormat('fr-CA').parse('2 sa')).toBeNull();
  });
});

describe('the format hint', () => {
  const letters = { hour: 'h', minute: 'm', second: 's' };

  it('is the language’s own order, separators and day-period words, with the reader’s letters', () => {
    expect(spaced(pctTimeFormat('en-US').hint(letters))).toBe('h:mm AM/PM');
    expect(pctTimeFormat('en-GB').hint(letters)).toBe('hh:mm');
    expect(pctTimeFormat('fi-FI').hint(letters)).toBe('hh.mm');
    expect(pctTimeFormat('ko-KR').hint(letters)).toBe('오전/오후 h:mm');
    expect(pctTimeFormat('fr-CA').hint(letters)).toBe('hh h mm');
  });

  it('carries the seconds when it is asked to', () => {
    expect(pctTimeFormat('en-GB').hint(letters, true)).toBe('hh:mm:ss');
    expect(spaced(pctTimeFormat('en-US').hint(letters, true))).toBe(
      'h:mm:ss AM/PM',
    );
    expect(pctTimeFormat('fr-CA').hint(letters, true)).toBe('hh h mm min ss s');
  });

  it('carries a translated letter with the order it belongs to', () => {
    // The letters are the application's words, here Italian ones: `o` for `ora`.
    expect(
      pctTimeFormat('it-IT').hint({ hour: 'o', minute: 'm', second: 's' }),
    ).toBe('oo:mm');
  });

  it('is written with the same space as the field', () => {
    // One formatter writes both — so whichever space the engine puts before the day period,
    // the hint and the time carry the same one.
    const en = pctTimeFormat('en-US');
    const space = (text: string) => text.match(/\s/)?.[0];
    expect(space(en.hint(letters))).toBe(space(en.format('13:05')));
  });
});

describe('a bare number', () => {
  it('is written in the field’s digits, as wide as it is asked to be', () => {
    expect(pctTimeFormat('en-US').number(5)).toBe('5');
    expect(pctTimeFormat('en-US').number(5, 2)).toBe('05');
    expect(pctTimeFormat('ar-EG').number(5)).toBe('٥');
    expect(pctTimeFormat('ar-EG').number(5, 2)).toBe('٠٥');
    expect(pctTimeFormat('my-MM').number(45, 2)).toBe('၄၅');
  });
});

describe('the formatter itself', () => {
  it('is built once per locale', () => {
    // An `Intl` object is not cheap, and a column builds a label per row. The cache is asserted
    // by IDENTITY, the only thing that says it was not built twice.
    expect(pctTimeFormat('en-GB')).toBe(pctTimeFormat('en-GB'));
    expect(pctTimeFormat('en-GB')).not.toBe(pctTimeFormat('en-US'));
  });

  it('reports the locale the platform resolved', () => {
    expect(pctTimeFormat('en-US').locale).toBe('en-US');
    expect(pctTimeFormat('en-US-u-hc-h23').locale).toBe('en-US-u-hc-h23');
  });
});
