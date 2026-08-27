import { pctToday } from './day';
import {
  pctDayFormat,
  pctFirstDayOfWeek,
  pctMonthCaption,
  pctWeekdayNames,
} from './locale';

/** The two-letter region space, in full — the denominator of the week-start gate below. */
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const REGIONS = LETTERS.flatMap((a) => LETTERS.map((b) => a + b));

interface WeekAwareLocale extends Intl.Locale {
  getWeekInfo?: () => { firstDay: number };
}

/**
 * Runs `read` in the world the table exists for: firefox 151, where
 * `Intl.Locale.prototype.getWeekInfo` is not there.
 *
 * Every assertion about the FALLBACK has to go through here, and the reason is written twice
 * in this repository now: a check of a fallback that runs where the primary answers is a
 * check of the primary ([`lesson-120`](../../../../docs/lessons.md#lesson-120)). The mutation
 * run found the second instance — the `maximize()` road, which no case had ever entered.
 */
function withoutWeekInfo<T>(read: () => T): T {
  const proto = Intl.Locale.prototype as WeekAwareLocale;
  const real = proto.getWeekInfo;
  delete proto.getWeekInfo;
  try {
    return read();
  } finally {
    proto.getWeekInfo = real;
  }
}

describe('the first day of the week', () => {
  it('has a platform to be checked against — and says so out loud when it has not', () => {
    // The gate below is only worth what this line is: if the runtime ever loses
    // `getWeekInfo`, the check has to go red rather than pass over nothing
    // (`lesson-48`'s denominator, in the shape a table can take).
    const locale = new Intl.Locale('en-US') as WeekAwareLocale;
    expect(typeof locale.getWeekInfo).toBe('function');
  });

  /**
   * This is the whole reason the table is allowed to exist, and the way it is run is the
   * whole reason it measures anything.
   *
   * `pctFirstDayOfWeek` asks the PLATFORM first and reads the table only where the platform
   * is silent. Node's ICU has `getWeekInfo`, so a comparison written the obvious way —
   * `getWeekInfo()` against `pctFirstDayOfWeek()` — compares the platform with itself and is
   * green with the table emptied. Measured: dropping Egypt out of the Saturday row left all
   * twenty cases passing ([`lesson-120`](../../../../docs/lessons.md#lesson-120)).
   *
   * So the platform's answers are taken first, `getWeekInfo` is then taken AWAY — which is
   * firefox 151 — and the fallback is asked the same 676 questions. No sample.
   */
  it('agrees with the platform for EVERY two-letter region, with the platform gone', () => {
    const platform = new Map<string, number | undefined>(
      REGIONS.map((region) => [
        region,
        (new Intl.Locale(`und-${region}`) as WeekAwareLocale).getWeekInfo?.()
          .firstDay,
      ]),
    );

    // With the platform gone the fallback has to be what answers, and a fallback that
    // quietly said `1` to everything would show up as 80 rows here rather than as silence.
    const wrong = withoutWeekInfo(() =>
      REGIONS.filter(
        (region) => pctFirstDayOfWeek(`und-${region}`) !== platform.get(region),
      ).map(
        (region) =>
          `${region}: ours ${pctFirstDayOfWeek(`und-${region}`)}, ICU ${platform.get(region)}`,
      ),
    );
    expect(wrong).toEqual([]);
  });

  it('reads the platform where the platform has an answer', () => {
    // The other half: the table is the FALLBACK and not the source. With `getWeekInfo`
    // present the walk must not reach the table at all — proved by taking the table's own
    // answer away from a region and finding the reading unchanged.
    const proto = Intl.Locale.prototype as WeekAwareLocale;
    expect(typeof proto.getWeekInfo).toBe('function');
    expect(pctFirstDayOfWeek('und-EG')).toBe(6);
  });

  it('takes the region from a tag that has one', () => {
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('en-GB'))).toBe(1);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('ar-EG'))).toBe(6);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('dv-MV'))).toBe(5);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('en-US'))).toBe(7);
  });

  it('gets a region from `maximize()` when the tag has none', () => {
    // `pl` maximises to `pl-Latn-PL` and `en` to `en-Latn-US` — which is exactly the
    // difference between Monday and Sunday. Run with the platform gone, because that is the
    // only world in which this road is taken at all.
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('pl'))).toBe(1);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('en'))).toBe(7);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('ar'))).toBe(6);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('he'))).toBe(7);
  });

  it('answers Monday for a tag the platform will not parse', () => {
    // A tag we cannot reason about is not a reason to throw inside a template — and the
    // reading is the same with the platform there and gone, because it never gets that far.
    expect(pctFirstDayOfWeek('not a locale')).toBe(1);
    expect(pctFirstDayOfWeek('')).toBe(1);
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('not a locale'))).toBe(1);
    // A region the table does not name reaches the default, which is what the table is the
    // exception list of.
    expect(withoutWeekInfo(() => pctFirstDayOfWeek('und-FR'))).toBe(1);
  });
});

