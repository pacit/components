/*
 * The bundle imports `@angular/platform-browser/animations` — `provideAnimations()` and
 * the module beside it. Nothing declares it, and that is the point: the rule that reads
 * undeclared imports would answer first, and its answer — declare it — is the road the
 * ban exists to close. The package name here is `@angular/platform-browser`, so a ban
 * written on names rather than on specifiers would not see this file at all.
 */
import * as i0 from '@angular/core';
import { signal } from '@angular/core';
import { Control } from '@angular/forms/signals';
import { createOverlayRef } from '@angular/cdk/overlay';
import { NgTemplateOutlet } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations';

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
    host: { properties: { 'attr.data-pct-part': '"control"' } },
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
  provideAnimations,
  signal,
  styles,
};
