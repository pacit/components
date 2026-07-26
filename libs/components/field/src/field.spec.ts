import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { email, form, FormField, required } from '@angular/forms/signals';
import { providePctConfig } from '@pacit/components/core';
import { allParts, part, query } from '../../testing/src/dom';
import { PctPrefix, PctSuffix } from './affix';
import { PctLabelAux, PctMessageAux } from './aux';
import { PctField } from './field';
import { PctFieldSize } from './field.types';
import { PctText } from './text';

const inputOf = (f: ComponentFixture<unknown>) =>
  query<HTMLInputElement>(f, 'input');

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

/** Pole z podpowiedzią i dwoma slotami pobocznymi (dodatek etykiety + komunikatu). */
@Component({
  imports: [PctField, PctText, PctLabelAux, PctMessageAux],
  template: `<pct-field label="Opis" [hint]="hint()">
    <button pctLabelAux type="button" aria-label="Pomoc">ⓘ</button>
    <input
      pctText
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [(value)]="value"
    />
    <span pctMessageAux>{{ value().length }}/120</span>
  </pct-field>`,
})
class AuxHost {
  hint = signal('Krótko o sobie');
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly { kind: string; message?: string }[]>([]);
  value = signal('');
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

@Component({
  imports: [PctField, PctText],
  template: `<pct-field label="E-mail" [size]="size()">
    <input pctText />
  </pct-field>`,
})
class SizeHost {
  size = signal<PctFieldSize>('lg');
}

/** Obudowa bez jawnej wielkości — bierze ją z globalnej konfiguracji. */
@Component({
  imports: [PctField, PctText],
  template: `<pct-field label="E-mail"><input pctText /></pct-field>`,
})
class DefaultSizeHost {}

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

    const hint = part(fixture, 'field-hint');
    expect(inputOf(fixture).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('wymagalność zgłoszona przez kontrolkę pokazuje znacznik w obudowie', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).hasAttribute('required')).toBe(true);
    expect(part(fixture, 'field-label').textContent).toContain('*');
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
    expect(allParts(fixture, 'field-error')).toHaveLength(0);
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.touched.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const error = part(fixture, 'field-error');
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
      const row = part(fixture, 'field-row');

      // Cel zdarzenia to sam rząd, czyli obszar paddingu — nie kontrolka.
      row.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('kliknięcie w dekorację prefix też fokusuje kontrolkę', async () => {
      const fixture = await render(AffixHost);
      const prefix = part(fixture, 'field-prefix');

      prefix.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('kliknięcie w przycisk slotu NIE przechwytuje fokusu na kontrolkę', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix').querySelector(
        'button',
      ) as HTMLButtonElement;

      btn.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      // Fokus nie został przeniesiony na input — przycisk obsługuje się sam.
      expect(document.activeElement).not.toBe(inputOf(fixture));
    });

