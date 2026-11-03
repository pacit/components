import { Component, computed, signal } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableHeader,
  PctTableSort,
} from '@pacit/components/table';

const ROOMS = [
  { id: 1, room: 'Kitchen', temperature: 21.5, humidity: 48 },
  { id: 2, room: 'Bedroom', temperature: 19.0, humidity: 52 },
  { id: 3, room: 'Office', temperature: 22.5, humidity: 41 },
  { id: 4, room: 'Bathroom', temperature: 23.0, humidity: 67 },
] as const;

type Column = 'room' | 'temperature' | 'humidity';

/**
 * Sortable headers
 *
 * A header with a `sortKey` becomes a button that proposes an order into the table's `sort`
 * model; the page puts its rows in it. `aria-sort` stands on the sorted header alone.
 */
@Component({
  selector: 'demo-table-sorted',
  imports: [PctTable, PctTableCaption, PctTableHeader, PctTableCell],
  template: `
    <table pctTable [(sort)]="sort">
      <caption pctCaption>
        Rooms
      </caption>
      <thead>
        <tr>
          <th pctHeader scope="col" sortKey="room">Room</th>
          <th pctHeader scope="col" sortKey="temperature" numeric>
            Temperature (°C)
          </th>
          <th pctHeader scope="col" sortKey="humidity" numeric>Humidity (%)</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows(); track row.id) {
          <tr>
            <th pctHeader scope="row">{{ row.room }}</th>
            <td pctCell numeric>{{ row.temperature.toFixed(1) }}</td>
            <td pctCell numeric>{{ row.humidity }}</td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class TableSortedDemo {
  protected readonly sort = signal<PctTableSort | null>(null);

  protected readonly rows = computed(() => {
    const sort = this.sort();
    if (sort === null) return ROOMS;
    const key = sort.key as Column;
    const order = sort.direction === 'ascending' ? 1 : -1;
    return [...ROOMS].sort((a, b) =>
      key === 'room'
        ? order * a.room.localeCompare(b.room)
        : order * (a[key] - b[key]),
    );
  });
}
