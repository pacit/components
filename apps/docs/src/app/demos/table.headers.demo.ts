import { Component } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableHeader,
} from '@pacit/components/table';

/**
 * Row headers, numbers and a foot
 *
 * A `th` with `scope="row"` names its row for a reader. `numeric` sets a column to the end
 * edge in digits of one width, so the values line up; a `tfoot` holds the totals.
 */
@Component({
  selector: 'demo-table-headers',
  imports: [PctTable, PctTableCaption, PctTableHeader, PctTableCell],
  template: `
    <table pctTable>
      <caption pctCaption>
        Energy by month
      </caption>
      <thead>
        <tr>
          <th pctHeader scope="col">Month</th>
          <th pctHeader scope="col" numeric>Heating (kWh)</th>
          <th pctHeader scope="col" numeric>Hot water (kWh)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th pctHeader scope="row">January</th>
          <td pctCell numeric>1,184.5</td>
          <td pctCell numeric>211.0</td>
        </tr>
        <tr>
          <th pctHeader scope="row">February</th>
          <td pctCell numeric>967.2</td>
          <td pctCell numeric>188.4</td>
        </tr>
        <tr>
          <th pctHeader scope="row">March</th>
          <td pctCell numeric>611.9</td>
          <td pctCell numeric>194.7</td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <th pctHeader scope="row">Total</th>
          <td pctCell numeric>2,763.6</td>
          <td pctCell numeric>594.1</td>
        </tr>
      </tfoot>
    </table>
  `,
})
export class TableHeadersDemo {}
