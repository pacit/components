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
import { PctInput } from './input';

const inputOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

// Host z pełnym API prezentacyjnym.
@Component({
  imports: [PctInput],
  template: `<pct-input
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('E-mail');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  value = signal('');
  touchCount = 0;
}

// Hosty sprawdzające kompatybilność z klasycznymi formularzami.
@Component({
  imports: [PctInput, ReactiveFormsModule],
  template: `<pct-input [formControl]="ctrl" />`,
})
class ReactiveHost {
  ctrl = new FormControl('start');
}

@Component({
  imports: [PctInput, FormsModule],
  template: `<pct-input [(ngModel)]="text" />`,
})
class NgModelHost {
  text = 'start';
}

// Host używający signal forms — natywna ścieżka (wym-api-5).
@Component({
  imports: [PctInput, FormField],
  template: `<pct-input label="E-mail" [formField]="f.email" />`,
})
class SignalFormHost {
  model = signal({ email: '' });
  f = form(this.model, (p) => {
    required(p.email, { message: 'Pole wymagane' });
  });
}

describe('PctInput', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renderuje natywny input z etykietą powiązaną przez for/id', async () => {
    const fixture = await render(Host);
    const el = fixture.nativeElement as HTMLElement;
    const input = inputOf(fixture);
    const label = el.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLLabelElement;

    expect(input.tagName).toBe('INPUT');
    expect(label.textContent?.trim()).toContain('E-mail');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it('wpisanie tekstu aktualizuje dwukierunkowo związaną wartość', async () => {
    const fixture = await render(Host);
    const input = inputOf(fixture);

    input.value = 'ala@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('ala@example.com');
  });

  it('podpowiedź jest powiązana przez aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('Użyj adresu firmowego');
    fixture.detectChanges();
    await fixture.whenStable();

    const input = inputOf(fixture);
    const hint = fixture.nativeElement.querySelector('[data-pct-part="hint"]');
    expect(input.getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('nie pokazuje błędu, dopóki pole nie zostało dotknięte', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Pole wymagane' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // invalid=true, ale touched=false → pusty formularz nie świeci na czerwono
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="error"]'),
    ).toBeNull();
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('blur emituje touch, co pozwala formularzowi oznaczyć pole', async () => {
    const fixture = await render(Host);
    inputOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('stan błędu ustawia aria-invalid, rolę alert i opis błędu', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Nieprawidłowy adres' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const input = inputOf(fixture);
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="error"]',
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.trim()).toBe('Nieprawidłowy adres');
    expect(input.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('required oznacza pole natywnie i wizualnie', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).hasAttribute('required')).toBe(true);
  });

  it('disabled blokuje natywny input', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).disabled).toBe(true);
  });

  describe('signal forms', () => {
    it('dwukierunkowo synchronizuje wartość z modelem formularza', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);

      // model -> widok
      host.model.set({ email: 'z-modelu@example.com' });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input.value).toBe('z-modelu@example.com');

      // widok -> model
      input.value = 'z-widoku@example.com';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(host.model().email).toBe('z-widoku@example.com');
    });

    it('propaguje stan walidacji (required) do kontrolki', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;

      expect(host.f.email().valid()).toBe(false);

      host.model.set({ email: 'ok@example.com' });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.f.email().valid()).toBe(true);
    });
  });

  // Kontrolka `FormValueControl` działa z reactive i template-driven forms
  // BEZ ControlValueAccessor. Testy pilnują tej właściwości — gdyby przestała
  // obowiązywać, biblioteka straciłaby kompatybilność z istniejącymi aplikacjami.
  describe('kompatybilność z klasycznymi formularzami (bez CVA)', () => {
    it('reactive forms: [formControl] synchronizuje w obie strony', async () => {
      const fixture = await render(ReactiveHost);
      const input = inputOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(input.value).toBe('start');

      input.value = 'z-widoku';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(ctrl.value).toBe('z-widoku');

      ctrl.setValue('z-kontrolki');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input.value).toBe('z-kontrolki');
    });

    it('template-driven: [(ngModel)] synchronizuje w obie strony', async () => {
      const fixture = await render(NgModelHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);
      await fixture.whenStable();

      expect(input.value).toBe('start');

      input.value = 'z-widoku';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(host.text).toBe('z-widoku');
    });
  });
});
