import { Component } from '@angular/core';

/** PROBE, never merged: what NVDA with Firefox says of a control inside a bare table's cell. */
@Component({
  selector: 'sbx-probe-cells-view',
  template: `
    <h2>Probe cells</h2>
    <input type="checkbox" aria-label="P0 outside box" />
    <button type="button">P0 outside button</button>
    <table>
      <caption>
        P1 box with aria-label
      </caption>
      <thead>
        <tr>
          <th>Pick</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" aria-label="P1 Kettle" /></td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P2 box in a label
      </caption>
      <thead>
        <tr>
          <th>Pick</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <label><input type="checkbox" checked /> P2 Kettle</label>
          </td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P3 button alone
      </caption>
      <thead>
        <tr>
          <th>Do</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><button type="button">P3 Edit</button></td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P4 text and button
      </caption>
      <thead>
        <tr>
          <th>Name</th>
          <th>Text</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Kettle <button type="button">P4 Edit</button></td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P5 no header
      </caption>
      <tbody>
        <tr>
          <td><input type="checkbox" aria-label="P5 Kettle" /></td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P6 box labelled by a cell
      </caption>
      <thead>
        <tr>
          <th>Pick</th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" aria-labelledby="probe-p6" /></td>
          <td id="probe-p6">P6 Kettle</td>
        </tr>
      </tbody>
    </table>
    <table>
      <caption>
        P7 sort button in a header
      </caption>
      <thead>
        <tr>
          <th><button type="button">P7 Room</button></th>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Hall</td>
          <td>Kettle</td>
        </tr>
      </tbody>
    </table>
  `,
})
export class ProbeCellsView {}
