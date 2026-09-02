import { Component, computed, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctStep, PctStepper } from '@pacit/components/stepper';

/** The application owns the journey and hands the map ONE number; the map draws the rest. */
@Component({
  selector: 'demo-stepper',
  imports: [PctButton, PctStep, PctStepper],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-stepper [step]="step()" ariaLabel="Checkout">
      <pct-step>Cart</pct-step>
      <pct-step>Delivery</pct-step>
      <pct-step>Payment</pct-step>
      <pct-step>Review</pct-step>
    </pct-stepper>
    <div>
      <button
        pctButton
        variant="ghost"
        size="sm"
        [disabled]="step() <= 1"
        (click)="move(-1)"
      >
        Back
      </button>
      <button
        pctButton
        variant="ghost"
        size="sm"
        [disabled]="atEnd()"
        (click)="move(1)"
      >
        Next
      </button>
    </div>
  `,
})
export class StepperDemo {
  readonly step = signal(2);
  readonly atEnd = computed(() => this.step() >= 4);

  move(by: number): void {
    this.step.update((at) => at + by);
  }
}
