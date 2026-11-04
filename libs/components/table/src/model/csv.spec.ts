import {
  pctDelimiterOf,
  pctParseDelimited,
  pctPlainReader,
  pctPlainWriter,
  pctShowsTime,
  pctWriteDelimited,
} from './csv';

const words = { yes: 'Yes', no: 'No' };
const NBSP = String.fromCharCode(0xa0);
const MINUS = String.fromCharCode(0x2212);

describe('pctDelimiterOf', () => {
  it('is a semicolon where the decimals are written with a comma, a comma elsewhere', () => {
    expect(pctDelimiterOf('pl')).toBe(';');
    expect(pctDelimiterOf('de-DE')).toBe(';');
    expect(pctDelimiterOf('en')).toBe(',');
    expect(pctDelimiterOf('ja')).toBe(',');
  });
});

describe('pctWriteDelimited', () => {
  it('ends each line with CR LF, and quotes a cell with the delimiter, a quote or a break', () => {
    expect(
      pctWriteDelimited(
        [
          ['Name', 'Note'],
          ['Lamp', 'say "hi"'],
          ['a,b', 'two\nlines'],
          ['a;b', 'cr\r'],
        ],
        ',',
      ),
    ).toBe(
      'Name,Note\r\nLamp,"say ""hi"""\r\n"a,b","two\nlines"\r\na;b,"cr\r"\r\n',
    );
    expect(pctWriteDelimited([['a;b', 'a,b', 'a\tb']], ';')).toBe(
      '"a;b";a,b;a\tb\r\n',
    );
    expect(pctWriteDelimited([['a\tb', '']], '\t')).toBe('"a\tb"\t\r\n');
    expect(pctWriteDelimited([], ',')).toBe('');
  });
});

describe('pctParseDelimited', () => {
  it('reads lines at CR LF, LF or CR, and the break after the last ends it', () => {
    expect(pctParseDelimited('a\tb\r\nc\td\r\n', '\t')).toEqual([
      ['a', 'b'],
      ['c', 'd'],
    ]);
    expect(pctParseDelimited('a\nb\rc', '\t')).toEqual([['a'], ['b'], ['c']]);
    expect(pctParseDelimited('Lamp', '\t')).toEqual([['Lamp']]);
    expect(pctParseDelimited('', '\t')).toEqual([]);
    // An empty last cell is a cell; an empty line between two is a line of one.
    expect(pctParseDelimited('a\t\n\nb', '\t')).toEqual([
      ['a', ''],
      [''],
      ['b'],
    ]);
  });

  it('reads a quoted cell whole, its doubled quotes one, a quote inside a cell as it is', () => {
    expect(pctParseDelimited('"a\tb"\t"say ""hi"""\n"x\r\ny"', '\t')).toEqual([
      ['a\tb', 'say "hi"'],
      ['x\r\ny'],
    ]);
    expect(pctParseDelimited('5" disk,"a,b"', ',')).toEqual([
      ['5" disk', 'a,b'],
    ]);
    // A quote that closes before more text, or never, is a character of a cell as written.
    expect(pctParseDelimited('"Best" seller\tx', '\t')).toEqual([
      ['"Best" seller', 'x'],
    ]);
    expect(pctParseDelimited('"open', ',')).toEqual([['"open']]);
    expect(pctParseDelimited('"abc\tdef\r\nxyz', '\t')).toEqual([
      ['"abc', 'def'],
      ['xyz'],
    ]);
    expect(pctParseDelimited('"a"\t"b"', '\t')).toEqual([['a', 'b']]);
    // A cell read as written does not swallow the quoted cell after it.
    expect(pctParseDelimited('"a" b\t"c\td"', '\t')).toEqual([
      ['"a" b', 'c\td'],
    ]);
  });
});

