// The same surface written with an export list. Nothing here carries the `export` keyword,
// and every name below still reaches a consumer — this is the file the gate went blind to.
// `PctListed` is merged with an interface as well: two declarations, one exported name.
import { input } from '@angular/core';

/** @since 0.1.0 */
class PctListed {
  /** @since 0.1.0 */
  readonly size = input<string>('md');

  /** @since 0.1.0 */
  close(): void {}
}

interface PctListed {
  extra?: string;
}

/** @since 0.1.0 */
class Renamed {
  /** @since next */
  toggle(): void {}
}

/** @since 0.1.0 */
type PctListedSize = 'sm' | 'md';

// Exported by nothing: its method ships nowhere, so the gate must not ask it for a date.
class Kept {
  peek(): void {}
}

export { PctListed, Renamed as PctRenamed };
export type { PctListedSize };
