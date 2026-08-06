import {
  Component,
  LOCALE_ID,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
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

/** Klasyczne formularze — użycie, przed którym dyrektywa ostrzega. */
@Component({
  imports: [PctNumber, ReactiveFormsModule],
  template: `<input pctNumber [formControl]="ctrl" />`,
})
class ClassicFormHost {
  ctrl = new FormControl<number | null>(null);
}

/** `type="number"` — drugie takie użycie. */
@Component({
  imports: [PctNumber],
  template: `<input type="number" pctNumber [(value)]="value" />`,
})
class NumberTypeHost {
  value = signal<number | null>(null);
}

/** Pole BEZ ani jednego wiązania — mierzy wartości domyślne wejść. */
@Component({
  imports: [PctNumber],
  template: `<input pctNumber />`,
})
class BareHost {}

/** Stan błędu podany wprost, bez formularza — bramkowanie na `touched`. */
@Component({
  imports: [PctNumber],
  template: `<input
    pctNumber
    [invalid]="invalid()"
    [touched]="touched()"
    [(value)]="value"
  />`,
})
class InvalidHost {
  invalid = signal(false);
  touched = signal(false);
  value = signal<number | null>(1);
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

    it('obcina białe znaki dookoła — wklejenie z arkusza niesie spacje', async () => {
      const fixture = await render(Host);

      await type(fixture, '  42  ');
      expect(fixture.componentInstance.value()).toBe(42);
    });

    it('same białe znaki to pole puste, nie zero', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(7);
      await fixture.whenStable();

      await type(fixture, '   ');
      expect(fixture.componentInstance.value()).toBeNull();
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

    // Granica podana z jednej strony ma działać z tej jednej strony — wspólny
    // test dla min i max nie odróżnia tego od „domyka zawsze".
    it('sama granica dolna nie domyka od góry', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      await fixture.whenStable();

      await type(fixture, '1000');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(1000);
    });

    it('sama granica górna nie domyka od dołu', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.max.set(20);
      await fixture.whenStable();

      await type(fixture, '-1000');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(-1000);
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

    /**
     * Regresja: krok liczony z tekstu w DOM gubił naciśnięcia. Tekst zapisuje
     * efekt, czyli asynchronicznie — dwa zdarzenia w jednym przebiegu widziały
     * tę samą wartość wyjściową. Test celowo NIE stabilizuje między
     * naciśnięciami; z `await` po każdym z nich wada jest niewidoczna.
     */
    it('szybkie powtórzenie strzałki nie gubi kroku', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      const el = inputOf(fixture);
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe(2);
      expect(el.value).toBe('2');
    });

    it('PageUp/PageDown skacze dziesięciokrotnie', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(100);
      fixture.componentInstance.step.set(5);
      await fixture.whenStable();

      await key(fixture, 'PageUp');
      expect(fixture.componentInstance.value()).toBe(150);

      // PageDown był w nazwie tego testu, a nie w jego treści, do 2026-08-06:
      // przebieg mutacyjny pokazał całą gałąź jako niepokrytą (`lekcja-57`).
      await key(fixture, 'PageDown');
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('klawisz spoza obsługiwanych nie rusza wartości ani zdarzenia', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(7);
      await fixture.whenStable();

      const event = new KeyboardEvent('keydown', {
        key: 'a',
        cancelable: true,
      });
      inputOf(fixture).dispatchEvent(event);
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe(7);
      // Gałąź `default` ma oddać klawisz przeglądarce — inaczej pole przestaje
      // przyjmować cyfry, bo `preventDefault` zjada każde naciśnięcie.
      expect(event.defaultPrevented).toBe(false);
    });

    // Pole puste: krok musi mieć od czego wyjść, a kolejność odniesień
    // (min, potem max, potem zero) jest tu obietnicą — pierwsza strzałka ma
    // wejść W zakres, a nie zacząć od zera i zostać do niego domkniętą.
    it('krok bez wartości wychodzi od min', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      await fixture.whenStable();

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(11);
    });

    it('krok bez wartości i bez min wychodzi od max', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.max.set(50);
      await fixture.whenStable();

      await key(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe(49);
    });

    it('krok bez wartości i bez granic wychodzi od zera', async () => {
      const fixture = await render(Host);

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(1);
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

    it('Home i End bez granic nie robią nic', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      // Bez `min`/`max` nie ma dokąd skoczyć — klawisz ma zostać oddany
      // przeglądarce (w polu tekstowym przesuwa karetkę), a nie zjedzony.
      const home = new KeyboardEvent('keydown', {
        key: 'Home',
        cancelable: true,
      });
      inputOf(fixture).dispatchEvent(home);
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe(5);
      expect(home.defaultPrevented).toBe(false);

      const end = new KeyboardEvent('keydown', {
        key: 'End',
        cancelable: true,
      });
      inputOf(fixture).dispatchEvent(end);
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe(5);
      expect(end.defaultPrevented).toBe(false);
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

    it('bez ani jednego wiązania jest pustym, sprawnym polem', async () => {
      // Wartości domyślne wejść są kontraktem tak samo jak same wejścia,
      // a każdy test podający je jawnie mierzy własne wiązanie, nie domyślną.
      const fixture = await render(BareHost);
      const el = inputOf(fixture);

      expect(el.disabled).toBe(false);
      expect(el.readOnly).toBe(false);
      expect(el.value).toBe('');
      expect(el.getAttribute('aria-invalid')).toBeNull();
      expect(el.getAttribute('aria-required')).toBeNull();
      expect(el.getAttribute('name')).toBeNull();
      expect(el.getAttribute('aria-valuemin')).toBeNull();
      expect(el.getAttribute('aria-valuemax')).toBeNull();

      // Domyślny krok to jeden, domyślnie bez ułamków.
      await key(fixture, 'ArrowUp');
      expect(el.value).toBe('1');
    });

    it('stan błędu zapala się dopiero po dotknięciu', async () => {
      const fixture = await render(InvalidHost);
      const el = inputOf(fixture);

      fixture.componentInstance.invalid.set(true);
      await fixture.whenStable();
      expect(el.getAttribute('aria-invalid')).toBeNull();

      fixture.componentInstance.touched.set(true);
      await fixture.whenStable();
      expect(el.getAttribute('aria-invalid')).toBe('true');
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
      // (lekcja-26).
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

    it('focus() i reset() są tym, po co sięgają signal forms', async () => {
      const fixture = await render(SignalFormHost);
      const dyrektywa = fixture.debugElement
        .query((d) => d.nativeElement.tagName === 'INPUT')
        .injector.get(PctNumber);

      dyrektywa.focus();
      expect(document.activeElement).toBe(inputOf(fixture));

      dyrektywa.reset();
      await fixture.whenStable();
      expect(fixture.componentInstance.model().seats).toBe(null);
      expect(inputOf(fixture).value).toBe('');
    });
  });

  describe('ostrzeżenia deweloperskie', () => {
    it('klasyczne formularze przejmują zapis do DOM — dyrektywa mówi o tym głośno', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        await render(ClassicFormHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // Komunikat ma nazwać wadę ORAZ wskazać wyjście — samo „nie rób tak"
        // zostawia czytelnika w tym samym miejscu, w którym go zastało.
        expect(String(warn.mock.calls[0][0])).toContain(
          'Classic forms ([formControl], [(ngModel)]) take over writing ' +
            'the value and break locale formatting. Use signal forms ' +
            '([formField]) or [(value)] instead.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('type="number" gubi lokalny separator — dyrektywa mówi o tym głośno', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        await render(NumberTypeHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // Komunikat ma NAZWAĆ zastany typ, bo inaczej nie odróżnia
        // `type="number"` od `type="email"` i nie mówi, co poprawić.
        expect(String(warn.mock.calls[0][0])).toBe(
          '[pctNumber] Expected type="text" (the control parses numbers per ' +
            'locale itself), but got type="number".',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('poprawne użycie milczy', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        await render(SignalFormHost);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });
});
