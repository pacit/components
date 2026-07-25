import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  form,
  FormField,
  required,
  requiredError,
  ValidationError,
} from '@angular/forms/signals';
import { PctSelect } from './select';
import { PctSelectOption } from './select.types';

const OPTIONS: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Polska' },
  { value: 'de', label: 'Niemcy' },
  { value: 'cz', label: 'Czechy', disabled: true },
  { value: 'sk', label: 'Słowacja' },
];

const triggerOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="trigger"]',
  ) as HTMLButtonElement;

/** Panel renderuje się w nakładce CDK — poza drzewem komponentu. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const optionsInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="option"]'),
  ) as HTMLElement[];

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
): Promise<void> {
  triggerOf(fixture).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true }),
  );
  fixture.detectChanges();
  await fixture.whenStable();
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    [label]="label()"
    [hint]="hint()"
    [options]="options()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('Kraj');
  hint = signal('');
  options = signal<readonly PctSelectOption[]>(OPTIONS);
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  value = signal('');
  touchCount = 0;
}

@Component({
  imports: [PctSelect, FormField],
  template: `<pct-select
    label="Kraj"
    [options]="options"
    [formField]="f.country"
  />`,
})
class SignalFormHost {
  options = OPTIONS;
  model = signal({ country: '' });
  f = form(this.model, (p) => {
    required(p.country, { message: 'Wybierz kraj' });
  });
}

@Component({
  imports: [PctSelect, ReactiveFormsModule],
  template: `<pct-select [options]="options" [formControl]="ctrl" />`,
})
class ReactiveHost {
  options = OPTIONS;
  ctrl = new FormControl('de');
}

@Component({
  imports: [PctSelect, FormsModule],
  template: `<pct-select [options]="options" [(ngModel)]="country" />`,
})
class NgModelHost {
  options = OPTIONS;
  country = 'de';
}

describe('PctSelect', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('trigger realizuje wzorzec combobox i jest zamknięty na start', async () => {
    const fixture = await render(Host);
    const trigger = triggerOf(fixture);

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(panel()).toBeNull();
  });

  it('pokazuje tekst zastępczy, dopóki nic nie wybrano', async () => {
    const fixture = await render(Host);
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="placeholder"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="value"]'),
    ).toBeNull();
  });

  it('kliknięcie otwiera panel z rolą listbox i opcjami', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(panel()?.getAttribute('role')).toBe('listbox');
    expect(optionsInPanel()).toHaveLength(4);
    expect(triggerOf(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(triggerOf(fixture).getAttribute('aria-controls')).toBe(panel()!.id);
  });

  it('wybór opcji ustawia wartość, zamyka panel i pokazuje etykietę', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    optionsInPanel()[1].click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('de');
    expect(panel()).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="value"]')
        ?.textContent,
    ).toContain('Niemcy');
  });

  it('kliknięcie wyłączonej opcji nie zmienia wartości', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    optionsInPanel()[2].click(); // Czechy (disabled)
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
    expect(panel()).not.toBeNull(); // panel zostaje otwarty
  });

  describe('klawiatura (własna implementacja — brak natywnego odpowiednika)', () => {
    it('strzałka w dół otwiera panel i aktywuje pierwszą opcję', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      expect(panel()).not.toBeNull();
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
      expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
        optionsInPanel()[0].id,
      );
    });

    it('strzałki przesuwają aktywną opcję, pomijając wyłączone', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown'); // otwarcie, aktywne: Polska
      await press(fixture, 'ArrowDown'); // Niemcy
      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowDown'); // pomija Czechy -> Słowacja
      expect(optionsInPanel()[2].hasAttribute('data-pct-active')).toBe(false);
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowUp'); // wraca do Niemiec
      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);
    });

    it('Home i End skaczą na pierwszą i ostatnią dostępną opcję', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'End');
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'Home');
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('Enter wybiera aktywną opcję', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown');
      await press(fixture, 'Enter');

      expect(fixture.componentInstance.value()).toBe('de');
      expect(panel()).toBeNull();
    });

    it('Escape zamyka panel bez zmiany wartości', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'Escape');

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.value()).toBe('');
    });

    it('pisanie liter aktywuje pasującą opcję (typeahead)', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'n'); // Niemcy

      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);
    });

    it('otwarcie aktywuje już wybraną opcję', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set('sk');
      fixture.detectChanges();
      await fixture.whenStable();

      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);
    });
  });

  it('disabled blokuje otwarcie', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(triggerOf(fixture).disabled).toBe(true);
    await press(fixture, 'ArrowDown');
    expect(panel()).toBeNull();
  });

  it('readonly pozwala otworzyć fokus, ale nie zmienić wartości', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = triggerOf(fixture);
    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-readonly')).toBe('true');

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.value()).toBe('');
  });

  it('nie pokazuje błędu, dopóki kontrolka nie została dotknięta', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Wybierz kraj' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="error"]'),
    ).toBeNull();
    expect(triggerOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('po dotknięciu wiąże błąd przez aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Wybierz kraj' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = triggerOf(fixture);
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="error"]',
    );
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(trigger.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('blur emituje touch', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('pusta lista opcji pokazuje komunikat zastępczy', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.options.set([]);
    fixture.detectChanges();
    await fixture.whenStable();

    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(document.querySelector('[data-pct-part="empty"]')).not.toBeNull();
  });

  describe('signal forms', () => {
    it('synchronizuje wybór z modelem i propaguje walidację', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;

      expect(host.f.country().valid()).toBe(false);

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      optionsInPanel()[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.model().country).toBe('pl');
      expect(host.f.country().valid()).toBe(true);
    });
  });

  describe('kompatybilność z klasycznymi formularzami (bez CVA)', () => {
    it('reactive forms: [formControl] synchronizuje w obie strony', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Niemcy');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      optionsInPanel()[0].click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(ctrl.value).toBe('pl');

      ctrl.setValue('sk');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Słowacja');
    });

    it('template-driven: [(ngModel)] synchronizuje w obie strony', async () => {
      const fixture = await render(NgModelHost);
      await fixture.whenStable();

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Niemcy');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      optionsInPanel()[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.country).toBe('pl');
    });
  });
});
