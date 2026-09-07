import { InjectionToken, Signal } from '@angular/core';

/** A place on the page a keyboard can be sent to, with the element that is that place. */
export interface PctRegion {
  readonly element: HTMLElement;
  /**
   * What a reader hears on arrival, when the element does not name itself — a SIGNAL and not a
   * string, because a directive's inputs are not set when its constructor runs and a label
   * captured there would be the default for the life of the page.
   */
  readonly label: Signal<string>;
}

/**
 * What a component of this library may ask of the region cycle, and the whole of it.
 *
 * The MECHANISM lives in `@pacit/components/regions`; this is the shape and the channel, and
 * they are here for a reason measured in bytes. A service class with `providedIn: 'root'`
 * compiles to a static initialiser calling an imported function, which no bundler may treat as
 * pure — so a cycle declared in `./core` is a cycle every entrypoint carries, used or not. It
 * measured **+19111 B over the package** ([`lesson-181`](../../../../docs/lessons.md#lesson-181),
 * `lesson-173` in its fourth disguise). A token with a `null` factory is a few bytes and asks
 * nothing of anyone.
 */
export interface PctRegionsApi {
  readonly regions: Signal<readonly PctRegion[]>;
  /** The key a consumer chose, or `null` while nobody has. */
  readonly key: Signal<string | null>;
  /** Declares that key. Written by `[pctRegionKey]` and read by anything that stands outside it. */
  useKey(key: string): void;
  register(region: PctRegion): () => void;
  next(from: Element | null): boolean;
}

/**
 * The region cycle, when an application has installed one — and `null` when it has not.
 *
 * A component that can stand outside the reading order (the toast's stack is the one this was
 * built for) registers itself here if anybody is listening. Nothing is provided by default:
 * with no `providePctRegions()` in an application, this resolves to `null`, the component does
 * nothing, and the mechanism costs the consumer a token
 * ([0072](../../../../docs/decisions/0072-a-region-key-is-the-consumers-to-install.md)).
 */
export const PCT_REGIONS = new InjectionToken<PctRegionsApi | null>(
  'PCT_REGIONS',
  { providedIn: 'root', factory: () => null },
);
