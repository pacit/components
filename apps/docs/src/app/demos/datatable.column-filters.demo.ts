import { Component, computed, signal } from '@angular/core';
import { PctSwitch } from '@pacit/components/switch';
import {
  PctDataTable,
  PctTableColumnFilters,
  pctColumnsOf,
  type PctColumnFilters,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly energy: number;
  readonly enabled: boolean;
}

const col = pctColumnsOf<Rule>();

/**
 * Column filters
 *
 * `pctTableColumnFilters` gives each column a filter of its kind — words, a list of values,
 * a range, yes or no — in a panel its header opens, or in a row under the headers. One
 * `columnFilters` model holds them all.
 */
@Component({
  selector: 'demo-datatable-column-filters',
  imports: [PctDataTable, PctTableColumnFilters, PctSwitch],
  styles: `
    pct-switch {
      margin-block-end: var(--pct-space-3);
    }
  `,
  template: `
    <pct-switch label="A row of filters" [(checked)]="filterRow" />
    <pct-data-table
      #table
      caption="Rules"
      [pctTableColumnFilters]="columns"
      [(columnFilters)]="filters"
      [filterRow]="filterRow()"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
    />
    <p>
      {{ table.matched() }} of {{ rules.length }} ·
      <code>{{ filtersText() }}</code>
    </p>
  `,
})
export class DatatableColumnFiltersDemo {
  readonly filterRow = signal(false);
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room', columnFilter: 'values' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  readonly filters = signal<
    PctColumnFilters<
      typeof this.columns extends { readonly __map?: infer M } ? M : never
    >
  >({});
  readonly filtersText = computed(() => JSON.stringify(this.filters()));
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', energy: 4.2, enabled: true },
    { id: 2, name: 'Lamp', room: 'Hall', energy: 0.3, enabled: false },
    { id: 3, name: 'Boiler', room: 'Kitchen', energy: 6.8, enabled: true },
    { id: 4, name: 'Supply fan', room: 'Hall', energy: 1.1, enabled: true },
    {
      id: 5,
      name: 'Floor heating',
      room: 'Bathroom',
      energy: 3.5,
      enabled: false,
    },
  ];
}
