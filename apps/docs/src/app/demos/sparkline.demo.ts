import { Component } from '@angular/core';
import { PctSparkline } from '@pacit/components/sparkline';

const rooms = [
  {
    id: 'hall',
    name: 'Hall',
    hours: [1.2, 1.1, 1.3, 1.6, 2.2, 2, 1.8, 1.7],
  },
  {
    id: 'attic',
    name: 'Attic',
    hours: [0.4, 0.5, null, null, 0.9, 1.1, 1, 0.8],
  },
  {
    id: 'kitchen',
    name: 'Kitchen',
    hours: [0.6, 0.6, 0.7, 2.4, 2.9, 1.2, 0.8, 0.9],
  },
];

/**
 * Eight hours of each room, beside its last reading
 *
 * Each picture is named by its row's header and described by its lowest, highest and last
 * value, so a reader walking the table hears what a sighted user sees. The attic's sensor was
 * off for two hours: the line breaks there instead of drawing a value nobody read.
 */
@Component({
  selector: 'demo-sparkline',
  imports: [PctSparkline],
  styles: `
    table {
      border-collapse: collapse;
    }
    th,
    td {
      padding-block: 6px;
      padding-inline: 0 16px;
      text-align: start;
    }
    td:last-child {
      padding-inline-end: 0;
      text-align: end;
      font-variant-numeric: tabular-nums;
    }
  `,
  template: `
    <table>
      <thead>
        <tr>
          <th scope="col">Room</th>
          <th scope="col">Last 8 h</th>
          <th scope="col">kWh</th>
        </tr>
      </thead>
      <tbody>
        @for (room of rooms; track room.id) {
          <tr>
            <th scope="row" [id]="'demo-spark-' + room.id">{{ room.name }}</th>
            <td>
              <pct-sparkline
                [data]="room.hours"
                unit="kWh"
                locale="en-GB"
                area
                [ariaLabelledby]="'demo-spark-' + room.id"
              />
            </td>
            <td>{{ room.hours[room.hours.length - 1] }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class SparklineDemo {
  protected readonly rooms = rooms;
}
