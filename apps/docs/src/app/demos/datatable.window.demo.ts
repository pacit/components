import { Component } from '@angular/core';
import {
  PctDataTable,
  PctTableWindow,
  pctColumnsOf,
} from '@pacit/components/table';

interface Register {
  readonly id: number;
  readonly address: number;
  readonly name: string;
  readonly value: number;
}

const col = pctColumnsOf<Register>();

/**
 * Ten thousand rows in a window
 *
 * `pctTableWindow` draws only the rows the frame shows and the space of the rest, so the
 * scrollbar is the whole list's. Sorting and the filter still cover every row.
 */
@Component({
  selector: 'demo-datatable-window',
  imports: [PctDataTable, PctTableWindow],
  styles: `
    pct-data-table {
      block-size: 20rem;
    }
  `,
  template: `
    <pct-data-table
      #table="pctDataTable"
      caption="Registers"
      pctTableWindow
      [rows]="registers"
      [columns]="columns"
      [rowId]="byId"
    />
    <p>
      Rows {{ table.visible().start + 1 }} to {{ table.visible().end }} of
      {{ registers.length.toLocaleString('en') }}
    </p>
  `,
})
export class DatatableWindowDemo {
  readonly columns = col.of([
    col.key('address', { header: 'Address', numeric: true }),
    col.key('name', { header: 'Name' }),
    col.key('value', {
      header: 'Value',
      kind: { number: { fractionDigits: 2 } },
    }),
  ]);
  readonly byId = (register: Register) => register.id;
  readonly registers: readonly Register[] = Array.from(
    { length: 10_000 },
    (_, i) => ({
      id: i + 1,
      address: 40_001 + i,
      name: `Register ${i + 1}`,
      value: ((i * 7919) % 100_000) / 100,
    }),
  );
}
