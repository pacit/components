/**
 * The static attributes of a compiled definition, as `[name, value]` pairs, for every gate that
 * reads the built package: `check-parts` and `check-harness` for the parts, `check-texts` for the
 * strings a user reads. Each carried a copy and the copies parted: `check-parts` had learnt the
 * namespace marker and the case of a name, and the other two read up to the first number and
 * compared a name as written. Measured on 2026-10-18 through each gate's own read: after
 * `[0, 'xlink', 'href', '#a']`, `check-harness` found no part and `check-texts` no attribute, and
 * `DATA-PCT-PART` was no part to `check-harness`.
 */

/**
 * `consts` carries every element's STATIC attributes, and `hostAttrs` the host's, as a flat array
 * in which a number opens a section with a different meaning (classes, styles, bindings). So the
 * read takes only the prefix before such a number — beyond it stand names without values. The one
 * marker that does not end it is `0`, a namespaced attribute: it takes three slots (the prefix,
 * the name, the value) and ordinary pairs go on after it, as Angular's `setUpAttributes` reads
 * them. `<use xlink:href="#a" data-pct-part="icon">` puts `[0, 'xlink', 'href', '#a',
 * 'data-pct-part', 'icon']` into `consts` (measured through ngc in partial mode and the linker).
 * The namespaced attribute itself is no pair here: no gate asks about one.
 *
 * A name stays as the definition writes it. `consts` and `hostAttrs` keep `'DATA-PCT-PART'` and
 * `'TITLE'` as written, and the DOM lowercases a name in `setAttribute` on an HTML element, so a
 * gate compares a name in any case. A slot that is no name is passed on as it stands: an
 * `@loading (after 100ms)` block puts `[null, 100]` into `consts`.
 */
const NAMESPACE_URI = 0;

export const staticAttributes = (attrs) => {
  const out = [];
  for (let i = 0; i < attrs.length; i += 2) {
    if (attrs[i] === NAMESPACE_URI) {
      i += 2;
      continue;
    }
    if (typeof attrs[i] === 'number') break;
    out.push([attrs[i], attrs[i + 1]]);
  }
  return out;
};

/** The values of one attribute among the static ones, its name in any case. */
export const valuesOf = (attrs, name) =>
  staticAttributes(attrs)
    .filter(([key]) => typeof key === 'string' && key.toLowerCase() === name)
    .map(([, value]) => value);
