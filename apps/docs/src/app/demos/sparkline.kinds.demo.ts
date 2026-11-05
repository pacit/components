import { Component } from '@angular/core';
import { PctSparkline } from '@pacit/components/sparkline';

/**
 * A balance as bars, a heater as a band
 *
 * Bars rise from nought, so a day the house gave back to the grid hangs below the line; the
 * lowest and the highest day stand as dots. A band draws a state that is on or off — a value
 * of a half or more is on — and says the last one in words.
 */
@Component({
  selector: 'demo-sparkline-kinds',
  imports: [PctSparkline],
  styles: `
    :host {
      display: grid;
      grid-template-columns: max-content max-content;
      gap: 12px 16px;
      align-items: center;
    }
  `,
  template: `
    <span id="demo-spark-balance">Balance, last 7 days</span>
    <pct-sparkline
      [data]="balance"
      kind="bars"
      unit="kWh"
      locale="en-GB"
      extremes
      ariaLabelledby="demo-spark-balance"
    />
    <span id="demo-spark-heater">Heater, last 10 hours</span>
    <pct-sparkline
      [data]="heater"
      kind="band"
      ariaLabelledby="demo-spark-heater"
    />
  `,
})
export class SparklineKindsDemo {
  protected readonly balance = [4, 2, -1, 3, -2, 5, 1];
  protected readonly heater = [0, 1, 1, 0, 1, 1, 1, 0, 0, 1];
}
