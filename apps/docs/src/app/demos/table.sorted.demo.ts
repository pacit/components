import { Component, computed, signal } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
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
 * Sorted by the headers, ordered by you
 *
 * The headers with a `sortKey` propose an order into one `sort` model, and the component that
 * owns the rows puts them in it. The frame scrolls the table when the page is too narrow for
 * it, and only then is it a region with a tab stop.
 */
@Component({
  selector: 'demo-table-sorted',
  imports: [
    PctTable,
    PctTableCaption,
    PctTableHeader,
    PctTableCell,
    PctTableFrame,
  ],
  styles: ':host { display: block; }',
  template: `
    <pct-table-frame>
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
            <th pctHeader scope="col" sortKey="humidity" numeric>
              Humidity (%)
            </th>
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
    </pct-table-frame>
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
