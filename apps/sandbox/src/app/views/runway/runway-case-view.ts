import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PctWheelC } from '@pacit/components/wheel-c';
import { PctWheelK } from '@pacit/components/wheel-k';
import { PctWheelW } from '@pacit/components/wheel-w';

/**
 * PROBE for 0091 — one windowed listbox per view, for the act a reader performs on it:
 * `End` from the first row, `Home` from the last, a typed digit from the first. The row
 * the key wants is not in the tree before the key. The route names the case.
 */
interface RunwayCase {
  readonly variant: 'w' | 'k' | 'c';
  readonly start: number;
  readonly label: string;
  readonly intro: string;
}

const CASES: Readonly<Record<string, RunwayCase>> = {
  'runway-end-c': {
    variant: 'c',
    start: 0,
    label: 'End on the copies',
    intro: 'Three copies, the outer ones hidden, on row 00; the act presses End.',
  },
  'runway-home-c': {
    variant: 'c',
    start: 59,
    label: 'Home on the copies',
    intro: 'Three copies, the outer ones hidden, on row 59; the act presses Home.',
  },
  'runway-digit-c': {
    variant: 'c',
    start: 0,
    label: 'A digit on the copies',
    intro: 'Three copies, the outer ones hidden, on row 00; the act types 3.',
  },
  'runway-end-w': {
    variant: 'w',
    start: 0,
    label: 'End on the own window',
    intro: 'The own window on row 00; the act presses End.',
  },
  'runway-home-w': {
    variant: 'w',
    start: 59,
    label: 'Home on the own window',
    intro: 'The own window on row 59; the act presses Home.',
  },
  'runway-digit-w': {
    variant: 'w',
    start: 0,
    label: 'A digit on the own window',
    intro: 'The own window on row 00; the act types 3.',
  },
  'runway-end-k': {
    variant: 'k',
    start: 0,
    label: 'End on the CDK window',
    intro: 'The CDK viewport on row 00; the act presses End.',
  },
  'runway-home-k': {
    variant: 'k',
    start: 59,
    label: 'Home on the CDK window',
    intro: 'The CDK viewport on row 59; the act presses Home.',
  },
  'runway-digit-k': {
    variant: 'k',
    start: 0,
    label: 'A digit on the CDK window',
    intro: 'The CDK viewport on row 00; the act types 3.',
  },
};

@Component({
  selector: 'sbx-runway-case-view',
  imports: [PctWheelC, PctWheelK, PctWheelW],
  template: `
    <h2 class="view__title">{{ c.label }}</h2>
    <p class="muted view__intro">{{ c.intro }}</p>
    @switch (c.variant) {
      @case ('w') {
        <pct-wheel-w [label]="c.label" [start]="c.start" data-testid="case" />
      }
      @case ('c') {
        <pct-wheel-c [label]="c.label" [start]="c.start" data-testid="case" />
      }
      @default {
        <pct-wheel-k [label]="c.label" [start]="c.start" data-testid="case" />
      }
    }
  `,
})
export class RunwayCaseView {
  protected readonly c: RunwayCase =
    CASES[inject(ActivatedRoute).snapshot.url[0]?.path ?? ''] ??
    CASES['runway-end-w'];
}
