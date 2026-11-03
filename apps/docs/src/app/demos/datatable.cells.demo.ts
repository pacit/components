import { Component, signal } from '@angular/core';
import { PctSwitch } from '@pacit/components/switch';
import {
  PctCellTemplate,
  PctDataTable,
  pctColumnsOf,
} from '@pacit/components/table';

interface Rule {
  readonly id: number;
  readonly name: string;
  readonly energy: number | null;
  readonly nextAt: number;
  readonly enabled: boolean;
}

const col = pctColumnsOf<Rule>();
const NOW = Date.UTC(2026, 9, 29, 12, 0);

/**
 * Column kinds and your own cells
 *
 * A column's `kind` formats its values — a number with a unit, a relative time, a yes or no —
 * and sorts and filters by them. A `pctCell` template draws a column itself, typed by the row.
 */
@Component({
  selector: 'demo-datatable-cells',
  imports: [PctDataTable, PctCellTemplate, PctSwitch],
  template: `
    <pct-data-table
      caption="Rules"
      [rows]="rules()"
      [columns]="columns"
      [rowId]="byId"
      [now]="now"
    >
      <ng-template
        [pctCell]="columns"
        pctCellOf="enabled"
        let-rule
        let-on="value"
      >
        <pct-switch
          [checked]="on"
          [ariaLabel]="'Enabled: ' + rule.name"
          (checkedChange)="toggle(rule, $event)"
        />
      </ng-template>
    </pct-data-table>
  `,
})
export class DatatableCellsDemo {
  readonly now = NOW;
  readonly columns = col.of([
    col.key('name', { header: 'Name' }),
    col.key('energy', {
      header: 'Energy',
      kind: { number: { unit: 'kWh', fractionDigits: 1 } },
    }),
    col.key('nextAt', {
      header: 'Next run',
      kind: { instant: { relative: true, timeZone: 'Europe/Warsaw' } },
    }),
    col.key('enabled', { header: 'Enabled', kind: 'boolean', sort: false }),
  ]);
  readonly byId = (rule: Rule) => rule.id;
  readonly rules = signal<readonly Rule[]>([
    {
      id: 1,
      name: 'Heater',
      energy: 4.2,
      nextAt: NOW + 15 * 60_000,
      enabled: true,
    },
    {
      id: 2,
      name: 'Lamp',
      energy: null,
      nextAt: NOW + 3 * 3_600_000,
      enabled: false,
    },
    {
      id: 3,
      name: 'Boiler',
      energy: 6.8,
      nextAt: NOW + 26 * 3_600_000,
      enabled: true,
    },
  ]);

  protected toggle(rule: Rule, enabled: boolean): void {
    this.rules.update((rules) =>
      rules.map((r) => (r.id === rule.id ? { ...r, enabled } : r)),
    );
  }
}
