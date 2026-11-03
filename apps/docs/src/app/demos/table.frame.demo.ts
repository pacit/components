import { Component } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
  PctTableHeader,
} from '@pacit/components/table';

/**
 * A frame for a wide table
 *
 * `pct-table-frame` scrolls a table wider than its space. Only while it scrolls is it a region
 * named by the caption, with a tab stop, so a keyboard can reach it and scroll by the arrows.
 */
@Component({
  selector: 'demo-table-frame',
  imports: [
    PctTable,
    PctTableCaption,
    PctTableHeader,
    PctTableCell,
    PctTableFrame,
  ],
  styles: `
    pct-table-frame {
      max-inline-size: 22rem;
    }
  `,
  template: `
    <pct-table-frame>
      <table pctTable>
        <caption pctCaption>
          Registers
        </caption>
        <thead>
          <tr>
            <th pctHeader scope="col" numeric>Address</th>
            <th pctHeader scope="col">Name</th>
            <th pctHeader scope="col" numeric>Value</th>
            <th pctHeader scope="col">Unit</th>
            <th pctHeader scope="col">Note</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td pctCell numeric>4096</td>
            <td pctCell>Supply temperature</td>
            <td pctCell numeric>21.5</td>
            <td pctCell>°C</td>
            <td pctCell>after the exchanger</td>
          </tr>
          <tr>
            <td pctCell numeric>4097</td>
            <td pctCell>Exhaust temperature</td>
            <td pctCell numeric>23.0</td>
            <td pctCell>°C</td>
            <td pctCell>before the exchanger</td>
          </tr>
        </tbody>
      </table>
    </pct-table-frame>
  `,
})
export class TableFrameDemo {}
