import { Component, signal } from '@angular/core';
import { PctTab, PctTabs } from '@pacit/components/tabs';

/**
 * Manual activation
 *
 * By default the arrows choose as they move. With `activation="manual"` they only move the
 * focus, and Enter or Space makes the choice — the APG's own second mode, for panels that
 * are expensive to show.
 */
@Component({
  selector: 'demo-tabs-manual',
  imports: [PctTab, PctTabs],
  styles: ':host { display: block; }',
  template: `
    <pct-tabs [(value)]="report" activation="manual" ariaLabel="Reports">
      <pct-tab value="daily" label="Daily">
        <p>Yesterday, hour by hour.</p>
      </pct-tab>
      <pct-tab value="weekly" label="Weekly">
        <p>The last seven days, day by day.</p>
      </pct-tab>
      <pct-tab value="yearly" label="Yearly">
        <p>Twelve months on one line.</p>
      </pct-tab>
    </pct-tabs>
  `,
})
export class TabsManualDemo {
  readonly report = signal('daily');
}
