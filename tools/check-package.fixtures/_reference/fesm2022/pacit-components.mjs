/*
 * The package's code in miniature. The gate reads four things out of it: the
 * PCT_VERSION constant (point 4), the uses of `var(--pct-*)` in the style's
 * text (point 3), the imports and the compiler's stamp (point 7). The style is
 * a string here on purpose — in a real artefact component styles sit in the
 * bundle in exactly that form.
 */
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';

const PCT_VERSION = '0.0.1';

/*
 * What Angular's partial compilation leaves in every declaration: the version of
 * the compiler that produced the file, beside the minimum the output needs. Point
 * 7 reads the peer ranges against it — a package built by one major and declaring
 * another is a lie a consumer discovers in their own application.
 */
const declaration = { minVersion: '14.0.0', version: '22.0.6' };

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export { Control, PCT_VERSION, createOverlayRef, declaration, signal, styles };
