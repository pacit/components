// P5 — does the template compiler infer a mark's T from [data] and hold x/y to keys of T whose
// value is of the right type? Every line marked BAD must be an error and nothing else may be.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** The keys of T whose value is a V. */
export type PctKey<T, V> = { [K in keyof T]-?: T[K] extends V ? K : never }[keyof T];
export type PctAccessor<T, V> = PctKey<T, V> | ((row: T, index: number) => V);

@Component({ selector: 'p-line', changeDetection: ChangeDetectionStrategy.OnPush, template: '' })
export class PLine<T> {
  readonly data = input.required<readonly T[]>();
  readonly x = input<PctAccessor<T, number>>();
  readonly y = input<PctAccessor<T, number | null>>();
}

interface Reading { at: number; value: number | null; name: string }

@Component({
  selector: 'p-host',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PLine],
  template: `
    <p-line [data]="rows" x="at" y="value" />
    <p-line [data]="rows" [x]="'at'" [y]="valueOf" />
    <p-line [data]="pairs" [x]="first" [y]="second" />
    <p-line [data]="rows" x="nope" y="value" />
    <p-line [data]="rows" x="at" y="name" />
    <p-line [data]="rows" [x]="'value'" y="value" />
    <p-line [data]="rows" [y]="nameOf" />
  `,
})
export class PHost {
  readonly rows: readonly Reading[] = [];
  readonly pairs: readonly (readonly [number, number | null])[] = [];
  readonly valueOf = (r: Reading) => r.value;
  readonly nameOf = (r: Reading) => r.name;
  readonly first = (p: readonly [number, number | null]) => p[0];
  readonly second = (p: readonly [number, number | null]) => p[1];
}
// lines 4–7 of the template are BAD: an unknown key; a string column as y; a nullable column
// as x; an accessor returning a string.
