import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { email, form, FormField, required } from '@angular/forms/signals';
import { PctPrefix, PctSuffix } from './affix';
import { PctField } from './field';
import { PctText } from './text';

const inputOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;
const part = (f: ComponentFixture<unknown>, name: string) =>
  f.nativeElement.querySelector(
    `[data-pct-part="${name}"]`,
  ) as HTMLElement | null;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctField, PctText],
  template: `<pct-field [label]="label()" [hint]="hint()">
    <input
      pctText
      type="email"
      [required]="req()"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [disabled]="disabled()"
      [(value)]="value"
    />
  </pct-field>`,
})
class Host {
  label = signal('E-mail');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly { kind: string; message?: string }[]>([]);
  disabled = signal(false);
  value = signal('');
}

@Component({
  imports: [PctField, PctText, PctPrefix, PctSuffix],
  template: `<pct-field label="Cena">
    <span pctPrefix aria-hidden="true">PLN</span>
    <input pctText [(value)]="value" />
    <button pctSuffix type="button" aria-label="Wyczyść">×</button>
  </pct-field>`,
})
class AffixHost {
  value = signal('100');
}

@Component({
  imports: [PctField, PctText, FormField],
  template: `<pct-field label="E-mail" hint="Adres służbowy">
    <input pctText type="email" [formField]="f.email" />
  </pct-field>`,
})
class SignalFormHost {
  model = signal({ email: 'start@example.com' });
  f = form(this.model, (p) => {
    required(p.email, { message: 'Adres jest wymagany' });
    email(p.email, { message: 'Niepoprawny adres' });
  });
}

@Component({
  imports: [PctField, PctText, ReactiveFormsModule],
  template: `<pct-field label="E-mail">
    <input pctText [formControl]="ctrl" />
  </pct-field>`,
})
class ReactiveHost {
  ctrl = new FormControl('start');
}

@Component({
  imports: [PctField, PctText, FormsModule],
  template: `<pct-field label="E-mail">
    <input pctText [(ngModel)]="text" />
  </pct-field>`,
})
class NgModelHost {
  text = 'start';
}

/** Kontrolka bez obudowy — musi działać, tylko bez etykiety i komunikatów. */
@Component({
  imports: [PctText],
  template: `<input pctText [(value)]="value" />`,
})
class BareHost {
  value = signal('bez obudowy');
}

describe('PctField + PctText', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renderuje natywny input i wiąże etykietę obudowy przez for/id', async () => {
    const fixture = await render(Host);
    const input = inputOf(fixture);
    const label = part(fixture, 'field-label') as HTMLLabelElement;

    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('email');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it('wpisanie tekstu aktualizuje dwukierunkowo wiązaną wartość', async () => {
    const fixture = await render(Host);
    const input = inputOf(fixture);

    input.value = 'ala@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('ala@example.com');
  });

  it('zmiana wartości z zewnątrz trafia do natywnego inputu', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('z-modelu@example.com');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).value).toBe('z-modelu@example.com');
  });

  it('obudowa przekazuje kontrolce aria-describedby dla podpowiedzi', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('Adres służbowy');
    fixture.detectChanges();
    await fixture.whenStable();

    const hint = part(fixture, 'field-hint')!;
    expect(inputOf(fixture).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('wymagalność zgłoszona przez kontrolkę pokazuje znacznik w obudowie', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).hasAttribute('required')).toBe(true);
    expect(part(fixture, 'field-label')!.textContent).toContain('*');
  });

  it('błąd pojawia się dopiero po dotknięciu i jest wiązany z kontrolką', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      { kind: 'required', message: 'Adres jest wymagany' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // nietknięte -> brak błędu
    expect(part(fixture, 'field-error')).toBeNull();
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.touched.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const error = part(fixture, 'field-error')!;
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.trim()).toBe('Adres jest wymagany');
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(inputOf(fixture).getAttribute('aria-describedby')).toContain(
      error.id,
    );
  });

  it('wyłączenie kontrolki oznacza obudowę jako wyłączoną', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).disabled).toBe(true);
    const host = fixture.nativeElement.querySelector('pct-field');
    expect(host.hasAttribute('data-pct-disabled')).toBe(true);
  });

  describe('brak martwej strefy w ramce pola', () => {
    it('kliknięcie w padding ramki ustawia fokus na kontrolce', async () => {
      const fixture = await render(Host);
      const row = part(fixture, 'field-row')!;

      // Cel zdarzenia to sam rząd, czyli obszar paddingu — nie kontrolka.
      row.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('kliknięcie w dekorację prefix też fokusuje kontrolkę', async () => {
      const fixture = await render(AffixHost);
      const prefix = part(fixture, 'field-prefix')!;

      prefix.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('kliknięcie w przycisk slotu NIE przechwytuje fokusu na kontrolkę', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix')!.querySelector(
        'button',
      ) as HTMLButtonElement;

      btn.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      // Fokus nie został przeniesiony na input — przycisk obsługuje się sam.
      expect(document.activeElement).not.toBe(inputOf(fixture));
    });

    it('kontrolka wypełnia wysokość rzędu (brak martwej strefy w pionie)', async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row')!;
      const control = part(fixture, 'field-control')!;

      // W jsdom brak realnego layoutu, więc sprawdzamy zadeklarowany mechanizm.
      expect(getComputedStyle(control).alignSelf).toBe('stretch');
      expect(row.contains(control)).toBe(true);
    });
  });

  describe('sloty prefix/suffix', () => {
    it('renderują się wewnątrz rzędu pola, w kolejności prefix → pole → suffix', async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row')!;
      const order = Array.from(row.children).map((c) =>
        c.getAttribute('data-pct-part'),
      );

      expect(order).toEqual(['field-prefix', 'field-control', 'field-suffix']);
      expect(part(fixture, 'field-prefix')!.textContent).toContain('PLN');
      expect(
        part(fixture, 'field-suffix')!.querySelector('button'),
      ).toBeTruthy();
    });

    it('przycisk w slocie suffix jest osiągalny i ma nazwę dostępną', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix')!.querySelector(
        'button',
      ) as HTMLButtonElement;

      expect(btn.getAttribute('aria-label')).toBe('Wyczyść');
      btn.focus();
      expect(document.activeElement).toBe(btn);
    });
  });

  describe('signal forms', () => {
    it('pokazuje wartość początkową modelu', async () => {
      const fixture = await render(SignalFormHost);

      // Regresja: dyrektywa FormField dostarcza NgControl (interop dla CVA),
      // więc heurystyka „NgControl => ktoś inny pisze do DOM" wykluczała także
      // signal forms — a te przy własnej kontrolce ustawiają tylko `value`
      // i do DOM nie piszą. Pole startowało puste (wym-real-26).
      expect(inputOf(fixture).value).toBe('start@example.com');
    });

    it('synchronizuje wartość i pokazuje błąd walidacji po dotknięciu', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);

      input.value = 'to-nie-email';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.model().email).toBe('to-nie-email');
      expect(host.f.email().valid()).toBe(false);
      expect(part(fixture, 'field-error')?.textContent?.trim()).toBe(
        'Niepoprawny adres',
      );
    });
  });

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
      await fixture.whenStable();
      const input = inputOf(fixture);

      expect(input.value).toBe('start');
      input.value = 'z-widoku';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(fixture.componentInstance.text).toBe('z-widoku');
    });
  });

  it('kontrolka działa bez obudowy (obudowa jest opcjonalna)', async () => {
    const fixture = await render(BareHost);
    const input = inputOf(fixture);

    expect(input.value).toBe('bez obudowy');
    input.value = 'zmienione';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('zmienione');
  });
});
