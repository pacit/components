import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctIcon } from '@pacit/components/icon';
import { PctField, PctText } from '@pacit/components/field';
import { PctTooltip } from '@pacit/components/tooltip';
import { SbxDemo } from '../../ui/demo';

/**
 * The tooltip: a sentence about a control, shown on hover, on keyboard focus and on a long
 * press. The card that matters most is the second one — an icon-only button, where the tooltip
 * is not an extra but the only name the control has.
 */
@Component({
  selector: 'sbx-tooltip-view',
  imports: [SbxDemo, PctButton, PctField, PctIcon, PctText, PctTooltip],
  templateUrl: './tooltip-view.html',
  styleUrl: './tooltip-view.scss',
})
export class TooltipView {
  protected readonly note = signal('');

  /** Switched from the page, so the e2e can watch a tooltip go while it is on the screen. */
  protected readonly off = signal(false);
}