describe('pctPlainWriter', () => {
  it('writes a number with the decimal separator alone: no group, no unit, every digit', () => {
    const kind = { number: { unit: 'kWh', fractionDigits: 1 } } as const;
    expect(pctPlainWriter(kind, 'pl')(17899.75)).toBe('17899,75');
    expect(pctPlainWriter(kind, 'en')(-0.5)).toBe('-0.5');
    expect(pctPlainWriter(kind, 'en')(12)).toBe('12');
    // A mark a sheet does not read is written as a point.
    expect(pctPlainWriter(kind, 'ar-EG')(1950.25)).toBe('1950.25');
    expect(pctPlainWriter(kind, 'en')(null)).toBe('');
    expect(pctPlainWriter(kind, 'en')(Number.NaN)).toBe('');
    expect(pctPlainWriter(kind, 'en')('12')).toBe('');
  });

  it("writes an instant as its wall clock in the column's zone, its day where it shows no time", () => {
    // 2026-11-03 13:05:09 UTC is 14:05:09 in Warsaw.
    const at = Date.UTC(2026, 10, 3, 13, 5, 9);
    const timed = {
      instant: { timeZone: 'Europe/Warsaw', format: { hour: 'numeric' } },
    } as const;
    expect(pctPlainWriter(timed, 'pl')(at)).toBe('2026-11-03 14:05:09');
    const day = { instant: { timeZone: 'Pacific/Kiritimati' } } as const;
    expect(pctPlainWriter(day, 'pl')(Date.UTC(2026, 10, 3, 13))).toBe(
      '2026-11-04',
    );
    expect(
      pctPlainWriter(
        { instant: { timeZone: 'UTC' } },
        'en',
      )(Date.UTC(812, 0, 5)),
    ).toBe('0812-01-05');
    expect(pctPlainWriter(timed, 'pl')(undefined)).toBe('');
  });

  it('writes a boolean as true or false, and any other value as its text', () => {
    expect(pctPlainWriter('boolean', 'pl')(true)).toBe('true');
    expect(pctPlainWriter('boolean', 'pl')(false)).toBe('false');
    expect(pctPlainWriter('boolean', 'pl')(null)).toBe('');
    expect(pctPlainWriter('text', 'pl')(7)).toBe('7');
    expect(pctPlainWriter(undefined, 'pl')('Lamp')).toBe('Lamp');
    expect(pctPlainWriter(undefined, 'pl')(null)).toBe('');
    expect(pctPlainWriter(undefined, 'pl')(undefined)).toBe('');
  });
});

