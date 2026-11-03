import { Component } from '@angular/core';
import { PctDataTable, pctColumnsOf } from '@pacit/components/table';

interface Device {
  readonly id: number;
  readonly name: string;
  readonly state: 'Online' | 'Offline' | 'Fault';
  readonly battery: number | null;
}

const col = pctColumnsOf<Device>();

/**
 * Stripes, row numbers and tones
 *
 * `striped` and `rowNumbers` dress the rows; `rowTone` tones a whole row and a column's `tone`
 * a cell, always beside a word that says the same. `tooltip` cuts a long value to one line and
 * shows it whole under the pointer.
 */
@Component({
  selector: 'demo-datatable-appearance',
  imports: [PctDataTable],
  template: `
    <pct-data-table
      caption="Devices"
      striped
      rowNumbers
      [rows]="devices"
      [columns]="columns"
      [rowId]="byId"
      [rowTone]="rowTone"
    />
  `,
})
export class DatatableAppearanceDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Device', tooltip: true }),
    col.key('state', {
      header: 'State',
      tone: (state) =>
        state === 'Fault' ? 'danger' : state === 'Offline' ? 'warning' : null,
    }),
    col.key('battery', {
      header: 'Battery',
      kind: { number: { unit: 'percent' } },
    }),
  ]);
  readonly byId = (device: Device) => device.id;
  readonly rowTone = (device: Device) =>
    device.state === 'Fault' ? ('danger' as const) : null;
  readonly devices: readonly Device[] = [
    { id: 1, name: 'Supply fan', state: 'Online', battery: null },
    {
      id: 2,
      name: 'Window contact, the bedroom’s south window by the wardrobe',
      state: 'Online',
      battery: 64,
    },
    { id: 3, name: 'Door lock', state: 'Fault', battery: 9 },
    { id: 4, name: 'Motion sensor', state: 'Offline', battery: 0 },
  ];
}
