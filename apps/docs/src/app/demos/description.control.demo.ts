import { Component, signal } from '@angular/core';
import {
  PctDescription,
  PctDescriptionList,
} from '@pacit/components/description';
import { PctSwitch } from '@pacit/components/switch';

/** A pair with a control, the control named by its term through termId. */
@Component({
  selector: 'demo-description-control',
  imports: [PctDescriptionList, PctDescription, PctSwitch],
  template: `
    <dl pctDescriptionList style="max-inline-size: 420px">
      <div pctDescription>
        <span pctDescriptionTerm>Supply temperature</span>
        21.4 °C
      </div>
      <div pctDescription #heating="pctDescription">
        <span pctDescriptionTerm>Heating</span>
        {{ on() ? 'On' : 'Off' }}
        <pct-switch
          pctDescriptionControl
          [ariaLabelledby]="heating.termId"
          [(checked)]="on"
        />
      </div>
    </dl>
  `,
})
export class DescriptionControlDemo {
  protected readonly on = signal(true);
}
