import { Component } from '@angular/core';
import { PctBadge } from '@pacit/components/badge';
import type { PctTone } from '@pacit/components/core';

/**
 * A column of statuses
 *
 * Where a tone earns its keep: one column, one word per row, and the colour repeating what
 * the word already says. The word is what a screen reader reads — the tone is for the eye
 * that scans the column and stops at the red one. The last row binds `null`, which is how
 * a badge asks for no tone at all.
 */
@Component({
  selector: 'demo-badge-statuses',
  imports: [PctBadge],
  styles: `
    :host {
      display: block;
    }
    table {
      border-collapse: collapse;
      width: 100%;
      max-width: 32rem;
    }
    th,
    td {
      text-align: start;
      padding: 8px 12px;
      border-bottom: 1px solid var(--pct-border);
    }
    th {
      font-weight: 600;
    }
  `,
  template: `
    <table>
      <thead>
        <tr>
          <th scope="col">Invoice</th>
          <th scope="col">State</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track row.id) {
          <tr>
            <td>{{ row.id }}</td>
            <td>
              <pct-badge [tone]="row.tone">{{ row.state }}</pct-badge>
            </td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
export class BadgeStatusesDemo {
  readonly rows: { id: string; state: string; tone: PctTone | null }[] = [
    { id: '#1043', state: 'Paid', tone: 'success' },
    { id: '#1044', state: 'Due in 3 days', tone: 'warning' },
    { id: '#1045', state: 'Overdue', tone: 'danger' },
    { id: '#1046', state: 'Scheduled', tone: 'info' },
    { id: '#1047', state: 'Draft', tone: null },
  ];
}
