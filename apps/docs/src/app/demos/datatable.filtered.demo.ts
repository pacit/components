import { Component, signal } from '@angular/core';
import { PctField, PctText } from '@pacit/components/field';
import { PctDataTable, pctColumnsOf } from '@pacit/components/table';

interface Device {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly power: number;
}

const col = pctColumnsOf<Device>();

/** The quick filter: every word in some column of the row, searched in the text it shows. */
@Component({
  selector: 'demo-datatable-filtered',
  imports: [PctDataTable, PctField, PctText],
  template: `
    <pct-field label="Filter devices">
      <input
        pctText
        type="search"
        [value]="question()"
        (input)="question.set($any($event.target).value)"
      />
    </pct-field>
    <pct-data-table
      #table="pctDataTable"
      caption="Devices"
      [rows]="devices"
      [columns]="columns"
      [rowId]="byId"
      [(filter)]="question"
    />
    <p>{{ table.matched() }} of {{ devices.length }}</p>
  `,
})
export class DatatableFilteredDemo {
  readonly question = signal('');
  readonly columns = col.of([
    col.key('name', { header: 'Device' }),
    col.key('room', { header: 'Room' }),
    col.key('power', {
      header: 'Power',
      kind: { number: { unit: 'kW', fractionDigits: 1 } },
    }),
  ]);
  readonly byId = (device: Device) => device.id;
  readonly devices: readonly Device[] = [
    { id: 1, name: 'Recuperator', room: 'Attic', power: 0.2 },
    { id: 2, name: 'Inverter', room: 'Garage', power: 9.9 },
    { id: 3, name: 'Heat pump', room: 'Garage', power: 2.4 },
    { id: 4, name: 'Boiler', room: 'Kitchen', power: 1.8 },
  ];
}
