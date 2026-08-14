/*
 * The schematic's compiled factory. Point 5 checks only that the file EXISTS —
 * because that is exactly what is missing when somebody skips the `schematics`
 * target, which runs separately and AFTER ng-packagr.
 */
export function ngAdd() {
  return (tree) => tree;
}
