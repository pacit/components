import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctSwitch } from '@pacit/components/switch';
import { SbxDemo } from '../../ui/demo';

/**
 * Switch: a setting that takes effect the moment it is moved. The same native
 * `<input type="checkbox">` as the checkbox, carrying `role="switch"` — and nothing else,
 * because the checked state is the element's own.
 */
@Component({
  selector: 'sbx-switch-view',
  imports: [SbxDemo, PctSwitch, PctField, FormField],
  templateUrl: './switch-view.html',
  styleUrl: './switch-view.scss',
})
export class SwitchView {
  protected readonly model = signal({ backups: false });

  protected readonly settingsForm = form(this.model, (p) => {
    required(p.backups, { message: 'Backups have to stay on' });
  });

  /** A switch standing on its own, with a hint under it. */
  protected readonly wifi = signal(true);
}
