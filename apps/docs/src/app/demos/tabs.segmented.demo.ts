import { Component, signal } from '@angular/core';
import { PctTab, PctTabs } from '@pacit/components/tabs';

/**
 * A segmented switch
 *
 * `variant="segmented"` swaps the rail for a recessed track and raises the chosen tab out
 * of it. This page's own Preview / Code control is this one input — before the variant
 * existed it took a dozen token overrides to undo the rail plus two rules reaching through
 * the parts, because the track and the chosen fill had no token to set.
 */
@Component({
  selector: 'demo-tabs-segmented',
  imports: [PctTab, PctTabs],
  template: `
    <pct-tabs variant="segmented" [(value)]="period" ariaLabel="Period">
      <pct-tab value="day" label="Day">
        <p>Today, hour by hour.</p>
      </pct-tab>
      <pct-tab value="week" label="Week">
        <p>Seven days side by side.</p>
      </pct-tab>
      <pct-tab value="month" label="Month">
        <p>The month on one grid.</p>
      </pct-tab>
    </pct-tabs>
  `,
})
export class TabsSegmentedDemo {
  readonly period = signal('week');
}
