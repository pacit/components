import { Component, computed, signal } from '@angular/core';
import {
  PctDataTable,
  PctTableGrid,
  PctTableSelection,
  pctColumnsOf,
  type PctRowId,
  type PctTableCellRange,
  type PctTableGridCell,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly energy: number;
}

type Key = 'name' | 'room' | 'energy';

const col = pctColumnsOf<Rule>();

/**
 * Keyboard grid
 *
 * `pctTableGrid` makes the table one tab stop: the arrows move between cells, Home, End and
 * Page keys jump, Shift with an arrow stretches a range, and Ctrl+A picks every row. The
 * focused cell and the range are models.
 */
@Component({
  selector: 'demo-datatable-grid',
  imports: [PctDataTable, PctTableGrid, PctTableSelection],
  template: `
    <pct-data-table
      caption="Rules"
      pctTableSelection
      [(value)]="picked"
      [pctTableGrid]="columns"
      [(focused)]="focused"
      [(range)]="range"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
    />
    <p>
      <code>{{ state() }}</code>
    </p>
  `,
})
export class DatatableGridDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
  ]);
  readonly picked = signal<readonly PctRowId[]>([]);
  readonly focused = signal<PctTableGridCell<Key> | null>(null);
  readonly range = signal<PctTableCellRange<Key> | null>(null);
  readonly state = computed(() =>
    JSON.stringify({ focused: this.focused(), range: this.range() }),
  );
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', energy: 4.2 },
    { id: 2, name: 'Lamp', room: 'Hall', energy: 0.3 },
    { id: 3, name: 'Boiler', room: 'Kitchen', energy: 6.8 },
    { id: 4, name: 'Supply fan', room: 'Hall', energy: 1.1 },
  ];
}
