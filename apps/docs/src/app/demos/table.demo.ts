import { Component } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableHeader,
} from '@pacit/components/table';

/** A table you write yourself: a caption, a header row and three rows of cells. */
@Component({
  selector: 'demo-table',
  imports: [PctTable, PctTableCaption, PctTableHeader, PctTableCell],
  template: `
    <table pctTable>
      <caption pctCaption>
        Devices
      </caption>
      <thead>
        <tr>
          <th pctHeader scope="col">Device</th>
          <th pctHeader scope="col">Protocol</th>
          <th pctHeader scope="col" numeric>Power (kW)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td pctCell>Recuperator</td>
          <td pctCell>Modbus TCP</td>
          <td pctCell numeric>0.2</td>
        </tr>
        <tr>
          <td pctCell>Inverter</td>
          <td pctCell>Modbus RTU</td>
          <td pctCell numeric>9.9</td>
        </tr>
        <tr>
          <td pctCell>Heat pump</td>
          <td pctCell>Modbus TCP</td>
          <td pctCell numeric>2.4</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class TableDemo {}
