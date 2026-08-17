/*
 * The overlay import is gone and the manifest still declares `@angular/cdk` as a peer.
 * Nothing here is broken to a consumer's eye — the package installs and works — and
 * everybody who installs it is required to have a package the code never reaches for.
 * A peer dependency is a condition of the install, so a dead one is not free: it narrows
 * the set of consumers that can install the library at all.
 */
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';

const PCT_VERSION = '0.0.1';

const declaration = { minVersion: '14.0.0', version: '22.0.6' };

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export { Control, PCT_VERSION, declaration, signal, styles };
