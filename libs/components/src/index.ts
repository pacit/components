// Primary entrypoint (@pacit/components) — deliberately minimal (req-project-tree-shaking).
// Components are imported through the secondary entrypoints, e.g. @pacit/components/button.
export {
  providePctConfig,
  providePctTexts,
  PCT_CONFIG,
  PCT_DEFAULT_CONFIG,
  PCT_DEFAULT_TEXTS,
  PCT_TEXTS,
} from '@pacit/components/core';
export type { PctConfig, PctSize, PctTexts } from '@pacit/components/core';

/**
 * The library version. The constant is **generated** from `version` in `package.json` by
 * `nx stamp-version components` and never written by hand; see `stamp-version.mjs` for why the
 * value stands in two places and which gate keeps them equal.
 */
export { PCT_VERSION } from './version';
