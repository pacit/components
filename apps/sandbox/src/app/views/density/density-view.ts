import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctChip, PctChips } from '@pacit/components/chips';
import { PctField, PctText } from '@pacit/components/field';
import { PctPagination } from '@pacit/components/pagination';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect } from '@pacit/components/select';
import { PctSize } from '@pacit/components';
import { PctSwitch } from '@pacit/components/switch';
import { COUNTRIES } from '../../ui/data';
import { SbxDemo } from '../../ui/demo';

/** The two halves of the density axis, in the order the attribute takes them. */
type SbxDensity = 'comfortable' | 'compact';

/**
 * A cross-cutting view: density as **the second axis** (req-token-density). The switch is
 * an attribute on a subtree — `data-pct-density="compact"` — and not one component reads
 * it: the tokens the components already read are re-pointed under that scope, exactly the
 * way `data-theme` re-points colour ([0074](../../../../../docs/decisions/0074-density-is-a-scope-that-re-points-metrics-not-an-input.md)).
 *
 * The two things worth looking at are both line-ups. The first is horizontal: a comfortable
 * row and a compact row of the same size, so the difference is a measurement rather than an
 * impression. The second is the corner the requirement warned about — `compact` at size
 * `sm`, the shortest anything in this library gets — where the touch floor is what stops
 * the shrinking (req-a11y-touch).
 */
@Component({
  selector: 'sbx-density-view',
  imports: [
    SbxDemo,
    PctField,
    PctText,
    PctSelect,
    PctButton,
    PctChips,
    PctChip,
    PctPagination,
    PctCheckbox,
    PctRadioGroup,
    PctRadio,
    PctSwitch,
  ],
  templateUrl: './density-view.html',
  styleUrl: './density-view.scss',
})
export class DensityView {
  protected readonly sizes: readonly PctSize[] = ['sm', 'md', 'lg'];
  protected readonly densities: readonly SbxDensity[] = [
    'comfortable',
    'compact',
  ];
  protected readonly countries = COUNTRIES;

  protected readonly country = signal<string | null>('pl');
  protected readonly consent = signal(true);
  protected readonly plan = signal<string | null>('a');
  protected readonly notify = signal(true);
  protected readonly page = signal(2);
}
