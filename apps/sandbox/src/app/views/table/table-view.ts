import { Component, computed, signal } from '@angular/core';
import {
  PctTable,
  PctTableCaption,
  PctTableCell,
  PctTableFrame,
  PctTableHeader,
  PctTableSort,
} from '@pacit/components/table';
import { SbxDemo } from '../../ui/demo';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly address: number;
  readonly energy: number;
}

const RULES: readonly Rule[] = [
  { id: 1, name: 'Supply fan', address: 4096, energy: 412.5 },
  { id: 2, name: 'Heater', address: 4120, energy: 7899.7 },
  { id: 3, name: 'Bypass', address: 4100, energy: 3.25 },
  { id: 4, name: 'Exhaust fan', address: 4097, energy: 388 },
];

/**
 * Table: the platform's table, dressed element by element. What is worth watching: the rows
 * are the view's own markup and the view orders them, from the one `sort` model the headers
 * write; `aria-sort` stands on one header at a time; and the frame becomes a named, focusable
 * region only while the table is wider than the space it is given.
 */
@Component({
  selector: 'sbx-table-view',
  imports: [
    SbxDemo,
    PctTable,
    PctTableCaption,
    PctTableHeader,
    PctTableCell,
    PctTableFrame,
  ],
  templateUrl: './table-view.html',
  styleUrl: './table-view.scss',
})
export class TableView {
  protected readonly sort = signal<PctTableSort | null>(null);

  protected readonly rules = computed(() => {
    const sort = this.sort();
    if (sort === null) return RULES;
    const order = sort.direction === 'ascending' ? 1 : -1;
    const key = sort.key as 'name' | 'address' | 'energy';
    return [...RULES].sort((a, b) =>
      typeof a[key] === 'string'
        ? order * String(a[key]).localeCompare(String(b[key]))
        : order * (Number(a[key]) - Number(b[key])),
    );
  });

  protected readonly energy = new Intl.NumberFormat('en', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
