import { Component, signal } from '@angular/core';
import {
  PctDataTable,
  pctColumnsOf,
  type PctTableSort,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly energy: number;
}

const col = pctColumnsOf<Rule>();

/**
 * Sorting by several columns
 *
 * Press a header to sort, again to reverse. Shift with a press adds the column as the next
 * key. The order is a `sort` model the page can keep, in the URL for one.
 */
@Component({
  selector: 'demo-datatable-sorting',
  imports: [PctDataTable],
  template: `
    <pct-data-table
      caption="Rules"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
      [(sort)]="sort"
    />
    <p>
      Sorted by:
      @for (key of sort(); track key.key) {
        <code>{{ key.key }} {{ key.direction }}</code>
      } @empty {
        nothing
      }
    </p>
  `,
})
export class DatatableSortingDemo {
  readonly columns = col.of([
    col.key('room', { header: 'Room' }),
    col.key('name', { header: 'Name' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
  ]);
  readonly sort = signal<readonly PctTableSort<'room' | 'name' | 'energy'>[]>([
    { key: 'room', direction: 'ascending' },
  ]);
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', energy: 4.2 },
    { id: 2, name: 'Lamp', room: 'Hall', energy: 0.3 },
    { id: 3, name: 'Boiler', room: 'Kitchen', energy: 6.8 },
    { id: 4, name: 'Supply fan', room: 'Hall', energy: 1.1 },
    { id: 5, name: 'Floor heating', room: 'Bathroom', energy: 3.5 },
  ];
}
