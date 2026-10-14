import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PctWheelK } from '@pacit/components/wheel-k';
import { PctWheelW } from '@pacit/components/wheel-w';

/**
 * PROBE for 0091 — one windowed listbox per view, for the act a reader performs on it:
 * `End` from the first row, `Home` from the last, a typed digit from the first. The row
 * the key wants is not in the tree before the key. The route names the case.
 */
interface RunwayCase {
  readonly variant: 'w' | 'k';
  readonly start: number;
  readonly label: string;
  readonly intro: string;
}

const CASES: Readonly<Record<string, RunwayCase>> = {
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
  imports: [PctWheelK, PctWheelW],
  template: `
    <h2 class="view__title">{{ c.label }}</h2>
    <p class="muted view__intro">{{ c.intro }}</p>
    @if (c.variant === 'w') {
      <pct-wheel-w [label]="c.label" [start]="c.start" data-testid="case" />
    } @else {
      <pct-wheel-k [label]="c.label" [start]="c.start" data-testid="case" />
    }
  `,
})
export class RunwayCaseView {
  protected readonly c: RunwayCase =
    CASES[inject(ActivatedRoute).snapshot.url[0]?.path ?? ''] ??
    CASES['runway-end-w'];
}
