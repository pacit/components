import { Component, signal } from '@angular/core';
import { PctSwitch } from '@pacit/components/switch';

/**
 * On, off, and out of reach
 *
 * A switch takes effect at once — there is no Save behind it — so a disabled one says
 * "this setting is not yours here" rather than "fill this in later".
 */
@Component({
  selector: 'demo-switch-states',
  imports: [PctSwitch],
  styles: ':host { display: grid; gap: 12px; }',
  template: `
    <pct-switch
      label="Notifications"
      hint="A sound and a badge"
      [(checked)]="sound"
    />
    <pct-switch
      label="Two-factor sign-in"
      hint="Managed by your organisation"
      [checked]="true"
      disabled
    />
    <pct-switch label="Location" [checked]="false" readonly />
  `,
})
export class SwitchStatesDemo {
  readonly sound = signal(true);
}
