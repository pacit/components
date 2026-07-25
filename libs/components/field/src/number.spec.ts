import {
  Component,
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, max, min } from '@angular/forms/signals';
import { PctField } from './field';
import { PctNumber } from './number';

async function render<T>(type: Type<T>, locale = 'pl-PL') {
  TestBed.configureTestingModule({
    providers: [
      provideZonelessChangeDetection(),
      { provide: LOCALE_ID, useValue: locale },
    ],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const inputOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

/** Wpisanie tekstu przez użytkownika: DOM najpierw, potem zdarzenie. */
async function type(f: ComponentFixture<unknown>, text: string) {
  const el = inputOf(f);
  el.value = text;
  el.dispatchEvent(new Event('input'));
  await f.whenStable();
}

async function blur(f: ComponentFixture<unknown>) {
  inputOf(f).dispatchEvent(new Event('blur'));
  await f.whenStable();
}

async function key(f: ComponentFixture<unknown>, k: string) {
  inputOf(f).dispatchEvent(new KeyboardEvent('keydown', { key: k }));
  await f.whenStable();
}

@Component({
  imports: [PctNumber],
  template: `<input
    pctNumber
    [minFractionDigits]="minFrac()"
    [maxFractionDigits]="maxFrac()"
    [useGrouping]="grouping()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [readonly]="readonly()"
    [(value)]="value"
  />`,
})
class Host {
  value = signal<number | null>(null);
  readonly = signal(false);
  minFrac = signal(0);
  maxFrac = signal(0);
  grouping = signal(true);
  min = signal<number | null>(null);
  max = signal<number | null>(null);
  step = signal(1);
}

@Component({
  imports: [PctField, PctNumber],
  template: `<pct-field label="Cena" hint="Brutto">
    <input pctNumber [maxFractionDigits]="2" [(value)]="value" />
  </pct-field>`,
})
class NumberInFieldHost {
  value = signal<number | null>(null);
}

@Component({
  imports: [PctField, PctNumber, FormField],
  template: `<pct-field label="Liczba stanowisk">
    <input pctNumber [formField]="f.seats" />
  </pct-field>`,
})
class SignalFormHost {
  model = signal<{ seats: number | null }>({ seats: 12345 });
  f = form(this.model, (p) => {
    min(p.seats, 1);
    max(p.seats, 500);
  });
}

describe('PctNumber', () => {
  describe('formatowanie wg locale', () => {
    it('grupuje tysiące i używa lokalnego separatora dziesiętnego', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(1234567.5);
      await fixture.whenStable();

      // pl-PL: spacja nierozdzielająca jako separator grup, przecinek dziesiętny.
      expect(inputOf(fixture).value).toBe('1\u00a0234\u00a0567,5');
    });

    it('dopełnia miejsca dziesiętne do minFractionDigits', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.minFrac.set(2);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(12.5);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('12,50');
    });

    it('puste pole to null, nie zero', async () => {
      const fixture = await render(Host);
      expect(inputOf(fixture).value).toBe('');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('respektuje inne locale', async () => {
      const fixture = await render(Host, 'en-US');
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(1234.5);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('1,234.5');
    });

    it('grupowanie można wyłączyć', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.grouping.set(false);
      fixture.componentInstance.value.set(1234567);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('1234567');
    });
  });

  describe('parsowanie', () => {
    it('przyjmuje lokalny separator dziesiętny', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '12,34');

      expect(fixture.componentInstance.value()).toBe(12.34);
    });

    it('przyjmuje kropkę, bo daje ją klawiatura numeryczna', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '12.34');

      expect(fixture.componentInstance.value()).toBe(12.34);
    });

    it('usuwa separatory grup, także spację nierozdzielającą', async () => {
      const fixture = await render(Host);
      await type(fixture, '1\u00a0234\u00a0567');

      expect(fixture.componentInstance.value()).toBe(1234567);
    });

    it('nie myli separatora grup z dziesiętnym w en-US', async () => {
      const fixture = await render(Host, 'en-US');
      fixture.componentInstance.maxFrac.set(2);

      // Przecinek nie rozdziela tysięcy (brak trzech cyfr), więc to ułamek.
      await type(fixture, '1,5');
      expect(fixture.componentInstance.value()).toBe(1.5);

      await type(fixture, '1,500');
      expect(fixture.componentInstance.value()).toBe(1500);
    });

    it('czyszczenie pola ustawia null', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(42);
      await fixture.whenStable();

      await type(fixture, '');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('stan przejściowy nie kasuje wartości', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      // Sam minus to jeszcze nie liczba — wartość zostaje do zatwierdzenia.
      await type(fixture, '-');
      expect(fixture.componentInstance.value()).toBe(5);
    });

    it('nie przepisuje tekstu w trakcie pisania', async () => {
      const fixture = await render(Host);
      await type(fixture, '1234');

      // Gdyby efekt przepisał wartość, kursor skoczyłby na koniec „1 234".
      expect(inputOf(fixture).value).toBe('1234');
      expect(fixture.componentInstance.value()).toBe(1234);
    });

    it('zatwierdzenie formatuje tekst', async () => {
      const fixture = await render(Host);
      await type(fixture, '1234');
      await blur(fixture);

      expect(inputOf(fixture).value).toBe('1\u00a0234');
    });

    it('zatwierdzenie odrzuca treść, której nie da się sparsować', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(7);
      await fixture.whenStable();

      await type(fixture, 'abc');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(inputOf(fixture).value).toBe('');
    });
  });

  describe('zaokrąglanie i granice', () => {
    it('domyślnie pole jest całkowite', async () => {
      const fixture = await render(Host);
      await type(fixture, '3,7');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBe(4);
    });

    it('zaokrągla do maxFractionDigits przy zatwierdzeniu', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '3,456');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBe(3.46);
    });

    it('domyka wartość do min i max dopiero przy zatwierdzeniu', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      fixture.componentInstance.max.set(20);
      await fixture.whenStable();

      // W trakcie pisania nie domykamy — inaczej nie da się wpisać „15”
      // przechodząc przez „1”.
      await type(fixture, '1');
      expect(fixture.componentInstance.value()).toBe(1);

      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(10);

      await type(fixture, '99');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(20);
    });
  });

  describe('klawiatura', () => {
    it('strzałki zmieniają wartość o step', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(6);

      await key(fixture, 'ArrowDown');
      await key(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe(4);
    });

    it('PageUp/PageDown skacze dziesięciokrotnie', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(100);
      fixture.componentInstance.step.set(5);
      await fixture.whenStable();

      await key(fixture, 'PageUp');
      expect(fixture.componentInstance.value()).toBe(150);
    });

    it('Home i End skaczą do granic', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(1);
      fixture.componentInstance.max.set(99);
      await fixture.whenStable();

      await key(fixture, 'End');
      expect(fixture.componentInstance.value()).toBe(99);

      await key(fixture, 'Home');
      expect(fixture.componentInstance.value()).toBe(1);
    });

    it('krok wychodzi od tego, co użytkownik wpisał, a nie od zatwierdzonej wartości', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(1);
      await fixture.whenStable();

      await type(fixture, '50');
      await key(fixture, 'ArrowUp');

      expect(fixture.componentInstance.value()).toBe(51);
      expect(inputOf(fixture).value).toBe('51');
    });

    it('readonly blokuje krokowanie', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      fixture.componentInstance.readonly.set(true);
      await fixture.whenStable();

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(5);
    });
  });

  describe('dostępność', () => {
    it('jest spinbuttonem z opisem wartości', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(1000);
      fixture.componentInstance.value.set(1234.5);
      await fixture.whenStable();

      const el = inputOf(fixture);
      expect(el.getAttribute('role')).toBe('spinbutton');
      // Wartość surowa dla technologii, sformatowana dla czytnika.
      expect(el.getAttribute('aria-valuenow')).toBe('1234.5');
      expect(el.getAttribute('aria-valuetext')).toBe('1\u00a0234,5');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('1000');
    });

    it('puste pole nie ma aria-valuenow', async () => {
      const fixture = await render(Host);
      const el = inputOf(fixture);

      expect(el.hasAttribute('aria-valuenow')).toBe(false);
      expect(el.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('tryb klawiatury zależy od dopuszczonych ułamków', async () => {
      const fixture = await render(Host);
      expect(inputOf(fixture).getAttribute('inputmode')).toBe('numeric');

      fixture.componentInstance.maxFrac.set(2);
      await fixture.whenStable();
      expect(inputOf(fixture).getAttribute('inputmode')).toBe('decimal');
    });
  });

  describe('w obudowie pct-field', () => {
    it('etykieta obudowy wskazuje pole, a podpowiedź je opisuje', async () => {
      const fixture = await render(NumberInFieldHost);
      const el = inputOf(fixture);
      const label = fixture.nativeElement.querySelector(
        '[data-pct-part="field-label"]',
      ) as HTMLElement;
      const hint = fixture.nativeElement.querySelector(
        '[data-pct-part="field-hint"]',
      ) as HTMLElement;

      expect(label.getAttribute('for')).toBe(el.id);
      expect(el.getAttribute('aria-describedby')).toContain(hint.id);
    });

    it('dostaje ramkę pola (wariant boxed)', async () => {
      const fixture = await render(NumberInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('boxed');
    });
  });

  describe('signal forms', () => {
    it('pokazuje sformatowaną wartość początkową modelu', async () => {
      const fixture = await render(SignalFormHost);

      // Regresja: `FormField` dostarcza NgControl (interop dla CVA), więc
      // heurystyka „NgControl => ktoś inny pisze do DOM" wykluczała też signal
      // forms, choć te przy własnej kontrolce ustawiają tylko `value`
      // (wym-real-26).
      expect(inputOf(fixture).value).toBe('12\u00a0345');
    });

    it('granice bierze z walidatorów schematu, nie z szablonu', async () => {
      const fixture = await render(SignalFormHost);
      const el = inputOf(fixture);

      // W szablonie nie ma [min]/[max] — należą do kontraktu FormUiControl,
      // więc wypełnia je dyrektywa na podstawie min()/max() ze schematu.
      expect(el.getAttribute('aria-valuemin')).toBe('1');
      expect(el.getAttribute('aria-valuemax')).toBe('500');

      await type(fixture, '9999');
      await blur(fixture);
      expect(fixture.componentInstance.model().seats).toBe(500);
    });
  });
});
