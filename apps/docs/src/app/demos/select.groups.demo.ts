import { Component, signal } from '@angular/core';
import { PctSelect, PctSelectItem } from '@pacit/components/select';

/**
 * Groups, and a filter
 *
 * An item can be a group — a label with options under it — and `filterable` turns the
 * trigger into an input that narrows the list as you type, the filter matching labels.
 */
@Component({
  selector: 'demo-select-groups',
  imports: [PctSelect],
  styles: ':host { display: grid; gap: 12px; max-inline-size: 24rem; }',
  template: `
    <pct-select
      label="Region"
      [options]="regions"
      [(value)]="region"
      filterable
    />
    <p>Deploying to: {{ region() ?? 'nowhere yet' }}</p>
  `,
})
export class SelectGroupsDemo {
  readonly region = signal<string | null>(null);
  readonly regions: readonly PctSelectItem[] = [
    {
      label: 'Europe',
      options: [
        { value: 'eu-west', label: 'West' },
        { value: 'eu-central', label: 'Central' },
      ],
    },
    {
      label: 'Americas',
      options: [
        { value: 'us-east', label: 'US East' },
        { value: 'sa-east', label: 'South America' },
      ],
    },
    {
      label: 'Asia Pacific',
      options: [
        { value: 'ap-south', label: 'South' },
        { value: 'ap-ne', label: 'North East', disabled: true },
      ],
    },
  ];
}
