/*
 * A bundle with no component declaration in it at all: the compiler's stamp is here, the
 * imports are here, the style is here, and the class Angular's compilation leaves behind
 * is gone. Nothing about this package is animated — that is the case. Point 8 reads
 * bindings out of declarations, so a package where it finds none has been examined by
 * nothing, and a point that examines nothing answers green to every question anybody
 * asks it.
 */
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';

const PCT_VERSION = '0.0.1';

/*
 * The compiler's stamp, which point 7 reads the peer ranges against. In a real package it
 * sits inside the declaration below it; here there is no declaration, and the pair has to
 * stay for the earlier point to have its input.
 */
const declaration = { minVersion: '14.0.0', version: '22.0.6' };

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export {
  Control,
  NgTemplateOutlet,
  PCT_VERSION,
  createOverlayRef,
  declaration,
  signal,
  styles,
};
