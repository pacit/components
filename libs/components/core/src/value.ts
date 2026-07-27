/**
 * Porównanie dwóch wartości kontrolki wyboru. Kontrolki nie mogą użyć wprost
 * `===`, bo ich wartość nie musi być prymitywem: aplikacja wiąże obiekt encji,
 * a ten po przejściu przez HTTP jest **inną instancją** o tej samej tożsamości.
 * Wtedy porównuje się klucz (`(a, b) => a.id === b.id`), nie referencję.
 *
 * @example
 * <pct-select [options]="miasta" [compareWith]="poId" [(value)]="miasto" />
 * // protected poId = (a: Miasto, b: Miasto) => a.id === b.id;
 */
export type PctCompareWith<T> = (a: T, b: T) => boolean;

/**
 * Domyślne porównanie: tożsamość. Dla prymitywów zachowuje się jak `===`,
 * a dodatkowo uznaje `NaN` za równe samemu sobie — inaczej opcja o wartości
 * `NaN` nigdy nie byłaby zaznaczona.
 *
 * Sygnatura na `unknown` jest celowa: dzięki kontrawariancji parametrów ta sama
 * funkcja pasuje jako domyślna do `PctCompareWith<T>` dla dowolnego `T`.
 */
export const pctSameValue: PctCompareWith<unknown> = Object.is;
