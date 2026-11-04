import { pctSheetText, pctTextOfSheet } from './formula';

describe('pctSheetText', () => {
  it('writes a text a sheet would run as a formula after an apostrophe, and any other as it is', () => {
    for (const sign of ['=', '+', '-', '@', '\t', '\r'])
      expect(pctSheetText(`${sign}1`)).toBe(`'${sign}1`);
    expect(pctSheetText('1=1')).toBe('1=1');
    expect(pctSheetText('')).toBe('');
    expect(pctSheetText("'quoted")).toBe("'quoted");
  });
});

describe('pctTextOfSheet', () => {
  it('takes off the apostrophe before a sign, and leaves any other text as it is', () => {
    for (const sign of ['=', '+', '-', '@', '\t', '\r'])
      expect(pctTextOfSheet(`'${sign}1`)).toBe(`${sign}1`);
    expect(pctTextOfSheet("'quoted")).toBe("'quoted");
    expect(pctTextOfSheet("'")).toBe("'");
    expect(pctTextOfSheet('=1')).toBe('=1');
    expect(pctTextOfSheet("x'=1")).toBe("x'=1");
  });
});
