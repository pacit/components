import { Component } from '@angular/core';
import { PctDataTable, pctColumnsOf } from '@pacit/components/table';

interface Device {
  readonly id: number;
  readonly name: string;
  readonly protocol: string;
  readonly power: number;
}

const col = pctColumnsOf<Device>();

/** A table built from data: three typed columns, sortable by a press on their headers. */
@Component({
  selector: 'demo-datatable',
  imports: [PctDataTable],
  template: `
    <pct-data-table
      caption="Devices"
      [rows]="devices"
      [columns]="columns"
      [rowId]="byId"
    />
  `,
})
export class DatatableDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Device' }),
    col.key('protocol', { header: 'Protocol' }),
    col.key('power', {
      header: 'Power',
      kind: { number: { unit: 'kW', fractionDigits: 1 } },
    }),
  ]);
  readonly byId = (device: Device) => device.id;
  readonly devices: readonly Device[] = [
    { id: 1, name: 'Recuperator', protocol: 'Modbus TCP', power: 0.2 },
    { id: 2, name: 'Inverter', protocol: 'Modbus RTU', power: 9.9 },
    { id: 3, name: 'Heat pump', protocol: 'Modbus TCP', power: 2.4 },
  ];
}
