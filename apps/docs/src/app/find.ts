import type { DocsCard } from '../generated/content';

/**
 * The one rule this catalogue is filtered by, written once because it is now read twice:
 * `docs-index` in the component page's left rail and in the shell's drawer, and the gallery
 * at `/components` (site.md "The gallery, drawn in words"). Two copies of a match rule are
 * two lists that answer the same typing differently — and the whole argument for putting a
 * finder on the gallery was that it is the finder the site already ships.
 *
 * What it matches is what a reader has to type anyway: the id that is in the URL (`date`,
 * `toast`) and the class name that is in their own template (`PctDate`). Not the summary —
 * a sentence match turns "field" into half the catalogue and leaves nobody able to say why.
 */
export function answersTo(card: DocsCard, needle: string): boolean {
  return (
    !needle ||
    card.id.includes(needle) ||
    card.classes.some((name) => name.toLowerCase().includes(needle))
  );
}

/** The typed string as the rule above expects it: trimmed, folded, empty when it is blank. */
export function asNeedle(typed: string): string {
  return typed.trim().toLowerCase();
}
