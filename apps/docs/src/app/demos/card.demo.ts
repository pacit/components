import { Component } from '@angular/core';
import { PctCard, PctCardSubtitle, PctCardTitle } from '@pacit/components/card';

/** A card: a title, a subtitle, a body and a footer that stays down. */
@Component({
  selector: 'demo-card',
  imports: [PctCard, PctCardTitle, PctCardSubtitle],
  template: `
    <pct-card style="inline-size: 240px">
      <h3 pctCardTitle>Heat pump</h3>
      <p pctCardSubtitle>Utility room</p>
      <p style="margin: 0; font-size: 24px">21.4 °C</p>
      <span pctCardFooter>Updated a moment ago</span>
    </pct-card>
  `,
})
export class CardDemo {}
