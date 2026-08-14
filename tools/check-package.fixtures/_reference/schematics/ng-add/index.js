/*
 * Skompilowana fabryka schematica. Punkt 5 sprawdza wyłącznie to, że plik
 * ISTNIEJE — bo dokładnie tego brakuje, gdy ktoś pominie target `schematics`,
 * który biegnie osobno i już PO ng-packagr.
 */
export function ngAdd() {
  return (tree) => tree;
}
