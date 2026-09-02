import { Component, signal } from '@angular/core';
import { PctTab, PctTabs } from '@pacit/components/tabs';

/** A `pct-tab` IS the panel — the strip above is derived from what you declare below. */
@Component({
  selector: 'demo-tabs',
  imports: [PctTab, PctTabs],
  template: `
    <pct-tabs [(value)]="section" ariaLabel="Account settings">
      <pct-tab value="general" label="General">
        <p>Name, avatar, language.</p>
      </pct-tab>
      <pct-tab value="network" label="Network">
        <p>Proxies and timeouts.</p>
      </pct-tab>
      <pct-tab value="billing" label="Billing" disabled>
        <p>Invoices.</p>
      </pct-tab>
    </pct-tabs>
  `,
})
export class TabsDemo {
  readonly section = signal('general');
}
