import { Component, signal } from '@angular/core';
import { PctTab, PctTabs } from '@pacit/components/tabs';

/**
 * A strip down the side
 *
 * `orientation="vertical"` puts the strip beside its panel rather than above it: a column of
 * labels on one side, the chosen section on the other. The arrows that walk it become Up and
 * Down, and the chosen tab's edge moves to the inline side of the strip. Every distance is
 * logical, so in a right-to-left document the strip moves to the right and the panel to the
 * left with nothing to set.
 */
@Component({
  selector: 'demo-tabs-vertical',
  imports: [PctTab, PctTabs],
  styles: ':host { display: block; max-inline-size: 32rem; }',
  template: `
    <pct-tabs [(value)]="section" orientation="vertical" ariaLabel="Project">
      <pct-tab value="overview" label="Overview">
        <p>What the project is, in one paragraph.</p>
      </pct-tab>
      <pct-tab value="members" label="Members">
        <p>Who can read it and who can write to it.</p>
      </pct-tab>
      <pct-tab value="danger" label="Danger zone">
        <p>Archiving and deleting live here, behind a second confirmation.</p>
      </pct-tab>
    </pct-tabs>
  `,
})
export class TabsVerticalDemo {
  readonly section = signal('overview');
}
