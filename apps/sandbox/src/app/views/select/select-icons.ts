import { Component, input, signal } from '@angular/core';
import { PctField } from '@pacit/components/field';
import { PctIconTemplate, providePctIcons } from '@pacit/components/icon';
import { PctSelect, PctSelectOption } from '@pacit/components/select';

/**
 * An icon set the way a consumer writes one: a component whose templates are the icons
 * (`req-api-icons`). Drawn as text rather than with somebody's icon font, because the
 * sandbox brings in no dependency the library refuses to bring in itself.
 */
@Component({
  selector: 'sbx-own-icons',
  imports: [PctIconTemplate],
  template: `<ng-template pctIcon="chevron-down"
    ><span class="own-arrow" data-testid="own-arrow"
      >&#x25BE;</span
    ></ng-template
  >`,
  styles: `
    .own-arrow {
      font-size: 0.75em;
      line-height: 1;
    }
  `,
})
export class SbxOwnIcons {}

/**
 * The card the set is provided in — and only this card, which is the point: the token is
 * an ordinary provider, so a section of the page can carry a different set from the one
 * around it. The selects in the other cards on this page draw the library's own arrow.
 */
@Component({
  selector: 'sbx-select-icons',
  imports: [PctField, PctSelect],
  templateUrl: './select-icons.html',
  providers: [providePctIcons(SbxOwnIcons)],
})
export class SelectIcons {
  readonly options = input.required<readonly PctSelectOption[]>();
  protected readonly country = signal<string | null>('pl');
}
