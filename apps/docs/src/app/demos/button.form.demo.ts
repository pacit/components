import { Component, signal } from '@angular/core';
import { FormField, form, required } from '@angular/forms/signals';
import { PctButton } from '@pacit/components/button';
import { PctField, PctText } from '@pacit/components/field';

/**
 * In a form
 *
 * The submit button is a native `type="submit"`: the signal form's validity drives
 * `disabled`, and the row heights match because the field and the button read the same
 * size token. Clear the name to watch the button follow.
 */
@Component({
  selector: 'demo-button-form',
  imports: [FormField, PctButton, PctField, PctText],
  styles: `
    form {
      display: grid;
      gap: 12px;
      max-width: 360px;
    }
  `,
  template: `
    <form (submit)="create($event)">
      <pct-field label="Workspace name" hint="Letters, digits and dashes.">
        <input pctText [formField]="workspaceForm.name" />
      </pct-field>
      <button pctButton type="submit" [disabled]="workspaceForm().invalid()">
        {{ created() ? 'Created' : 'Create workspace' }}
      </button>
    </form>
  `,
})
export class ButtonFormDemo {
  protected readonly workspace = signal({ name: 'northwind' });
  protected readonly workspaceForm = form(this.workspace, (path) => {
    required(path.name, { message: 'Every workspace needs a name' });
  });
  protected readonly created = signal(false);

  protected create(event: Event): void {
    event.preventDefault();
    this.created.set(true);
    setTimeout(() => this.created.set(false), 1500);
  }
}
