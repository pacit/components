import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctStep, PctStepper } from '@pacit/components/stepper';

/**
 * A journey the application steers
 *
 * The stepper is a map, not a wizard: `step` is one-indexed and the application moves it.
 * Nothing here is clickable on purpose — a step you could jump to would be navigation, and
 * that belongs to the page's own links.
 */
@Component({
  selector: 'demo-stepper-steered',
  imports: [PctButton, PctStep, PctStepper],
  styles: ':host { display: grid; gap: 16px; }',
  template: `
    <pct-stepper [step]="step()" ariaLabel="Onboarding">
      <pct-step>Account</pct-step>
      <pct-step>Workspace</pct-step>
      <pct-step>Invite</pct-step>
    </pct-stepper>
    <div style="display: flex; gap: 8px">
      <button
        pctButton
        variant="outline"
        size="sm"
        [disabled]="step() <= 1"
        (click)="step.update((s) => s - 1)"
      >
        Back
      </button>
      <button
        pctButton
        size="sm"
        [disabled]="step() >= 3"
        (click)="step.update((s) => s + 1)"
      >
        Next
      </button>
    </div>
  `,
})
export class StepperSteeredDemo {
  readonly step = signal(2);
}