describe('pctPlainReader', () => {
  const number = { number: {} } as const;

  it("reads a number the locale's way, or with a point, its groups where they stand between thousands", () => {
    const pl = pctPlainReader(number, 'pl', words);
    expect(pl(`1${NBSP}950,3`)).toBe(1950.3);
    expect(pl(' 1950,3 ')).toBe(1950.3);
    expect(pl('1950.3')).toBe(1950.3);
    expect(pl(`${MINUS}5`)).toBe(-5);
    expect(pl('+5')).toBe(5);
    expect(pl(',5')).toBe(0.5);
    expect(pl('5,')).toBe(5);
    expect(pl('1e3')).toBe(1000);
    const de = pctPlainReader(number, 'de', words);
    expect(de('1.950,3')).toBe(1950.3);
    expect(de('1.950.300')).toBe(1950300);
    expect(de('12.345,6')).toBe(12345.6);
    expect(de('123.456')).toBe(123456);
    expect(de('1.1234.567')).toBeUndefined();
    expect(de('1.23.456')).toBeUndefined();
    // A point that stands before no thousands is a decimal point, as English writes it.
    expect(de('1950.3')).toBe(1950.3);
    expect(de('1234.567')).toBe(1234.567);
    expect(de('0.125')).toBe(0.125);
    expect(de('-0.125')).toBe(-0.125);
    expect(de('-1.234')).toBe(-1234);
    expect(de('1.950.30')).toBeUndefined();
    const ch = pctPlainReader(number, 'de-CH', words);
    expect(ch(`1'950.5`)).toBe(1950.5);
    expect(ch(`1${String.fromCharCode(0x2019)}950.5`)).toBe(1950.5);
    const en = pctPlainReader(number, 'en', words);
    expect(en('1,950.3')).toBe(1950.3);
    expect(en('1,5')).toBeUndefined();
    expect(en('1,9500')).toBeUndefined();
    expect(en('0,125')).toBeUndefined();
    expect(en(',123')).toBeUndefined();
    expect(en('1e400')).toBeUndefined();
    expect(en('1E3')).toBe(1000);
    expect(en('0x10')).toBeUndefined();
    expect(en('Infinity')).toBeUndefined();
    expect(en('1_000')).toBeUndefined();
  });

  it('reads a group written with either apostrophe, and a locale that groups with nothing', () => {
    // A platform whose data groups `de-CH` with the typographic apostrophe, and one with none.
    const parts = Intl.NumberFormat.prototype.formatToParts;
    const spy = vi
      .spyOn(Intl.NumberFormat.prototype, 'formatToParts')
      .mockImplementation(function (this: Intl.NumberFormat, value) {
        return parts
          .call(this, value)
          .filter((part) => part.type !== 'group' || value !== 1)
          .map((part) =>
            part.type === 'group'
              ? { ...part, value: String.fromCharCode(0x2019) }
              : part,
          );
      });
    try {
      const ch = pctPlainReader(number, 'de-CH', words);
      expect(ch(`1'950.5`)).toBe(1950.5);
      expect(ch(`1${String.fromCharCode(0x2019)}950.5`)).toBe(1950.5);
      expect(ch('1950.5')).toBe(1950.5);
    } finally {
      spy.mockRestore();
    }
    const none = vi
      .spyOn(Intl.NumberFormat.prototype, 'formatToParts')
      .mockImplementation(function (this: Intl.NumberFormat, value) {
        return parts.call(this, value).filter((part) => part.type !== 'group');
      });
    try {
      const flat = pctPlainReader(number, 'en', words);
      expect(flat('1950.5')).toBe(1950.5);
      expect(flat('1,950.5')).toBeUndefined();
      expect(pctDelimiterOf('en')).toBe(',');
    } finally {
      none.mockRestore();
    }
  });

  it('reads empty text as an empty number, and text that is no number as none', () => {
    const en = pctPlainReader(number, 'en', words);
    expect(en('')).toBeNull();
    expect(en('  ')).toBeNull();
    expect(en('12 W')).toBeUndefined();
    expect(en('1.2.3')).toBeUndefined();
    expect(en('.')).toBeUndefined();
    expect(en('-')).toBeUndefined();
    expect(en('x12')).toBeUndefined();
    expect(en('12x')).toBeUndefined();
  });

  it("reads an instant with or without its time and its offset, on the column's zone without one", () => {
    const read = pctPlainReader(
      { instant: { timeZone: 'Europe/Warsaw' } },
      'pl',
      words,
    );
    expect(read('2026-11-03')).toBe(Date.UTC(2026, 10, 2, 23));
    expect(read('2026-11-03 14:05')).toBe(Date.UTC(2026, 10, 3, 13, 5));
    expect(read('2026-11-03T14:05:09')).toBe(Date.UTC(2026, 10, 3, 13, 5, 9));
    expect(read('2026-11-03 14:05:09.5')).toBe(
      Date.UTC(2026, 10, 3, 13, 5, 9, 500),
    );
    expect(read('2026-11-03 14:05:09.05')).toBe(
      Date.UTC(2026, 10, 3, 13, 5, 9, 50),
    );
    expect(read('2026-11-03T14:05:09.25Z')).toBe(
      Date.UTC(2026, 10, 3, 14, 5, 9, 250),
    );
    expect(read('2026-11-03T14:05+02:00')).toBe(Date.UTC(2026, 10, 3, 12, 5));
    expect(read('2026-11-03T14:05-0130')).toBe(Date.UTC(2026, 10, 3, 15, 35));
    expect(read(' ')).toBeNull();
    for (const junk of [
      '2026-13-01',
      '2026-00-01',
      '2026-11-32',
      '2026-11-00',
      '2026-11-03 24:00',
      '2026-11-03 12:60',
      '2026-11-03 12:00:60',
      '3.11.2026',
      '2026-02-30',
      '2026-04-31',
      '2026-11-03T14:05+05:99',
      '2026-11-03T14:05+24:00',
      'x2026-11-03',
      '2026-11-03x',
    ])
      expect(read(junk)).toBeUndefined();
    // The edges of each field are values.
    expect(read('2026-12-31 23:59:59Z')).toBe(
      Date.UTC(2026, 11, 31, 23, 59, 59),
    );
    expect(read('2026-01-01 00:00:00Z')).toBe(Date.UTC(2026, 0, 1));
    expect(read('2028-02-29 00:00Z')).toBe(Date.UTC(2028, 1, 29));
    expect(read('2026-11-03T14:05+23:59')).toBe(
      Date.UTC(2026, 10, 3, 14, 5) - (23 * 60 + 59) * 60_000,
    );
  });

  it('reads a boolean as true, false, 1, 0 or the words, in any case, and a text as it is', () => {
    const read = pctPlainReader('boolean', 'de', { yes: 'Ja', no: 'Nein' });
    expect(['true', 'TRUE', '1', 'ja', ' Ja '].map(read)).toEqual([
      true,
      true,
      true,
      true,
      true,
    ]);
    expect(['false', '0', 'NEIN'].map(read)).toEqual([false, false, false]);
    expect(read('')).toBeNull();
    expect(read('maybe')).toBeUndefined();
    expect(pctPlainReader('text', 'pl', words)(' Lamp ')).toBe(' Lamp ');
    expect(pctPlainReader(undefined, 'pl', words)('')).toBe('');
  });
});

describe('pctShowsTime', () => {
  it('is true for a relative instant and a format with a time, false for the day alone', () => {
    expect(pctShowsTime({ relative: true })).toBe(true);
    expect(pctShowsTime({})).toBe(false);
    expect(pctShowsTime({ format: { day: 'numeric' } })).toBe(false);
    expect(pctShowsTime({ format: { hour: 'numeric' } })).toBe(true);
    expect(pctShowsTime({ format: { minute: 'numeric' } })).toBe(true);
    expect(pctShowsTime({ format: { second: 'numeric' } })).toBe(true);
    expect(pctShowsTime({ format: { timeStyle: 'short' } })).toBe(true);
  });
});
