import { Component } from '@angular/core';
import {
  PctDescription,
  PctDescriptionList,
} from '@pacit/components/description';

/** Terms and their values on the platform's dl. */
@Component({
  selector: 'demo-description',
  imports: [PctDescriptionList, PctDescription],
  template: `
    <dl
      pctDescriptionList
      style="inline-size: 260px; --pct-description-term-width: 8rem"
    >
      <div pctDescription>
        <span pctDescriptionTerm>Supply</span>
        21.4 °C
      </div>
      <div pctDescription>
        <span pctDescriptionTerm>Mode</span>
        Heating
      </div>
    </dl>
  `,
})
export class DescriptionDemo {}
