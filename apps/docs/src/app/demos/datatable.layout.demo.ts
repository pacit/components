import { Component, computed, signal } from '@angular/core';
import {
  PctDataTable,
  PctTableColumnChooser,
  PctTableColumns,
  pctColumnsOf,
  type PctTableLayout,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly address: number;
  readonly energy: number;
}

const col = pctColumnsOf<Rule>();

/**
 * Column layout
 *
 * `pctTableColumns` lets the user resize a column by its edge, and move, pin, fit or hide it
 * from the header's menu; `pct-table-column-chooser` lists the columns to do the same. The
 * layout is one model, ready to save as JSON.
 */
@Component({
  selector: 'demo-datatable-layout',
  imports: [PctDataTable, PctTableColumns, PctTableColumnChooser],
  styles: `
    .layout {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: var(--pct-space-4);
    }
    pct-table-column-chooser {
      flex: 0 0 14rem;
    }
    pct-data-table {
      flex: 1 1 20rem;
      min-inline-size: 0;
    }
  `,
  template: `
    <div class="layout">
      <pct-table-column-chooser
        ariaLabel="Columns"
        [columns]="columns"
        [(layout)]="layout"
      />
      <pct-data-table
        caption="Rules"
        rowNumbers
        [pctTableColumns]="columns"
        [(layout)]="layout"
        [rows]="rules"
        [columns]="columns"
        [rowId]="byId"
      />
    </div>
    <p>
      <code>{{ layoutText() }}</code>
    </p>
  `,
})
export class DatatableLayoutDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Name', width: 180, minWidth: 120 }),
    col.key('room', { header: 'Room', width: 140 }),
    col.key('address', { header: 'Address', numeric: true, width: 150 }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      width: 120,
    }),
  ]);
  readonly layout = signal<
    PctTableLayout<'name' | 'room' | 'address' | 'energy'>
  >({});
  readonly layoutText = computed(() => JSON.stringify(this.layout()));
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', address: 4096, energy: 4.2 },
    { id: 2, name: 'Lamp', room: 'Hall', address: 4100, energy: 0.3 },
    { id: 3, name: 'Boiler', room: 'Kitchen', address: 4104, energy: 6.8 },
    { id: 4, name: 'Supply fan', room: 'Hall', address: 4108, energy: 1.1 },
  ];
}