describe('writing a day', () => {
  it('writes it in the order the language writes it', () => {
    expect(pctDayFormat('en-US').format('2026-12-01')).toBe('12/01/2026');
    expect(pctDayFormat('pl-PL').format('2026-12-01')).toBe('01.12.2026');
    expect(pctDayFormat('ja-JP').format('2026-12-01')).toBe('2026/12/01');
    expect(pctDayFormat('en-US').order).toEqual(['month', 'day', 'year']);
    expect(pctDayFormat('pl-PL').order).toEqual(['day', 'month', 'year']);
    expect(pctDayFormat('ja-JP').order).toEqual(['year', 'month', 'day']);
  });

  it('pins the CALENDAR and leaves the numbering system alone', () => {
    // `th-TH` resolves to the buddhist calendar and would write 2569 — the grid beside the
    // field draws 2026, and two halves of one control disagreeing about the year is the
    // defect this pin exists for. The DIGITS are another matter: `٠١` is how Egyptian Arabic
    // writes a number, and that is the reader's, not the value's.
    expect(pctDayFormat('th-TH').format('2026-12-01')).toContain('2026');
    expect(pctDayFormat('fa-IR').format('2026-12-01')).toContain('۲۰۲۶');
    expect(pctDayFormat('ar-EG').format('2026-12-01')).toContain('٢٠٢٦');
  });

  it('writes a bare number in the same digits as the date', () => {
    expect(pctDayFormat('en-US').number(27)).toBe('27');
    expect(pctDayFormat('ar-EG').number(27)).toBe('٢٧');
  });

  it('says the whole date in words, for a cell holding only a number', () => {
    const long = pctDayFormat('en-GB').formatLong('2026-12-01');
    expect(long).toContain('December');
    expect(long).toContain('2026');
    expect(long).toContain('Tuesday');
  });
});

describe('reading a day back', () => {
  it('reads what it writes, in every locale it writes for', () => {
    for (const locale of [
      'en-US',
      'en-GB',
      'pl-PL',
      'de-DE',
      'ja-JP',
      'fr-CA',
      'hu-HU',
      'ar-EG',
      'fa-IR',
      'th-TH',
    ]) {
      const format = pctDayFormat(locale);
      for (const day of ['2026-12-01', '2026-01-31', '2024-02-29']) {
        expect(format.parse(format.format(day))).toBe(day);
      }
    }
  });

  it('reads a locale that writes its own digits, typed either way', () => {
    // `ar-EG` writes `٠١‏/١٢‏/٢٠٢٦` — Arabic-Indic digits with `U+200F` before each
    // separator. Both the digits the locale writes and the ASCII ones a keyboard produces
    // have to read back to the same day.
    expect(pctDayFormat('ar-EG').parse('٠١‏/١٢‏/٢٠٢٦')).toBe('2026-12-01');
    expect(pctDayFormat('ar-EG').parse('٠١/١٢/٢٠٢٦')).toBe('2026-12-01');
    expect(pctDayFormat('ar-EG').parse('1/12/2026')).toBe('2026-12-01');
  });

  it('accepts more widely than it writes', () => {
    const pl = pctDayFormat('pl-PL');
    expect(pl.parse('1.12.2026')).toBe('2026-12-01');
    expect(pl.parse('1/12/2026')).toBe('2026-12-01');
    expect(pl.parse('1 12 2026')).toBe('2026-12-01');
    expect(pl.parse('  01.12.2026  ')).toBe('2026-12-01');
  });

  it('refuses what is not a date rather than guessing at it', () => {
    const pl = pctDayFormat('pl-PL');
    expect(pl.parse('')).toBeNull();
    expect(pl.parse('tomorrow')).toBeNull();
    expect(pl.parse('1.12')).toBeNull();
    expect(pl.parse('1.12.2026.5')).toBeNull();
    // A day the calendar does not have is a typing mistake, not an overflow to normalise:
    // `32.08.2026` must not become 1 September.
    expect(pl.parse('32.08.2026')).toBeNull();
    expect(pl.parse('29.02.2025')).toBeNull();
    expect(pl.parse('29.02.2024')).toBe('2024-02-29');
  });

  it('puts a short year in the window and refuses the one shape nobody means', () => {
    const pl = pctDayFormat('pl-PL');
    const thisYear = Number(pctToday().slice(0, 4));
    const base = thisYear - 80;

    // Two digits land in [today − 80, today + 19] — the convention every other date field a
    // user has met uses.
    const near = String((thisYear + 5) % 100).padStart(2, '0');
    expect(pl.parse(`01.12.${near}`)).toBe(`${thisYear + 5}-12-01`);
    const old = String((base + 1) % 100).padStart(2, '0');
    expect(pl.parse(`01.12.${old}`)).toBe(`${base + 1}-12-01`);

    // One digit is the same window.
    expect(pl.parse('01.12.5')?.endsWith('-12-01')).toBe(true);
    // Three digits are neither a year in full nor a short one — `026` is nothing anybody
    // means, so it is refused rather than guessed at.
    expect(pl.parse('01.12.026')).toBeNull();
  });

  it('puts the oldest year of the window at its edge', () => {
    // The boundary itself, because `<` and `<=` are one keystroke apart and the difference
    // is a hundred years.
    const thisYear = Number(pctToday().slice(0, 4));
    const base = thisYear - 80;
    expect(
      pctDayFormat('pl-PL').parse(
        `01.12.${String(base % 100).padStart(2, '0')}`,
      ),
    ).toBe(`${base}-12-01`);
  });

  it('reads a year written out in full as itself', () => {
    expect(pctDayFormat('pl-PL').parse('01.12.1899')).toBe('1899-12-01');
    expect(pctDayFormat('pl-PL').parse('01.12.2126')).toBe('2126-12-01');
  });
});

