// A name TypeScript lets SEVERAL declarations carry: a class merged with an interface, and
// an overload set above its implementation. A consumer imports each name once, so each is
// one item, and the tag counts wherever it was written — on the first of them, as usual, or
// on a later one, as three of the names here do. The last name is dated TWICE, which is the
// case plan 4.75 is about: the first date wins, and the second is not shown anywhere.
import { input } from '@angular/core';

/** @since 0.1.0 */
export class PctMerged {
  /** @since 0.1.0 */
  readonly tone = input<string>('flat');

  /** @since 0.1.0 */
  reset(): void {}

  // An overloaded METHOD, which is where `methodsIn` merges: the first signature carries
  // neither tag, the second the date and the third the deprecation, so a reader that stops
  // merging loses one or the other whichever half it drops.
  tune(value: number): void;
  /** @since 0.1.0 */
  tune(value: string): void;
  /** @deprecated since 0.1.0, gone in 0.3.0 — the value is a string now. */
  tune(value: boolean): void;
  tune(value: unknown): void {
    void value;
  }

  // Dated on BOTH signatures, and the first date is the one the item carries — the same
  // hazard as `pctJoin` below, one declaration kind further in.
  /** @since 0.1.0 */
  blend(value: string): string;
  /** @since next */
  blend(value: string, other: string): string;
  blend(value: string, other = ''): string {
    return value + other;
  }
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

// Dated twice, which one item cannot say: the first date wins and the `next` signature is
// invisible — the hazard plan 4.75 carries, kept here so the reading cannot change unnoticed.
/** @since 0.1.0 */
export function pctJoin(value: string): string;
/** @since next */
export function pctJoin(value: string, separator: string): string;
export function pctJoin(value: string, separator = ''): string {
  return separator ? value + separator : value;
}
