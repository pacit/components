import { Component, signal } from '@angular/core';
import {
  PctDataTable,
  PctTableGroups,
  pctColumnsOf,
} from '@pacit/components/table';
import { PctButton } from '@pacit/components/button';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly energy: number;
  readonly enabled: boolean;
}

const col = pctColumnsOf<Rule>();

/**
 * Groups and totals
 *
 * `pctTableGroups` heads each group with its value, its count and the sums of the columns
 * with an `aggregate`, on one level or more. A group folds by its heading; the foot totals
 * every row.
 */
@Component({
  selector: 'demo-datatable-groups',
  imports: [PctDataTable, PctTableGroups, PctButton],
  styles: `
    div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pct-space-2);
      margin-block-end: var(--pct-space-3);
    }
  `,
  template: `
    <div>
      <button
        pctButton
        variant="ghost"
        size="sm"
        (click)="
          groupBy.set(groupBy().length === 1 ? ['room', 'enabled'] : ['room'])
        "
      >
        {{ groupBy().length === 1 ? 'Add a level' : 'One level' }}
      </button>
      <button
        pctButton
        variant="ghost"
        size="sm"
        (click)="groups.collapseAll()"
      >
        Collapse all
      </button>
      <button pctButton variant="ghost" size="sm" (click)="groups.expandAll()">
        Expand all
      </button>
    </div>
    <pct-data-table
      #groups="pctTableGroups"
      caption="Rules by room"
      [pctTableGroups]="columns"
      [groupBy]="groupBy()"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
    />
  `,
})
export class DatatableGroupsDemo {
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      aggregate: 'sum',
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean' }),
  ]);
  readonly groupBy = signal<readonly ('room' | 'enabled')[]>(['room']);
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', energy: 4.2, enabled: true },
    { id: 2, name: 'Lamp', room: 'Hall', energy: 0.3, enabled: false },
    { id: 3, name: 'Boiler', room: 'Kitchen', energy: 6.8, enabled: true },
    { id: 4, name: 'Supply fan', room: 'Hall', energy: 1.1, enabled: true },
    { id: 5, name: 'Extractor', room: 'Kitchen', energy: 0.9, enabled: false },
  ];
}
