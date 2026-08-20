/*
 * The same pair of bindings, written in the decorator's `host` rather than in the
 * template. Angular's partial declaration carries them as `properties` and `listeners`
 * with `@`-prefixed keys, so a rule that reads templates alone passes this file — and
 * the component is the one that ships an enter/leave transition on its own element,
 * which is exactly where a panel or a dialog would put it.
 */
import * as i0 from '@angular/core';
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';

const PCT_VERSION = '0.0.1';

/*
 * What Angular's partial compilation leaves behind: the version of the compiler that
 * produced the file beside the minimum the output needs, and the component's template
 * as text. Point 7 reads the peer ranges against the stamp — a package built by one
 * major and declaring another is a lie a consumer discovers in their own application.
 * Point 8 reads the template, where an animation binding would be visible as text and
 * as nothing else; the `@if` in it is the shape that must NOT be read as one.
 */
class PctControl {
  static ɵcmp = i0.ɵɵngDeclareComponent({
    minVersion: '14.0.0',
    version: '22.0.6',
    type: PctControl,
    isStandalone: true,
    selector: 'pct-control',
    host: {
      properties: { 'attr.data-pct-part': '"control"', '@panel': 'state()' },
      listeners: { '@panel.done': 'settled()' },
    },
    ngImport: i0,
    template:
      '@if (label()) { <span data-pct-part="label">{{ label() }}</span> }',
    isInline: true,
  });
}

const styles =
  ':host{background:var(--pct-color-surface);color:var(--pct-color-text)}';

export {
  Control,
  NgTemplateOutlet,
  PCT_VERSION,
  PctControl,
  createOverlayRef,
  signal,
  styles,
};
