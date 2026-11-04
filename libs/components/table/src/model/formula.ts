/** The signs a sheet starts a formula with: `=`, `+`, `-`, `@`, and a tab or a CR before one. */
const FORMULA = /^[=+\-@\t\r]/;

/**
 * A text as a sheet should take it: after an apostrophe where the sheet would run it as a
 * formula — CSV injection — which the sheet shows as nothing. A number is never one: its text is
 * the table's own, a minus included, so the caller writes it as it is.
 */
export function pctSheetText(text: string): string {
  return FORMULA.test(text) ? `'${text}` : text;
}

/** A text read back from a sheet's: the apostrophe {@link pctSheetText} put before a sign left out. */
export function pctTextOfSheet(text: string): string {
  return text.startsWith("'") && FORMULA.test(text.slice(1))
    ? text.slice(1)
    : text;
}
