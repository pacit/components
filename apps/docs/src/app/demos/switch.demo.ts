import { Component, signal } from '@angular/core';
import { PctSwitch } from '@pacit/components/switch';

/** On or off, effective immediately — that immediacy is what separates it from a checkbox. */
@Component({
  selector: 'demo-switch',
  imports: [PctSwitch],
  template: `
    <pct-switch
      label="Wi-Fi"
      hint="Turns off when you leave the house"
      [(checked)]="wifi"
    />
  `,
})
export class SwitchDemo {
  readonly wifi = signal(true);
}
