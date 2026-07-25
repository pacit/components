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
  { value: 'pl', label: 'Polska' },
  { value: 'de', label: 'Niemcy' },
];

@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Kraj" [hint]="hint()">
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
  template: `<pct-field label="Plan" hint="Do wyboru">
    <pct-radio-group [(value)]="value">
      <pct-radio value="free">Darmowy</pct-radio>
      <pct-radio value="pro">Pro</pct-radio>
    </pct-radio-group>
  </pct-field>`,
})
class RadioInFieldHost {
  value = signal('');
}

/** Ta sama kontrolka poza obudową — musi rysować własną etykietę. */
@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox label="Samodzielny" hint="Własna podpowiedź" />`,
})
class CheckboxStandaloneHost {}

describe('Kontrolki w obudowie pct-field', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('PctSelect', () => {
    it('oddaje etykietę obudowie i nie renderuje własnej', async () => {
      const fixture = await render(SelectInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const trigger = part(fixture, 'trigger');

      // Dokładnie jedna etykieta — należy do obudowy i wskazuje trigger.
      expect(labels).toHaveLength(1);
      expect(labels[0].closest('pct-field')).toBeTruthy();
      expect(labels[0].getAttribute('for')).toBe(trigger.id);
    });

    it('obudowa rysuje ramkę, a trigger ją oddaje', async () => {
      const fixture = await render(SelectInFieldHost);
      const host = fixture.nativeElement.querySelector('pct-select');
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(host.hasAttribute('data-pct-in-field')).toBe(true);
      // Ramka jest wariantu `boxed` — select jej potrzebuje.
      expect(field.getAttribute('data-pct-appearance')).toBe('boxed');
    });

    it('podpowiedź i błąd renderuje obudowa, nie kontrolka', async () => {
      const fixture = await render(SelectInFieldHost);
      fixture.componentInstance.hint.set('Wybierz z listy');
      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'Kraj jest wymagany' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(allParts(fixture, 'field-hint')).toHaveLength(1);
      expect(allParts(fixture, 'field-error')).toHaveLength(1);
      expect(part(fixture, 'field-error').closest('pct-field')).toBeTruthy();

      // Komunikaty obudowy są powiązane z triggerem.
      const trigger = part(fixture, 'trigger');
      expect(trigger.getAttribute('aria-describedby')).toContain(
        part(fixture, 'field-hint').id,
      );
      expect(trigger.getAttribute('aria-describedby')).toContain(
        part(fixture, 'field-error').id,
      );
    });
  });

  describe('PctCheckbox', () => {
    it('obudowa nie rysuje ramki wokół checkboxa (wariant bare)', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('oddaje etykietę obudowie, ale zachowuje powiązanie z natywnym inputem', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const input = fixture.nativeElement.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;

      expect(labels).toHaveLength(1);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });

    it('poza obudową rysuje własną etykietę i podpowiedź', async () => {
      const fixture = await render(CheckboxStandaloneHost);

      expect(part(fixture, 'label').textContent).toContain('Samodzielny');
      expect(part(fixture, 'hint').textContent).toContain('Własna podpowiedź');
      expect(fixture.nativeElement.querySelector('pct-field')).toBeNull();
    });
  });

  describe('PctRadioGroup', () => {
    it('nazywa grupę przez aria-labelledby wskazujące etykietę obudowy', async () => {
      const fixture = await render(RadioInFieldHost);
      const group = fixture.nativeElement.querySelector('pct-radio-group');
      const label = part(fixture, 'field-label');

      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.closest('pct-field')).toBeTruthy();
    });

    it('nie renderuje własnej etykiety grupy w obudowie', async () => {
      const fixture = await render(RadioInFieldHost);
      expect(allParts(fixture, 'group-label')).toHaveLength(0);
      expect(allParts(fixture, 'group-hint')).toHaveLength(0);
    });

    it('obudowa nie rysuje ramki wokół grupy (wariant bare)', async () => {
      const fixture = await render(RadioInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');
      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('wybór opcji nadal działa w obudowie', async () => {
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
