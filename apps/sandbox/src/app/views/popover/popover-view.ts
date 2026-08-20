import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctField, PctText } from '@pacit/components/field';
import {
  PctPopover,
  PctPopoverCloseReason,
  PctPopoverTrigger,
} from '@pacit/components/popover';
import { SbxDemo } from '../../ui/demo';

/**
 * The popover: a panel of content hanging off the control that opened it, with the page behind
 * it still answering. The card that matters most is the third one — the page behind a modal is
 * inert, and everything a popover is follows from that not being true here.
 */
@Component({
  selector: 'sbx-popover-view',
  imports: [
    SbxDemo,
    PctButton,
    PctField,
    PctText,
    PctPopover,
    PctPopoverTrigger,
  ],
  templateUrl: './popover-view.html',
  styleUrl: './popover-view.scss',
})
export class PopoverView {
  protected readonly filters = signal(false);
  protected readonly owner = signal('');

  /** Why the live-page popover last closed — the output, put on the screen. */
  protected readonly reason = signal<PctPopoverCloseReason | null>(null);

  /** A counter behind the panel: proof that the page under a popover is not inert. */
  protected readonly count = signal(0);
}
