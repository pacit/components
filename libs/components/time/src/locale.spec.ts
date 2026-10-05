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
 * Any run of spaces as one ASCII space. Node writes U+202F before a day period where the
 * browsers write U+0020 (0086, D4), and a case about the words is not a case about which space.
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

/** Every language node's ICU knows, each in its likeliest region — read, not listed. */
function everyLocale(): string[] {
  const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const tags = new Set<string>();
  for (const a of letters)
    for (const b of letters)
      tags.add(new Intl.Locale(a + b).maximize().baseName);
  return [...tags];
}

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

  it('reads what it writes in every language the platform can write a time in', () => {
    // No sample, for the reason the date's week table has none: the one language this sweep
    // caught that the forty-three above did not was Ewe, which writes its word for the morning
    // and its word for the hour in one run — `ŋdi ga 12:00` — and read nothing back until the
    // parser learned to find a day period beside a separator.
    const locales = everyLocale();
    const resolved = new Set(locales.map((tag) => pctTimeFormat(tag).locale));
    // The denominator: the sweep is only worth what this says it reached.
    expect(resolved.size).toBeGreaterThan(100);
    expect(locales.some((tag) => pctTimeFormat(tag).hourCycle === 'h12')).toBe(
      true,
    );
    const wrong: string[] = [];
    for (const locale of locales) {
      const format = pctTimeFormat(locale);
      for (const time of ['00:05', '12:05:30', '23:59']) {
        const written = format.format(time);
        if (format.parse(written) !== time)
          wrong.push(`${locale}: ${time} → ${JSON.stringify(written)}`);
      }
    }
    expect(wrong).toEqual([]);
  });

  it('reads a locale that writes its own digits, typed either way', () => {
    const ar = pctTimeFormat('ar-EG');
    expect(ar.parse('١:٠٥ م')).toBe('13:05');
    expect(ar.parse('1:05 م')).toBe('13:05');
    expect(ar.parse('1:05 pm')).toBe('13:05');
    expect(pctTimeFormat('my-MM').parse('၁၃:၀၅')).toBe('13:05');
    expect(pctTimeFormat('fa-IR').parse('13:05')).toBe('13:05');
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
    expect(pctTimeFormat('en-US').parse('13 h 05 min 09 s')).toBeNull();
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
      // Too many fields, and a run of digits too long to read by width.
      '1:2:3:4',
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
