import { Component, inject, signal } from '@angular/core';
import { PctTone } from '@pacit/components/core';
import { PctButton } from '@pacit/components/button';
import { PctDialog } from '@pacit/components/dialog';
import { PctToaster } from '@pacit/components/toast';
import { SbxDemo } from '../../ui/demo';

/**
 * Toasts: messages that arrive on top of the page rather than in it. There is no component to
 * put in a template — the whole surface is a service, because a message about something that
 * has just happened is raised by the code that made it happen.
 *
 * The last card is the one worth having: a message raised from inside a modal. Everything
 * outside the dialog goes inert while it is up, and an inert subtree is absent from the
 * accessibility tree — so the viewport lives where `PctModalBackground` leaves it speaking.
 */
@Component({
  selector: 'sbx-toast-view',
  imports: [SbxDemo, PctButton, PctDialog],
  templateUrl: './toast-view.html',
  styleUrl: './toast-view.scss',
})
export class ToastView {
  private readonly toaster = inject(PctToaster);

  /** One message per tone, standing so the four can be looked at together. */
  protected toned(tone: PctTone): void {
    this.toaster.show({
      text: {
        success: 'Backup finished.',
        warning: 'Half the rows imported.',
        danger: 'Could not save.',
        info: 'A new version is available.',
      }[tone],
      tone,
      duration: null,
    });
  }

  protected readonly confirm = signal(false);
  protected readonly undone = signal(0);

  protected notice(): void {
    this.toaster.show('Draft saved.');
  }

  /**
   * A clock short enough to watch. `duration` is per message and in milliseconds; the
   * application's own default is `providePctToastConfig({ duration })`.
   */
  protected brief(): void {
    this.toaster.show({ text: 'Copied to the clipboard.', duration: 1500 });
  }

  /** A message with no clock at all — the shape the visual baselines are taken of. */
  protected standing(): void {
    this.toaster.show({
      text: 'Connecting to the server…',
      duration: null,
    });
  }

  protected urgent(): void {
    this.toaster.show({
      text: 'Could not save the draft. Check the connection.',
      urgent: true,
    });
  }

  protected withAction(): void {
    this.toaster.show({
      text: 'Message moved to the bin.',
      action: { label: 'Undo', run: () => this.undone.update((n) => n + 1) },
    });
  }

  protected fromModal(): void {
    this.confirm.set(false);
    this.toaster.show({ text: 'Settings saved.', duration: null });
  }

  /**
   * The case the top layer is here for: a message raised while the modal is still up. It goes
   * above the veil, because the order in the top layer is the order things were shown in.
   */
  protected fromOpenModal(): void {
    this.toaster.show({ text: 'Nothing to save yet.', duration: null });
  }

  protected clear(): void {
    this.toaster.clear();
  }
}
