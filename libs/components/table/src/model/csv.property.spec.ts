import {
  type PctArbitrary,
  pctForAll,
  pctOneOf,
  pctRecord,
} from '../../../testing/src/property.testkit';
import {
  pctParseDelimited,
  pctPlainReader,
  pctPlainWriter,
  pctWriteDelimited,
} from './csv';

/**
 * The round trip, swept: cells of any text — delimiters, quotes, breaks, empty ones — are read
 * back as they were written, with each delimiter; and a number written plain is read back as
 * itself in each locale.
 */
function cellsOf(): PctArbitrary<string[][]> {
  const piece = pctOneOf([
    'a',
    'é',
    ' ',
    ',',
    ';',
    '\t',
    '"',
    '\n',
    '\r\n',
    '\r',
    '',
    '1,5',
  ] as const);
  const text: PctArbitrary<string> = {
    sample: (random) =>
      Array.from({ length: Math.floor(random() * 5) }, () =>
        piece.sample(random),
      ).join(''),
    shrink: (value) =>
      value === '' ? [] : [value.slice(1), value.slice(0, -1)],
    show: (value) => JSON.stringify(value),
  };
  return {
    sample: (random) => {
      const width = 1 + Math.floor(random() * 3);
      return Array.from({ length: Math.floor(random() * 4) }, () =>
        Array.from({ length: width }, () => text.sample(random)),
      );
    },
    shrink: (lines) => lines.map((_, i) => lines.filter((__, j) => j !== i)),
    show: (lines) => JSON.stringify(lines),
  };
}

describe('delimited text over every table of cells', () => {
  it('reads back what it wrote, with each delimiter', () => {
    const cases = pctRecord({
      cells: cellsOf(),
      delimiter: pctOneOf([',', ';', '\t'] as const),
    });
    pctForAll(cases, ({ cells, delimiter }) => {
      // A line of one empty cell is written as an empty line, and read as one: the same.
      expect(
        pctParseDelimited(pctWriteDelimited(cells, delimiter), delimiter),
      ).toEqual(cells);
    });
  });
});

describe('a plain number over every locale', () => {
  it('is read back as itself', () => {
    const cases = pctRecord({
      value: pctOneOf([
        0, -0.5, 12, 1950.25, 17899.7, -123456.789, 1e-7, 3e21,
      ] as const),
      locale: pctOneOf([
        'pl',
        'en',
        'de',
        'fr',
        'de-CH',
        'en-IN',
        'ar',
        'ar-EG',
        'fa',
        'sv',
      ] as const),
    });
    pctForAll(cases, ({ value, locale }) => {
      const kind = { number: {} } as const;
      const written = pctPlainWriter(kind, locale)(value);
      expect(
        pctPlainReader(kind, locale, { yes: 'Yes', no: 'No' })(written),
      ).toBe(value);
    });
  });
});
