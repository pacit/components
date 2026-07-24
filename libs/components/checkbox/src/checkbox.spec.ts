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
import { PctCheckbox } from './checkbox';

const boxOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [indeterminate]="indeterminate()"
    [(checked)]="checked"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('Akceptuję regulamin');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  indeterminate = signal(false);
  checked = signal(false);
  touchCount = 0;
}

@Component({
  imports: [PctCheckbox, FormField],
  template: `<pct-checkbox label="Regulamin" [formField]="f.terms" />`,
})
class SignalFormHost {
  model = signal({ terms: false });
  f = form(this.model, (p) => {
    required(p.terms, { message: 'Zgoda jest wymagana' });
  });
}

@Component({
  imports: [PctCheckbox, ReactiveFormsModule],
  template: `<pct-checkbox [formControl]="ctrl" />`,
})
class ReactiveHost {
  ctrl = new FormControl(true);
}

@Component({
  imports: [PctCheckbox, FormsModule],
  template: `<pct-checkbox [(ngModel)]="agreed" />`,
})
class NgModelHost {
  agreed = true;
}

describe('PctCheckbox', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renderuje natywny checkbox z etykietą powiązaną przez for/id', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);
    const label = fixture.nativeElement.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLLabelElement;

    expect(box.type).toBe('checkbox');
    expect(label.getAttribute('for')).toBe(box.id);
    expect(label.textContent?.trim()).toContain('Akceptuję regulamin');
  });

  it('kliknięcie przełącza dwukierunkowo związany stan', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(true);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('stan nieokreślony ustawia aria-checked="mixed" i natywną właściwość', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('readonly blokuje zmianę stanu, ale pole pozostaje fokusowalne', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    box.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.checked()).toBe(false);
    expect(box.disabled).toBe(false); // w odróżnieniu od disabled
    expect(box.getAttribute('aria-readonly')).toBe('true');
  });

  it('nie pokazuje błędu, dopóki pole nie zostało dotknięte', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Zgoda wymagana' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="error"]'),
    ).toBeNull();
    expect(boxOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('po dotknięciu pokazuje błąd z rolą alert i wiąże go przez aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Zgoda wymagana' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="error"]',
    );
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(box.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('blur emituje touch', async () => {
    const fixture = await render(Host);
    boxOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('disabled blokuje natywny checkbox', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(boxOf(fixture).disabled).toBe(true);
  });

  it('udostępnia metody focus() i reset() z kontraktu', async () => {
    const fixture = await render(Host);
    const instance = fixture.debugElement.children[0]
      .componentInstance as PctCheckbox;

    instance.focus();
    expect(document.activeElement).toBe(boxOf(fixture));

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    instance.reset();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  describe('signal forms', () => {
    it('synchronizuje stan z modelem i propaguje walidację', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const box = boxOf(fixture);

      expect(host.f.terms().valid()).toBe(false);

      box.click();
      await fixture.whenStable();
      expect(host.model().terms).toBe(true);
      expect(host.f.terms().valid()).toBe(true);
    });
  });

  describe('kompatybilność z klasycznymi formularzami (bez CVA)', () => {
    it('reactive forms: [formControl] synchronizuje w obie strony', async () => {
      const fixture = await render(ReactiveHost);
      const box = boxOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(box.checked).toBe(true);

      box.click();
      await fixture.whenStable();
      expect(ctrl.value).toBe(false);

      ctrl.setValue(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(box.checked).toBe(true);
    });

    it('template-driven: [(ngModel)] synchronizuje w obie strony', async () => {
      const fixture = await render(NgModelHost);
      const box = boxOf(fixture);
      await fixture.whenStable();

      expect(box.checked).toBe(true);

      box.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.agreed).toBe(false);
    });
  });
});
