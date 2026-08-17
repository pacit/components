/*
 * The code imports `rxjs` and no dependency list of the manifest mentions it. In the
 * workspace it resolves — the package sits beside a node_modules that has everything —
 * and at the consumer's nothing brings it, so the import fails on the first render.
 * This is the shape a reflex dependency really has: `npm i` writes the name into the
 * ROOT manifest and the import into a source file, and the library's own manifest,
 * the only thing a check of the declared list would read, never learns of it.
 */
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { debounceTime } from 'rxjs';

const PCT_VERSION = '0.0.1';

const declaration = { minVersion: '14.0.0', version: '22.0.6' };

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export {
  Control,
  PCT_VERSION,
  createOverlayRef,
  debounceTime,
  declaration,
  signal,
  styles,
};
