import type { ComponentFixture } from '@angular/core/testing';

/**
 * Pomocniki DOM dla testów jednostkowych. Wyłącznie na potrzeby testów —
 * katalog `testing/` nie jest wymieniony w `tsconfig.lib.json` ani nie ma
 * własnego `ng-package.json`, więc nie trafia do publikowanego pakietu.
 *
 * Zwracają element nie-nullowalny i rzucają z opisem, gdy go brak. Dzięki temu
 * testy nie potrzebują `!` (wym-ws: `@typescript-eslint/no-non-null-assertion`),
 * a nieudane zapytanie mówi, czego szukano i co było dostępne — zamiast
 * „Cannot read properties of null".
 */

/** Fixture albo dowolny węzeł — panel CDK renderuje się poza drzewem hosta. */
type Root = ComponentFixture<unknown> | ParentNode;

const nodeOf = (root: Root): ParentNode =>
  'nativeElement' in root ? (root.nativeElement as ParentNode) : root;

const partsIn = (node: ParentNode): string =>
  Array.from(node.querySelectorAll('[data-pct-part]'))
    .map((el) => el.getAttribute('data-pct-part'))
    .join(', ') || '(żadne)';

/** Element części `data-pct-part`; rzuca, gdy go nie ma. */
export function part(root: Root, name: string): HTMLElement {
  const node = nodeOf(root);
  const el = node.querySelector<HTMLElement>(`[data-pct-part="${name}"]`);
  if (!el) {
    throw new Error(
      `Brak części [data-pct-part="${name}"]. Dostępne części: ${partsIn(node)}.`,
    );
  }
  return el;
}

/** Wszystkie elementy danej części — pusta kolekcja jest poprawnym wynikiem. */
export function allParts(root: Root, name: string): HTMLElement[] {
  return Array.from(
    nodeOf(root).querySelectorAll<HTMLElement>(`[data-pct-part="${name}"]`),
  );
}

/** Pierwszy element pasujący do selektora; rzuca, gdy go nie ma. */
export function query<E extends Element = HTMLElement>(
  root: Root,
  selector: string,
): E {
  const el = nodeOf(root).querySelector<E>(selector);
  if (!el) {
    throw new Error(`Brak elementu pasującego do selektora "${selector}".`);
  }
  return el;
}
