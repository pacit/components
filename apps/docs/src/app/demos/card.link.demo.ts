import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  PctCard,
  PctCardControl,
  PctCardLink,
  PctCardTitle,
} from '@pacit/components/card';
import { PctSwitch } from '@pacit/components/switch';

/** A card that is one link: a press anywhere opens it, and the switch answers on its own. */
@Component({
  selector: 'demo-card-link',
  imports: [
    RouterLink,
    PctCard,
    PctCardTitle,
    PctCardLink,
    PctCardControl,
    PctSwitch,
  ],
  template: `
    <pct-card style="max-inline-size: 280px">
      <h3 pctCardTitle>
        <a pctCardLink routerLink="." fragment="heat-pump">Heat pump</a>
      </h3>
      <p style="margin: 0">21.4 °C</p>
      <pct-switch pctCardControl [(checked)]="enabled" label="Enabled" />
      <span pctCardFooter>Updated a moment ago</span>
    </pct-card>
  `,
})
export class CardLinkDemo {
  protected readonly enabled = signal(true);
}
