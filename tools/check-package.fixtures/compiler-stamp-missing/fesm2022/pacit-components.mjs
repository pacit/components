/*
 * The same bundle with the compiler's stamp gone — the shape of the output changed and
 * the pair `minVersion`/`version` that Angular's partial compilation writes into every
 * declaration is nowhere in the code. Everything else about the package is correct, so
 * the run would be green while the rule reading peer ranges against the compiler has
 * nothing left to compare. It is an error for the reason a missing PCT_VERSION is one
 * (point 4): a check that stopped measuring passes.
 */
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';

const PCT_VERSION = '0.0.1';

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export { Control, PCT_VERSION, createOverlayRef, signal, styles };
