import { Component } from '@angular/core';
import { PctDataTable, pctColumnsOf } from '@pacit/components/table';

interface Alarm {
  readonly id: number;
  readonly device: string;
  readonly message: string;
}

const col = pctColumnsOf<Alarm>();

/**
 * Empty and loading
 *
 * An empty table says so beside itself, not as a row. While `loading`, placeholder rows hold
 * the place and the body is `aria-busy`.
 */
@Component({
  selector: 'demo-datatable-states',
  imports: [PctDataTable],
  styles: `
    pct-data-table + pct-data-table {
      margin-block-start: var(--pct-space-5);
    }
  `,
  template: `
    <pct-data-table
      caption="Alarms"
      [rows]="[]"
      [columns]="columns"
      [rowId]="byId"
    />
    <pct-data-table
      caption="Alarms, loading"
      loading
      [rows]="[]"
      [columns]="columns"
      [rowId]="byId"
    />
  `,
})
export class DatatableStatesDemo {
  readonly columns = col.of([
    col.key('device', { header: 'Device' }),
    col.key('message', { header: 'Message' }),
  ]);
  readonly byId = (alarm: Alarm) => alarm.id;
}
