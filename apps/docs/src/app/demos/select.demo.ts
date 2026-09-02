import { Component, signal } from '@angular/core';
import { PctSelect, PctSelectOption } from '@pacit/components/select';

/** A listbox with a keyboard-first life: type to jump, arrows to walk, Enter to take. */
@Component({
  selector: 'demo-select',
  imports: [PctSelect],
  styles: ':host { display: block; max-inline-size: 24rem; }',
  template: `
    <pct-select ariaLabel="Country" [options]="countries" [(value)]="country" />
    <p>Shipping to: {{ country() ?? 'nowhere yet' }}</p>
  `,
})
export class SelectDemo {
  readonly countries: readonly PctSelectOption[] = [
    { value: 'pl', label: 'Poland' },
    { value: 'de', label: 'Germany' },
    { value: 'cz', label: 'Czechia', disabled: true },
    { value: 'ua', label: 'Ukraine' },
  ];
  readonly country = signal<string | null>('pl');
}