    it('odstępy niesie wnętrze rzędu, nie sam rząd (brak strefy niczyjej)', async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row');

      // W jsdom brak realnego layoutu, więc sprawdzamy zadeklarowany mechanizm:
      // rząd nie ma własnego paddingu ani `gap`, a kolumny rozciągają się na
      // jego wysokość — inaczej większość powierzchni ramki nie należy do
      // żadnej z nich i nie da się jej nadać kursora zgodnego z kliknięciem.
      const rowStyle = getComputedStyle(row);
      expect(rowStyle.alignItems).toBe('stretch');
      expect(rowStyle.padding).toBe('');
      expect(rowStyle.gap).toBe('');

      // Że kolumny naprawdę kafelkują wnętrze ramki, sprawdza test e2e —
      // tu jest tylko ich obecność, bo jsdom nie liczy layoutu.
      for (const name of ['field-prefix', 'field-control', 'field-suffix']) {
        expect(row.contains(part(fixture, name))).toBe(true);
      }
    });
  });

  describe('sloty prefix/suffix', () => {
    it('renderują się wewnątrz rzędu pola, w kolejności prefix → pole → suffix', async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row');
      const order = Array.from(row.children).map((c) =>
        c.getAttribute('data-pct-part'),
      );

      expect(order).toEqual(['field-prefix', 'field-control', 'field-suffix']);
      expect(part(fixture, 'field-prefix').textContent).toContain('PLN');
      expect(
        part(fixture, 'field-suffix').querySelector('button'),
      ).toBeTruthy();
    });

    it('przycisk w slocie suffix jest osiągalny i ma nazwę dostępną', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix').querySelector(
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

  describe('wielkość pola', () => {
    const fieldOf = (f: ComponentFixture<unknown>) =>
      query(f, 'pct-field') as HTMLElement;

    it('odzwierciedla wielkość jako atrybut stanu, tak jak przycisk', async () => {
      const fixture = await render(SizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('lg');

      fixture.componentInstance.size.set('sm');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('sm');
    });

    it('bez jawnej wielkości bierze domyślną z konfiguracji', async () => {
      const fixture = await render(DefaultSizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('md');
    });

    it('respektuje domyślny rozmiar z providePctConfig (wym-api-8)', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          providePctConfig({ defaultSize: 'sm' }),
        ],
      });
      const fixture = await render(DefaultSizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('sm');
    });

    it('wysokość wiersza bierze się z tokenu wielkości, nie z paddingu', async () => {
      // jsdom nie liczy layoutu, więc sprawdzamy zadeklarowany mechanizm:
      // pion niesie `min-height` rzędu, a kolumny nie mają już paddingu
      // pionowego. Że wychodzi z tego dokładnie wysokość przycisku tej samej
      // wielkości, sprawdza test e2e (size.spec.ts).
      const fixture = await render(SizeHost);
      const row = part(fixture, 'field-row');
      expect(getComputedStyle(row).minHeight).toBe('var(--pct-field-height)');

      for (const name of ['field-prefix', 'field-control', 'field-suffix']) {
        expect(getComputedStyle(part(fixture, name)).paddingBlock).toBe('');
      }
    });
  });

  describe('jedna linia pod polem: podpowiedź albo błąd', () => {
    it('błąd zastępuje podpowiedź, nie dokłada się do niej', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;

      // Bez błędu widać podpowiedź.
      expect(part(fixture, 'field-hint').textContent?.trim()).toBe(
        'Krótko o sobie',
      );
      expect(allParts(fixture, 'field-error')).toHaveLength(0);

      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Za krótki opis' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      // Świeci wyłącznie błąd — podpowiedź znika (jedna linia).
      expect(part(fixture, 'field-error').textContent?.trim()).toBe(
        'Za krótki opis',
      );
      expect(allParts(fixture, 'field-hint')).toHaveLength(0);
    });

    it('aria-describedby wskazuje tylko widoczny komunikat', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);

      // Sama podpowiedź -> describedby to jej id.
      expect(input.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-hint').id,
      );

      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Za krótki opis' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      // Błąd przejmuje linię -> describedby to id błędu, bez wiszącego id podpowiedzi.
      const errorId = part(fixture, 'field-error').id;
      expect(input.getAttribute('aria-describedby')).toBe(errorId);
    });
  });

  describe('sloty poboczne: dodatek etykiety i komunikatu', () => {
    it('dodatek etykiety renderuje się w wierszu etykiety', async () => {
      const fixture = await render(AuxHost);
      const header = part(fixture, 'field-header');
      const aux = part(fixture, 'field-label-aux');

      expect(header.contains(aux)).toBe(true);
      expect(header.contains(part(fixture, 'field-label'))).toBe(true);
      expect(aux.querySelector('button')?.getAttribute('aria-label')).toBe(
        'Pomoc',
      );
    });

    it('dodatek komunikatu dzieli wiersz z podpowiedzią, a potem z błędem', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;

      host.value.set('abc');
      fixture.detectChanges();
      await fixture.whenStable();

      const footer = part(fixture, 'field-footer');
      const aux = part(fixture, 'field-message-aux');
      expect(footer.contains(aux)).toBe(true);
      expect(footer.contains(part(fixture, 'field-hint'))).toBe(true);
      expect(aux.textContent?.trim()).toBe('3/120');

      // Gdy podpowiedź ustąpi błędowi, dodatek zostaje w tym samym wierszu.
      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Za krótki opis' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(footer.contains(part(fixture, 'field-error'))).toBe(true);
      expect(footer.contains(part(fixture, 'field-message-aux'))).toBe(true);
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
