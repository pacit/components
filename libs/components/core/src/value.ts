/**
 * Comparison of two values of a choice control. Controls cannot use `===` outright, because
 * their value need not be a primitive: an application binds an entity object, and that object
 * after a round trip through HTTP is **another instance** with the same identity. The key is
 * then what gets compared (`(a, b) => a.id === b.id`), not the reference.
 *
 * @example
 * <pct-select [options]="cities" [compareWith]="byId" [(value)]="city" />
 * // protected byId = (a: City, b: City) => a.id === b.id;
 *
 * @since 0.1.0
 */
export type PctCompareWith<T> = (a: T, b: T) => boolean;

/**
 * The default comparison: identity. For primitives it behaves like `===`, and on top of that
 * it treats `NaN` as equal to itself — otherwise an option valued `NaN` would never be marked
 * as selected.
 *
 * The `unknown` signature is deliberate: thanks to parameter contravariance the same function
 * fits as the default for `PctCompareWith<T>` for any `T`.
 *
 * @since 0.1.0
 */
export const pctSameValue: PctCompareWith<unknown> = Object.is;
