import { pctDigitsOf, pctNumberFormat, pctToLatinDigits } from './digits';

/**
 * Runs `read` on a platform whose number formatter writes `written` for every number — the world
 * the two defensive branches of `pctDigitsOf` exist for, which no engine this repository runs
 * reaches: V8 resolves an algorithmic system such as `roman` to `latn` before it writes a digit.
 * A check of a fallback that runs where the primary answers is a check of the primary
 * ([`lesson-120`](../../../../docs/lessons.md#lesson-120)), so the platform is replaced instead.
 */
function withNumbersWritten<T>(written: string, read: () => T): T {
  const real = Intl.NumberFormat;
  const fake = function () {
    return { format: () => written };
  } as unknown as typeof Intl.NumberFormat;
  Intl.NumberFormat = fake;
  try {
    return read();
  } finally {
    Intl.NumberFormat = real;
  }
}

describe('pctDigitsOf', () => {
  it('answers nothing for the ASCII digits, where there is nothing to translate back', () => {
    expect(pctDigitsOf('en-US', 'latn')).toBeNull();
    // Asked by name, not by locale: the locale's own system is the caller's to read.
    expect(pctDigitsOf('ar-EG', 'latn')).toBeNull();
  });

  it('reads the ten digits of a system off the platform, in the order 0 to 9', () => {
    expect(pctDigitsOf('ar-EG', 'arab')?.join('')).toBe('٠١٢٣٤٥٦٧٨٩');
    expect(pctDigitsOf('fa-IR', 'arabext')?.join('')).toBe('۰۱۲۳۴۵۶۷۸۹');
    expect(pctDigitsOf('hi-IN', 'deva')?.join('')).toBe('०१२३४५६७८९');
    expect(pctDigitsOf('my-MM', 'mymr')?.join('')).toBe('၀၁၂၃၄၅၆၇၈၉');
    // A system whose digits stand outside the basic plane is ten glyphs and twenty code units:
    // the count is of characters, which is what a reader types.
    expect(pctDigitsOf('en', 'adlm')).toHaveLength(10);
  });

  it('answers nothing for a system the platform will not take', () => {
    // `x` is not a well-formed numbering system, and the formatter throws on it.
    expect(pctDigitsOf('en-US', 'x')).toBeNull();
  });

  it('answers nothing where a system does not write ten digits, or writes two the same', () => {
    expect(
      withNumbersWritten('MCCXXXIVDLXVIIDCCCXC', () =>
        pctDigitsOf('en', 'roman'),
      ),
    ).toBeNull();
    expect(
      withNumbersWritten('1234567810', () => pctDigitsOf('en', 'mixed')),
    ).toBeNull();
    // And the same platform with ten distinct glyphs is read — the replacement is not what
    // made the two above come back empty.
    expect(
      withNumbersWritten('abcdefghij', () => pctDigitsOf('en', 'letters')),
    ).toEqual(['j', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']);
  });
});

describe('pctNumberFormat', () => {
  it('writes in the system it is asked for, as wide as it is asked', () => {
    expect(pctNumberFormat('ar-EG', 'arab').format(27)).toBe('٢٧');
    expect(pctNumberFormat('ar-EG', 'arab', 2).format(5)).toBe('٠٥');
    expect(pctNumberFormat('en-US', 'latn', 2).format(5)).toBe('05');
    // Never grouped: a bare number in a cell is not an amount.
    expect(pctNumberFormat('en-US', 'latn').format(12345)).toBe('12345');
  });

  it('falls back to the ASCII digits where the platform will not take the system', () => {
    expect(pctNumberFormat('en-US', 'x').format(27)).toBe('27');
    expect(pctNumberFormat('en-US', 'x', 2).format(5)).toBe('05');
    expect(pctNumberFormat('en-US', 'x').format(12345)).toBe('12345');
  });
});

describe('pctToLatinDigits', () => {
  it('writes a locale’s digits back as the ASCII ones and leaves everything else', () => {
    const arab = pctDigitsOf('ar-EG', 'arab');
    expect(pctToLatinDigits('١:٠٥ م', arab)).toBe('1:05 م');
    expect(pctToLatinDigits('٠١‏/١٢‏/٢٠٢٦', arab)).toBe('01‏/12‏/2026');
    // ASCII digits typed into the same field are already what the parser reads.
    expect(pctToLatinDigits('13:05', arab)).toBe('13:05');
  });

  it('leaves the text as it was where there is nothing to translate', () => {
    expect(pctToLatinDigits('13:05', null)).toBe('13:05');
    expect(pctToLatinDigits('1:05 PM', null)).toBe('1:05 PM');
  });

  it('refuses a text holding a digit of another numbering system', () => {
    // Left in, it would read as a separator: an Arabic-Indic three among Persian digits, the
    // Arabic-Indic digits in a field whose locale writes the ASCII ones, a full-width two.
    expect(
      pctToLatinDigits('۱٣:۳۰', pctDigitsOf('fa-IR', 'arabext')),
    ).toBeNull();
    expect(pctToLatinDigits('١:٠٥', null)).toBeNull();
    expect(
      pctToLatinDigits(`1${String.fromCodePoint(0xff12)}`, null),
    ).toBeNull();
  });

  it('writes back digits outside the basic plane, one character each', () => {
    const adlam = pctDigitsOf('en', 'adlm');
    const written = pctNumberFormat('en', 'adlm').format(1305);
    expect(pctToLatinDigits(`${written}:09`, adlam)).toBe('1305:09');
  });
});
