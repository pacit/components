/*
 * The package's code in miniature. The gate reads two things out of it: the
 * PCT_VERSION constant (point 4) and the uses of `var(--pct-*)` in the style's
 * text (point 3). The style is a string here on purpose — in a real artefact
 * component styles sit in the bundle in exactly that form.
 */
const PCT_VERSION = '0.0.1';

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export { PCT_VERSION, styles };
