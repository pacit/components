import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { requiredError, ValidationError } from '@angular/forms/signals';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect, PctSelectOption } from '@pacit/components/select';
import { allParts, part } from '../../testing/src/dom';
import { PctField } from './field';

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const OPTIONS: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Poland' },
  { value: 'de', label: 'Germany' },
];

@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Country" [hint]="hint()">
    <pct-select
      [options]="options"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [(value)]="value"
    />
  </pct-field>`,
})
class SelectInFieldHost {
  options = OPTIONS;
  hint = signal('');
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  value = signal('');
}

@Component({
  imports: [PctField, PctCheckbox],
  template: `<pct-field label="Zgody" hint="Wymagane">
    <pct-checkbox [(checked)]="checked" />
  </pct-field>`,
})
class CheckboxInFieldHost {
  checked = signal(false);
}

@Component({
  imports: [PctField, PctRadioGroup, PctRadio],
  template: `<pct-field label="Plan" hint="Pick one">
    <pct-radio-group [(value)]="value">
      <pct-radio value="free">Free</pct-radio>
      <pct-radio value="pro">Pro</pct-radio>
    </pct-radio-group>
  </pct-field>`,
})
class RadioInFieldHost {
  value = signal('');
}

/** The same control outside the wrapper — it has to draw its own label. */
@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox label="Standalone" hint="Its own hint" />`,
})
class CheckboxStandaloneHost {}

describe('Controls inside the pct-field wrapper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('PctSelect', () => {
    it('hands the label over to the wrapper and renders none of its own', async () => {
      const fixture = await render(SelectInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const trigger = part(fixture, 'trigger');

      // Exactly one label — it belongs to the wrapper and points at the trigger.
      expect(labels).toHaveLength(1);
      expect(labels[0].closest('pct-field')).toBeTruthy();
      expect(labels[0].getAttribute('for')).toBe(trigger.id);
    });

    it('the wrapper draws the border and the trigger gives it up', async () => {
      const fixture = await render(SelectInFieldHost);
      const host = fixture.nativeElement.querySelector('pct-select');
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(host.hasAttribute('data-pct-in-field')).toBe(true);
      // The border is the `boxed` appearance — the select needs it.
      expect(field.getAttribute('data-pct-appearance')).toBe('boxed');
    });

    it('the wrapper renders the hint and the error, not the control (one line)', async () => {
      const fixture = await render(SelectInFieldHost);
      const trigger = part(fixture, 'trigger');

      // The hint alone: the wrapper draws it and binds it to the trigger.
      fixture.componentInstance.hint.set('Pick from the list');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(part(fixture, 'field-hint').closest('pct-field')).toBeTruthy();
      expect(trigger.getAttribute('aria-describedby')).toContain(
        part(fixture, 'field-hint').id,
      );

      // The error takes over the only line below the field — the hint gives way.
      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'Country is required' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(allParts(fixture, 'field-hint')).toHaveLength(0);
      expect(allParts(fixture, 'field-error')).toHaveLength(1);
      expect(part(fixture, 'field-error').closest('pct-field')).toBeTruthy();
      expect(trigger.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-error').id,
      );
    });
  });

  describe('PctCheckbox', () => {
    it('the wrapper draws no border around a checkbox (the bare appearance)', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('hands the label to the wrapper but keeps it bound to the native input', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const input = fixture.nativeElement.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;

      expect(labels).toHaveLength(1);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });

    it('outside the wrapper it draws its own label and hint', async () => {
      const fixture = await render(CheckboxStandaloneHost);

      expect(part(fixture, 'label').textContent).toContain('Standalone');
      expect(part(fixture, 'hint').textContent).toContain('Its own hint');
      expect(fixture.nativeElement.querySelector('pct-field')).toBeNull();
    });
  });

  describe('PctRadioGroup', () => {
    it('names the group through aria-labelledby pointing at the wrapper label', async () => {
      const fixture = await render(RadioInFieldHost);
      const group = fixture.nativeElement.querySelector('pct-radio-group');
      const label = part(fixture, 'field-label');

      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.closest('pct-field')).toBeTruthy();
    });

    it('renders no group label of its own inside the wrapper', async () => {
      const fixture = await render(RadioInFieldHost);
      expect(allParts(fixture, 'group-label')).toHaveLength(0);
      expect(allParts(fixture, 'group-hint')).toHaveLength(0);
    });

    it('the wrapper draws no border around a group (the bare appearance)', async () => {
      const fixture = await render(RadioInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');
      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('picking an option still works inside the wrapper', async () => {
      const fixture = await render(RadioInFieldHost);
      const radios = Array.from(
        fixture.nativeElement.querySelectorAll('input[type="radio"]'),
      ) as HTMLInputElement[];

      radios[1].click();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe('pro');
    });
  });
});
