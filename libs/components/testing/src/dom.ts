import type { ComponentFixture } from '@angular/core/testing';

/**
 * DOM helpers for a plain fixture — the road for a test that does not run the CDK's harness
 * environment. Published from `@pacit/components/testing` beside the harnesses, and imported
 * by tests alone: the entrypoint is not part of an application bundle.
 *
 * They return a non-nullable element and throw with a description when there is none. Tests
 * then need no `!` (the `@typescript-eslint/no-non-null-assertion` rule), and a failed query
 * says what was looked for and what was available — instead of "Cannot read properties of
 * null".
 */

/** A fixture or any node — a CDK panel renders outside the host tree. */
type Root = ComponentFixture<unknown> | ParentNode;

const nodeOf = (root: Root): ParentNode =>
  'nativeElement' in root ? (root.nativeElement as ParentNode) : root;

const partsIn = (node: ParentNode): string =>
  Array.from(node.querySelectorAll('[data-pct-part]'))
    .map((el) => el.getAttribute('data-pct-part'))
    .join(', ') || '(none)';

/**
 * The element of a `data-pct-part`; throws when it is absent.
 *
 * @since 0.1.0
 */
export function part(root: Root, name: string): HTMLElement {
  const node = nodeOf(root);
  const el = node.querySelector<HTMLElement>(`[data-pct-part="${name}"]`);
  if (!el) {
    throw new Error(
      `No part [data-pct-part="${name}"]. Parts available: ${partsIn(node)}.`,
    );
  }
  return el;
}

/**
 * Every element of a given part — an empty collection is a valid result.
 *
 * @since 0.1.0
 */
export function allParts(root: Root, name: string): HTMLElement[] {
  return Array.from(
    nodeOf(root).querySelectorAll<HTMLElement>(`[data-pct-part="${name}"]`),
  );
}

/**
 * The first element matching a selector; throws when there is none.
 *
 * @since 0.1.0
 */
export function query<E extends Element = HTMLElement>(
  root: Root,
  selector: string,
): E {
  const el = nodeOf(root).querySelector<E>(selector);
  if (!el) {
    throw new Error(`No element matching the selector "${selector}".`);
  }
  return el;
}