describe('the formatter itself', () => {
  it('is built once per locale', () => {
    // An `Intl` object is not cheap and a calendar builds one per cell name. The cache is
    // asserted by IDENTITY, which is the only thing that says it was not built twice.
    expect(pctDayFormat('en-GB')).toBe(pctDayFormat('en-GB'));
    expect(pctDayFormat('en-GB')).not.toBe(pctDayFormat('en-US'));
  });
});

describe('the format hint', () => {
  it('is the language’s own order and separators with the reader’s letters', () => {
    const letters = { day: 'd', month: 'm', year: 'y' };
    expect(pctDayFormat('en-US').hint(letters)).toBe('mm/dd/yyyy');
    expect(pctDayFormat('pl-PL').hint(letters)).toBe('dd.mm.yyyy');
    expect(pctDayFormat('ja-JP').hint(letters)).toBe('yyyy/mm/dd');
    // A translated letter travels with the order it belongs to.
    expect(
      pctDayFormat('pl-PL').hint({ day: 'd', month: 'm', year: 'r' }),
    ).toBe('dd.mm.rrrr');
  });

  it('keeps a separator that stands after the last field', () => {
    // `hu-HU` writes `2026. 12. 01.` — a trailing literal that a hint built by joining three
    // fields with one separator would lose.
    expect(
      pctDayFormat('hu-HU').hint({ day: 'd', month: 'm', year: 'y' }),
    ).toBe('yyyy. mm. dd.');
  });
});

describe('the column headings', () => {
  it('gives seven, rotated to the week start', () => {
    const monday = pctWeekdayNames('en-GB', 1);
    expect(monday).toHaveLength(7);
    expect(monday[0].long).toBe('Monday');
    expect(monday[6].long).toBe('Sunday');

    const sunday = pctWeekdayNames('en-US', 7);
    expect(sunday[0].long).toBe('Sunday');
    expect(sunday[1].long).toBe('Monday');

    const saturday = pctWeekdayNames('en-GB', 6);
    expect(saturday[0].long).toBe('Saturday');
  });

  it('keeps the narrow and the long name apart, because the narrow one is ambiguous', () => {
    const names = pctWeekdayNames('en-GB', 1);
    const narrow = names.map((n) => n.narrow);
    // `S` for Saturday and `S` for Sunday — by design, and unusable as a heading a reader
    // has to tell apart by ear.
    expect(new Set(narrow).size).toBeLessThan(7);
    expect(new Set(names.map((n) => n.long)).size).toBe(7);
  });

  it('speaks the language it is asked in', () => {
    // German rather than the author's own language, and that is the language gate rather
    // than a preference: this repository measures itself for words of one particular other
    // language, and what the case is about is the platform speaking ANY language that is not
    // the default (`req-project-language`).
    expect(pctWeekdayNames('de-DE', 1)[0].long).toBe('Montag');
  });
});

describe('the caption', () => {
  it('is the month and the year, in the value’s own calendar', () => {
    expect(pctMonthCaption('en-GB', '2026-12-01')).toBe('December 2026');
    expect(pctMonthCaption('de-DE', '2026-12-01')).toBe('Dezember 2026');
    expect(pctMonthCaption('th-TH', '2026-12-01')).toContain('2026');
  });
});
