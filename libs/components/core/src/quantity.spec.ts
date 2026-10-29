import { pctQuantityFormat } from './quantity';

/** The no-break space the platform groups with in `pl` and this module writes before a symbol. */
const NBSP = '\u00A0';

describe('pctQuantityFormat', () => {
  it('writes a bare number the locale way when there is no unit', () => {
    const plain = pctQuantityFormat('pl');
    expect(plain.format(17899.7)).toBe(`17${NBSP}899,7`);
    // The locale's grouping rule, not "every three": `pl` groups from five digits.
    expect(plain.format(7899.7)).toBe('7899,7');
  });

  it('reads an empty unit as no unit, with no space left behind', () => {
    expect(pctQuantityFormat('en', { unit: '' }).format(12)).toBe('12');
  });

  it('lets the platform write a unit it knows, short by default', () => {
    expect(pctQuantityFormat('en', { unit: 'celsius' }).format(21.5)).toBe(
      '21.5°C',
    );
    expect(
      pctQuantityFormat('en', { unit: 'celsius', unitDisplay: 'long' }).format(
        21.5,
      ),
    ).toBe('21.5 degrees Celsius');
    expect(pctQuantityFormat('en', { unit: 'liter-per-hour' }).format(3)).toBe(
      '3 L/h',
    );
  });

  it('writes any other unit as a symbol after the number, a no-break space between', () => {
    expect(pctQuantityFormat('pl', { unit: 'kWh' }).format(17899.7)).toBe(
      `17${NBSP}899,7${NBSP}kWh`,
    );
    expect(pctQuantityFormat('en', { unit: '°C' }).format(-3)).toBe(
      `-3${NBSP}°C`,
    );
  });

  it('fixes the fraction digits with one number and bounds them with a pair', () => {
    expect(
      pctQuantityFormat('pl', { unit: 'kWh', fractionDigits: 1 }).format(2),
    ).toBe(`2,0${NBSP}kWh`);
    const bounded = pctQuantityFormat('en', { fractionDigits: [0, 2] });
    expect(bounded.format(2)).toBe('2');
    expect(bounded.format(2.345)).toBe('2.35');
    expect(
      pctQuantityFormat('en', { unit: 'percent', fractionDigits: 1 }).format(
        12,
      ),
    ).toBe('12.0%');
  });

  it('hands the sign rule to the number, whichever road the unit takes', () => {
    const known = pctQuantityFormat('en', {
      unit: 'percent',
      signDisplay: 'exceptZero',
    });
    expect(known.format(12)).toBe('+12%');
    expect(known.format(0)).toBe('0%');
    expect(
      pctQuantityFormat('en', {
        unit: 'kWh',
        signDisplay: 'exceptZero',
      }).format(3),
    ).toBe(`+3${NBSP}kWh`);
  });

  it('throws the platform error for digits that cannot be, rather than writing something else', () => {
    expect(() => pctQuantityFormat('en', { fractionDigits: [3, 1] })).toThrow(
      RangeError,
    );
    expect(() =>
      pctQuantityFormat('en', { unit: 'kWh', fractionDigits: [3, 1] }),
    ).toThrow(RangeError);
  });
});
