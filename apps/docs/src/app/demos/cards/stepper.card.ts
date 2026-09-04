import { Component } from '@angular/core';
import { PctStep, PctStepper } from '@pacit/components/stepper';

/**
 * Done, current, upcoming — the three states the row computes from its one number, in the
 * shortest journey that is still a journey. The demo's fourth step and its Back/Next go:
 * the buttons are the demo's driver and not the component, and what fits the card chooses
 * the length of the map (0061). Nothing here is faked — the check, the filled marker and
 * the muted one are the component's own drawings under `[step]="2"`.
 */
@Component({
  selector: 'demo-stepper-card',
  imports: [PctStep, PctStepper],
  // The stage centres a `max-content` scene and crops what overflows, so the row has to be
  // narrower than 272px at its natural width — and three steps at the default 24px
  // connector measure 286px (chromium, Inter var at 16px): the card would lose "Ship", or
  // the map would wrap into the two lines 0055 refuses to fold on its own. The connector's
  // length is the one token the component offers for this ("layout is what a skin may want
  // to stretch"), so it takes the row's own gap and the strip measures 246px.
  styles: `
    :host {
      display: block;
    }
    pct-stepper {
      --pct-stepper-track-size: var(--pct-space-3);
    }
  `,
  template: `
    <pct-stepper [step]="2" ariaLabel="Checkout">
      <pct-step>Cart</pct-step>
      <pct-step>Pay</pct-step>
      <pct-step>Ship</pct-step>
    </pct-stepper>
  `,
})
export class StepperCardScene {}
