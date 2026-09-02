import { Component, computed, signal } from '@angular/core';
import { PctStep, PctStepper } from '@pacit/components/stepper';
import { SbxDemo } from '../../ui/demo';

/**
 * Stepper: a map of a journey the application steers. What is worth watching: ONE number
 * drives the whole map (the two buttons move a signal, nothing else), the component
 * writes `aria-current="step"` from that number where the breadcrumb refused to write
 * `aria-current="page"` at all, and a done step is audible — the check is a drawing, the
 * word beside it is `texts().stepDone`.
 */
@Component({
  selector: 'sbx-stepper-view',
  imports: [SbxDemo, PctStepper, PctStep],
  templateUrl: './stepper-view.html',
  styleUrl: './stepper-view.scss',
})
export class StepperView {
  protected readonly step = signal(2);
  protected readonly atStart = computed(() => this.step() <= 1);
  protected readonly atEnd = computed(() => this.step() >= 4);

  protected move(by: number): void {
    this.step.update((step) => Math.min(4, Math.max(1, step + by)));
  }
}
