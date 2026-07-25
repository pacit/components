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
import { PctRadio } from './radio';
import { PctRadioGroup } from './radio-group';

const radiosOf = (f: ComponentFixture<unknown>) =>
  Array.from(
    f.nativeElement.querySelectorAll('input[type="radio"]'),
  ) as HTMLInputElement[];

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  >
    <pct-radio value="free">Darmowy</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
    <pct-radio value="enterprise" disabled>Enterprise</pct-radio>
  </pct-radio-group>`,
})
class Host {
  label = signal('Plan');
  hint = signal('');
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
  imports: [PctRadioGroup, PctRadio, FormField],
  template: `<pct-radio-group label="Plan" [formField]="f.plan">
    <pct-radio value="free">Darmowy</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class SignalFormHost {
  model = signal({ plan: '' });
  f = form(this.model, (p) => {
    required(p.plan, { message: 'Wybierz plan' });
  });
}

@Component({
  imports: [PctRadioGroup, PctRadio, ReactiveFormsModule],
  template: `<pct-radio-group [formControl]="ctrl">
    <pct-radio value="free">Darmowy</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class ReactiveHost {
  ctrl = new FormControl('pro');
}

@Component({
  imports: [PctRadioGroup, PctRadio, FormsModule],
  template: `<pct-radio-group [(ngModel)]="plan">
    <pct-radio value="free">Darmowy</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class NgModelHost {
  plan = 'pro';
}

// Dwie niezależne grupy — sprawdza, że nazwy nie kolidują.
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `
    <pct-radio-group [(value)]="a">
      <pct-radio value="1">A1</pct-radio>
      <pct-radio value="2">A2</pct-radio>
    </pct-radio-group>
    <pct-radio-group [(value)]="b">
      <pct-radio value="1">B1</pct-radio>
      <pct-radio value="2">B2</pct-radio>
    </pct-radio-group>
  `,
})
class TwoGroupsHost {
  a = signal('');
  b = signal('');
}

describe('PctRadioGroup / PctRadio', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('host grupy ma rolę radiogroup i etykietę powiązaną przez aria-labelledby', async () => {
    const fixture = await render(Host);
    const group = fixture.nativeElement.querySelector('pct-radio-group');
    const label = group.querySelector('[data-pct-part="group-label"]');

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.textContent?.trim()).toContain('Plan');
  });

  it('wszystkie opcje dzielą wspólny atrybut name (natywna grupa)', async () => {
    const fixture = await render(Host);
    const names = new Set(radiosOf(fixture).map((r) => r.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it('dwie grupy na stronie mają różne nazwy i niezależny stan', async () => {
    const fixture = await render(TwoGroupsHost);
    const [a1, a2, b1] = radiosOf(fixture);

    expect(a1.name).not.toBe(b1.name);

    a2.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.a()).toBe('2');
    expect(fixture.componentInstance.b()).toBe('');

    b1.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.a()).toBe('2');
    expect(fixture.componentInstance.b()).toBe('1');
  });

  it('wybór opcji aktualizuje wartość grupy i odznacza pozostałe', async () => {
    const fixture = await render(Host);
    const [free, pro] = radiosOf(fixture);

    free.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('free');
    expect(free.checked).toBe(true);

    pro.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('pro');
    expect(pro.checked).toBe(true);
    expect(free.checked).toBe(false);
  });

  it('wartość ustawiona z zewnątrz zaznacza właściwą opcję', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('pro');
    fixture.detectChanges();
    await fixture.whenStable();

    const [free, pro] = radiosOf(fixture);
    expect(pro.checked).toBe(true);
    expect(free.checked).toBe(false);
  });

  it('pojedyncza opcja może być wyłączona niezależnie od grupy', async () => {
    const fixture = await render(Host);
    const [free, pro, enterprise] = radiosOf(fixture);

    expect(free.disabled).toBe(false);
    expect(pro.disabled).toBe(false);
    expect(enterprise.disabled).toBe(true);
  });

  it('wyłączenie grupy wyłącza wszystkie opcje', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(radiosOf(fixture).every((r) => r.disabled)).toBe(true);
  });

  it('readonly blokuje zmianę wyboru, ale opcje zostają fokusowalne', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const [free] = radiosOf(fixture);
    free.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
    expect(free.disabled).toBe(false);
    expect(free.getAttribute('aria-readonly')).toBe('true');
  });

  it('blur na dowolnej opcji oznacza grupę jako dotkniętą', async () => {
    const fixture = await render(Host);
    radiosOf(fixture)[1].dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('nie pokazuje błędu, dopóki grupa nie została dotknięta', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Wybierz plan' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="group-error"]'),
    ).toBeNull();
    const group = fixture.nativeElement.querySelector('pct-radio-group');
    expect(group.getAttribute('aria-invalid')).toBeNull();
  });

  it('po dotknięciu wiąże błąd z grupą przez aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Wybierz plan' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.nativeElement.querySelector('pct-radio-group');
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="group-error"]',
    );
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(group.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('focus() grupy trafia w wybraną opcję, a bez wyboru w pierwszą', async () => {
    const fixture = await render(Host);
    const groupInstance = fixture.debugElement.children[0]
      .componentInstance as PctRadioGroup;
    const [free, pro] = radiosOf(fixture);

    groupInstance.focus();
    expect(document.activeElement).toBe(free);

    fixture.componentInstance.value.set('pro');
    fixture.detectChanges();
    await fixture.whenStable();

    groupInstance.focus();
    expect(document.activeElement).toBe(pro);
  });

  describe('signal forms', () => {
    it('synchronizuje wybór z modelem i propaguje walidację', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;

      expect(host.f.plan().valid()).toBe(false);

      radiosOf(fixture)[1].click();
      await fixture.whenStable();

      expect(host.model().plan).toBe('pro');
      expect(host.f.plan().valid()).toBe(true);
    });
  });

  describe('kompatybilność z klasycznymi formularzami (bez CVA)', () => {
    it('reactive forms: [formControl] synchronizuje w obie strony', async () => {
      const fixture = await render(ReactiveHost);
      const [free, pro] = radiosOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(pro.checked).toBe(true);

      free.click();
      await fixture.whenStable();
      expect(ctrl.value).toBe('free');

      ctrl.setValue('pro');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(pro.checked).toBe(true);
    });

    it('template-driven: [(ngModel)] synchronizuje w obie strony', async () => {
      const fixture = await render(NgModelHost);
      await fixture.whenStable();
      const [free, pro] = radiosOf(fixture);

      expect(pro.checked).toBe(true);

      free.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.plan).toBe('free');
    });
  });
});
