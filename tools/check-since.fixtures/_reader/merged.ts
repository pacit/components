// A name TypeScript lets SEVERAL declarations carry: a class merged with an interface, and
// an overload set above its implementation. A consumer imports each name once, so each is
// one item, and the tag counts wherever it was written — on the first of them, as usual, or
// on a later one, as the last two names here are.
import { input } from '@angular/core';

/** @since 0.1.0 */
export class PctMerged {
  /** @since 0.1.0 */
  readonly tone = input<string>('flat');

  /** @since 0.1.0 */
  reset(): void {}
}

export interface PctMerged {
  extra?: string;
}

/** @since 0.1.0 */
export function pctFmt(value: string): string;
/** @deprecated since 0.1.0, gone in 0.3.0 — the shipped name is `pctFormat`. */
export function pctFmt(value: number): string;
export function pctFmt(value: unknown): string {
  return String(value);
}

// The tag on the SECOND declaration of a name, which is where a maintainer sometimes puts it
// and where the reader has to find it — the item is the name, not one of its declarations.
export function pctTrim(value: string): string;
/** @since next */
export function pctTrim(value: string, max: number): string;
export function pctTrim(value: string, max = 0): string {
  return max ? value.slice(0, max) : value;
}
