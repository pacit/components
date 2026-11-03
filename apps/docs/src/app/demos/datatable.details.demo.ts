import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctDataTable,
  PctDetailsTemplate,
  PctTableDetails,
  pctColumnsOf,
  type PctRowId,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly room: string;
  readonly address: number;
  readonly energy: number;
}

const col = pctColumnsOf<Rule>();

/**
 * Row details and columns that give way
 *
 * `pctTableDetails` opens a row's details below it. On a narrow frame the columns with a
 * `priority` hide, the lowest first, and their values move into the details.
 */
@Component({
  selector: 'demo-datatable-details',
  imports: [PctDataTable, PctTableDetails, PctDetailsTemplate, PctButton],
  styles: `
    div {
      display: flex;
      flex-wrap: wrap;
      gap: var(--pct-space-2);
      margin-block-end: var(--pct-space-3);
    }
  `,
  template: `
    <div role="group" aria-label="Width of the table">
      @for (each of widths; track each) {
        <button
          pctButton
          variant="ghost"
          size="sm"
          [attr.aria-pressed]="width() === each"
          (click)="width.set(each)"
        >
          {{ each === null ? 'Full width' : each + ' px' }}
        </button>
      }
    </div>
    <pct-data-table
      #table="pctDataTable"
      caption="Rules"
      pctTableDetails
      [(details)]="open"
      [style.max-inline-size.px]="width()"
      [rows]="rules"
      [columns]="columns"
      [rowId]="byId"
    >
      <ng-template [pctDetails]="columns" let-rule>
        Register {{ rule.address }} in the {{ rule.room.toLowerCase() }}.
      </ng-template>
    </pct-data-table>
    <p>Hidden columns: {{ table.hiddenColumns().join(', ') || 'none' }}</p>
  `,
})
export class DatatableDetailsDemo {
  readonly widths = [null, 360] as const;
  readonly width = signal<number | null>(null);
  readonly open = signal<readonly PctRowId[]>([1]);
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('room', { header: 'Room', priority: 1 }),
    col.key('address', { header: 'Address', numeric: true, priority: 3 }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
      priority: 2,
    }),
  ]);
  readonly byId = (rule: Rule) => rule.id;
  readonly rules: readonly Rule[] = [
    { id: 1, name: 'Heater', room: 'Kitchen', address: 4096, energy: 4.2 },
    { id: 2, name: 'Lamp', room: 'Hall', address: 4100, energy: 0.3 },
    { id: 3, name: 'Boiler', room: 'Kitchen', address: 4104, energy: 6.8 },
  ];
}
