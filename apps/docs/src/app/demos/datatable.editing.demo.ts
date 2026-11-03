import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctSelect, type PctSelectOption } from '@pacit/components/select';
import {
  PctDataTable,
  PctEditorTemplate,
  PctTableEditing,
  PctTableGrid,
  pctColumnsOf,
  type PctTableEdit,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly energy: number | null;
}

type RuleEdit = PctTableEdit<
  Rule,
  {
    readonly name: string;
    readonly room: string;
    readonly energy: number | null;
  }
>;

const col = pctColumnsOf<Rule>();
const ROOMS = ['Kitchen', 'Hall', 'Bathroom'];

/**
 * Editing in place
 *
 * `pctTableEditing` opens a cell on Enter, F2, a double press or a typed letter; Enter
 * commits, Escape lets the draft go. A column edits in a field of its kind, or in your own
 * `pctEditor`. The table proposes each `edit` and the page applies it; Ctrl+Z undoes.
 */
@Component({
  selector: 'demo-datatable-editing',
  imports: [
    PctDataTable,
    PctTableGrid,
    PctTableEditing,
    PctEditorTemplate,
    PctSelect,
    PctButton,
  ],
  styles: `
    div {
      display: flex;
      gap: var(--pct-space-2);
      margin-block-end: var(--pct-space-3);
    }
  `,
  template: `
    <div>
      <button
        pctButton
        variant="outline"
        size="sm"
        [disabled]="!editor.canUndo()"
        (click)="editor.undo()"
      >
        Undo
      </button>
      <button
        pctButton
        variant="outline"
        size="sm"
        [disabled]="!editor.canRedo()"
        (click)="editor.redo()"
      >
        Redo
      </button>
    </div>
    <pct-data-table
      #editor="pctTableEditing"
      caption="Rules"
      [pctTableGrid]="columns"
      [pctTableEditing]="columns"
      [editable]="['name', 'room', 'energy']"
      (edit)="apply($event)"
      [rows]="rules()"
      [columns]="columns"
      [rowId]="byId"
    >
      <ng-template
        [pctEditor]="columns"
        pctEditorOf="room"
        let-value="value"
        let-commit="commit"
      >
        <pct-select
          ariaLabel="Edit Room"
          [options]="rooms"
          [value]="value()"
          (valueChange)="value.set($event ?? value()); commit()"
        />
      </ng-template>
    </pct-data-table>
  `,
})
export class DatatableEditingDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
  ]);
  readonly rooms: readonly PctSelectOption[] = ROOMS.map((room) => ({
    value: room,
    label: room,
  }));
  readonly byId = (rule: Rule) => rule.id;
  readonly rules = signal<readonly Rule[]>([
    { id: 1, name: 'Heater', room: 'Kitchen', energy: 4.2 },
    { id: 2, name: 'Lamp', room: 'Hall', energy: 0.3 },
    { id: 3, name: 'Floor heating', room: 'Bathroom', energy: 3.5 },
  ]);

  /** The table proposes, the page applies: the row written anew with the changes. */
  protected apply(edit: RuleEdit): void {
    this.rules.update((rules) =>
      rules.map((rule) =>
        rule.id === edit.id
          ? edit.changes.reduce<Rule>(
              (one, change) => ({ ...one, [change.column]: change.value }),
              rule,
            )
          : rule,
      ),
    );
  }
}
