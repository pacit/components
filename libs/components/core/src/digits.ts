/**
 * The reader's digits: the ten glyphs a locale writes a number in, and the road back from them
 * to the ASCII ones a parser reads.
 *
 * One home for a fact three controls need
 * ([0086](../../../../docs/decisions/0086-a-time-of-day-is-a-wall-clock.md) §6,
 * [0017](../../../../docs/decisions/0017-one-home-per-fact.md)): the date field reads its
 * numbering system off its date formatter, the time field off its time formatter — and the two
 * agree in every locale measured, which is what lets one helper serve both. The numbering system
 * is a parameter rather than something read here, because which formatter a control writes with
 * is the control's to say.
 */

/**
 * The digits of `numberingSystem` as `locale` writes them, in the order `0`…`9`, or `null` where
 * they are the ASCII ones and nothing has to be translated back.
 *
 * Read from the platform rather than written down, and that is not caution: `my-MM` resolves to
 * `latn` in chromium 149 and to `mymr` in firefox 151 and webkit 26.5 — measured — so a table of
 * digits per locale would be wrong in one engine of three whichever way it was filled in.
 *
 * @since next
 */
export function pctDigitsOf(
  locale: string,
  numberingSystem: string,
): readonly string[] | null {
  if (numberingSystem === 'latn') return null;
  let written: string;
  try {
    written = new Intl.NumberFormat(locale, {
      numberingSystem,
      useGrouping: false,
    }).format(1234567890);
  } catch {
    return null;
  }
  const glyphs = Array.from(written);
  // A numbering system that is not decimal-positional (an algorithmic one) writes this
  // number as something other than ten glyphs; there is then nothing to map back and the
  // ASCII digits are the whole of what a user can type.
  if (glyphs.length !== 10) return null;
  const digits = [glyphs[9], ...glyphs.slice(0, 9)];
  return new Set(digits).size === 10 ? digits : null;
}

/**
 * A counter in a named numbering system, at least `minimumIntegerDigits` wide — the bare number a
 * grid cell or a column row holds, in the digits of the field beside it. The system is asked for
 * by name, and a platform that will not take it is not an error worth throwing over: the ASCII
 * digits are then what the number is written in, which is what the field falls back to as well.
 *
 * @since next
 */
export function pctNumberFormat(
  locale: string,
  numberingSystem: string,
  minimumIntegerDigits = 1,
): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, {
      numberingSystem,
      useGrouping: false,
      minimumIntegerDigits,
    });
  } catch {
    return new Intl.NumberFormat(locale, {
      useGrouping: false,
      minimumIntegerDigits,
    });
  }
}

/**
 * A decimal digit that is not an ASCII one — what is left of a text once the locale's own digits
 * have been written back, if it holds a digit of another numbering system.
 */
const FOREIGN_DIGIT = /(?![0-9])\p{Nd}/u;

/**
 * Text with a locale's own digits written back as the ASCII ones and nothing else touched —
 * `digits` is what {@link pctDigitsOf} answered, and `null` means there is nothing to translate.
 *
 * **`null` where a digit of another numbering system is left over.** A parser that splits on
 * runs of ASCII digits reads any other character as a separator, a digit included: `۱٣:۳۰` in a
 * Persian field — a Persian one and an Arabic-Indic three, which look alike — read as `01:30`,
 * and `1２:05` typed with a Japanese input method on read as `01:05`. Refused here, once, the
 * text is reported as not a value instead of being read as the wrong one.
 *
 * Nothing else is removed. A strip of the bidi marks that once stood beside this went because a
 * control proved it dead: `ar-EG` writes its date separator as `U+200F /`, and every character
 * that is not a digit already separates.
 *
 * @since next
 */
export function pctToLatinDigits(
  text: string,
  digits: readonly string[] | null,
): string | null {
  const latin =
    digits === null
      ? text
      : Array.from(text, (character) => {
          const value = digits.indexOf(character);
          return value === -1 ? character : String(value);
        }).join('');
  return FOREIGN_DIGIT.test(latin) ? null : latin;
}
