// Primary entrypoint (@pacit/components) — celowo minimalny (wym-ws-5).
// Komponenty importuje się przez secondary entrypoints, np. @pacit/components/button.
export {
  providePctConfig,
  PCT_CONFIG,
  PCT_DEFAULT_CONFIG,
} from '@pacit/components/core';
export type { PctConfig, PctSize } from '@pacit/components/core';

export const PCT_VERSION = '0.0.1';
