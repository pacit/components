import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctDataTable,
  PctTableSelection,
  pctColumnsOf,
  type PctRowId,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
}

const col = pctColumnsOf<Rule>();

/**
 * Row selection
 *
 * `pctTableSelection` adds a checkbox per row and one over all of them; Shift with a press
 * picks the rows between. The picked ids are a `value` model, and a form field when bound to
 * one. `mode="single"` picks one row.
 */
@Component({
  selector: 'demo-datatable-selection',
  imports: [PctDataTable, PctTableSelection, PctButton],
  template: `
    <pct-data-table
      #picks="pctTableSelection"
      caption="Rules"
      pctTableSelection
      [(value)]="picked"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
    />
    <p>
      Picked: {{ picked().join(', ') || 'none' }}
      <button pctButton variant="ghost" size="sm" (click)="picks.clear()">
        Clear
      </button>
    </p>
  `,
})
export class DatatableSelectionDemo {
  readonly picked = signal<readonly PctRowId[]>([2]);
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
  ]);
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen' },
    { id: 2, name: 'Lamp', room: 'Hall' },
    { id: 3, name: 'Boiler', room: 'Kitchen' },
    { id: 4, name: 'Supply fan', room: 'Hall' },
  ];
}
