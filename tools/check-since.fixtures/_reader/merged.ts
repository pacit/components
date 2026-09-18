// A name TypeScript lets SEVERAL declarations carry: a class merged with an interface, and
// an overload set above its implementation. A consumer imports each name once, so each is
// one item — and the tag is on the declaration written first, where a maintainer puts it.
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

/**
 * @since 0.1.0
 * @deprecated since 0.1.0, gone in 0.3.0 — the shipped name is `pctFormat`.
 */
export function pctFmt(value: string): string;
export function pctFmt(value: number): string;
export function pctFmt(value: unknown): string {
  return String(value);
}
