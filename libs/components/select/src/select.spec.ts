import {
  Component,
  computed,
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
import { providePctTexts } from '@pacit/components/core';
import { PctField } from '@pacit/components/field';
import { part } from '../../testing/src/dom';
import { PctSelect } from './select';
import { PctSelectOption, PctSelectPanelWidth } from './select.types';

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
    [placeholder]="placeholder()"
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
  /** `undefined` znaczy „bez wartości" — napis bierze wtedy `PCT_TEXTS`. */
  placeholder = signal<string | undefined>(undefined);
  options = signal<readonly PctSelectOption[]>(OPTIONS);
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  value = signal<string | null>('');
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

/** Encja: po HTTP przychodzi inna instancja o tej samej tożsamości. */
interface Miasto {
  readonly id: number;
  readonly nazwa: string;
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    [options]="options"
    [compareWith]="poId"
    [(value)]="value"
  />`,
})
class EntityHost {
  readonly options: readonly PctSelectOption<Miasto>[] = [
    { value: { id: 1, nazwa: 'Gdańsk' }, label: 'Gdańsk' },
    { value: { id: 2, nazwa: 'Kraków' }, label: 'Kraków' },
  ];
  /** Celowo NIE ta sama referencja co opcja na liście. */
  value = signal<Miasto | null>({ id: 2, nazwa: 'Kraków' });
  poId = (a: Miasto, b: Miasto) => a.id === b.id;
}

/** Ten sam układ bez `compareWith` — kontrola, że to on robi robotę. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [(value)]="value" />`,
})
class EntityWithoutCompareHost {
  readonly options: readonly PctSelectOption<Miasto>[] = [
    { value: { id: 1, nazwa: 'Gdańsk' }, label: 'Gdańsk' },
    { value: { id: 2, nazwa: 'Kraków' }, label: 'Kraków' },
  ];
  value = signal<Miasto | null>({ id: 2, nazwa: 'Kraków' });
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    [options]="options"
    [emptyValue]="emptyValue"
    [(value)]="value"
  />`,
})
class NumberHost {
  readonly options: readonly PctSelectOption<number>[] = [
    { value: 10, label: 'Dziesięć' },
    { value: 20, label: 'Dwadzieścia' },
  ];
  emptyValue: number | null = null;
  value = signal<number | null>(null);
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

/** Kontrolka w obudowie — kliknięcie w ramkę idzie do niej przez `activate()`. */
@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Kraj">
    <pct-select [options]="options" [(value)]="value" />
  </pct-field>`,
})
class InFieldHost {
  options = OPTIONS;
  value = signal<string | null>('');
}

/** Motyw stoi na przodku hosta — panel żyje poza tym drzewem. */
@Component({
  imports: [PctSelect],
  template: `<div data-theme="dark">
    <pct-select [options]="options" [(value)]="value" />
  </div>`,
})
class ThemedHost {
  options = OPTIONS;
  value = signal<string | null>('');
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    [options]="options"
    [panelWidth]="panelWidth()"
    [(value)]="value"
  />`,
})
class PanelWidthHost {
  options = OPTIONS;
  panelWidth = signal<PctSelectPanelWidth>('field');
  value = signal<string | null>('');
}

/** Wartość wskazuje opcję WYŁĄCZONĄ — aktywna nie jest wtedy na liście dostępnych. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [(value)]="value" />`,
})
class DisabledSelectionHost {
  options = OPTIONS;
  value = signal<string | null>('cz');
}

/** Kontrolka BEZ ani jednego wiązania — mierzy wartości domyślne wejść. */
@Component({
  imports: [PctSelect],
  template: `<pct-select />`,
})
class BareHost {}

/** Lista, na której KAŻDA opcja jest wyłączona. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" />`,
})
class AllDisabledHost {
  readonly options: readonly PctSelectOption[] = [
    { value: 'a', label: 'Alfa', disabled: true },
    { value: 'b', label: 'Beta', disabled: true },
  ];
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

  it('bez ani jednego wiązania jest pustą, sprawną kontrolką', async () => {
    // Wartości domyślne wejść są kontraktem tak samo jak same wejścia, a każdy
    // test podający je jawnie mierzy własne wiązanie, nie domyślną.
    const fixture = await render(BareHost);
    const trigger = triggerOf(fixture);

    expect(trigger.disabled).toBe(false);
    expect(trigger.getAttribute('aria-readonly')).toBeNull();
    expect(trigger.getAttribute('aria-invalid')).toBeNull();
    expect(trigger.getAttribute('aria-required')).toBeNull();
    expect(trigger.getAttribute('aria-describedby')).toBeNull();
    expect(trigger.getAttribute('aria-labelledby')).toBeNull();
    expect(trigger.getAttribute('name')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="label"]'),
    ).toBeNull();

    // Lista domyślnie pusta — panel mówi o tym wprost, a nie otwiera się pusty.
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(optionsInPanel()).toHaveLength(0);
    expect(part(document, 'empty').textContent?.trim()).toBe('No options');
  });

  it('podpowiedź opisuje trigger, a jej brak nie zostawia pustego odwołania', async () => {
    const fixture = await render(Host);
    const trigger = triggerOf(fixture);
    expect(trigger.getAttribute('aria-describedby')).toBeNull();

    fixture.componentInstance.hint.set('Wybierz kraj wysyłki');
    fixture.detectChanges();
    await fixture.whenStable();

    const opis = trigger.getAttribute('aria-describedby');
    expect(opis).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector(`#${opis}`)?.textContent?.trim(),
    ).toBe('Wybierz kraj wysyłki');
  });

  it('wartość null to brak wyboru, a nie opcja o wartości null', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(null);
    fixture.detectChanges();
    await fixture.whenStable();

    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      optionsInPanel().some((o) => o.getAttribute('aria-selected') === 'true'),
    ).toBe(false);
    // Bez wyboru aktywna jest pierwsza DOSTĘPNA, a nie „opcja numer −1".
    expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
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
    expect(triggerOf(fixture).getAttribute('aria-controls')).toBe(
      part(document, 'panel').id,
    );
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

    // Klawisze otwierające są cztery i do 2026-08-06 mierzony był jeden:
    // alternatywa `||` zwiera się na pierwszym trafieniu, więc trzy pozostałe
    // gałęzie nie były wykonywane ani razu (`lesson-57`).
    it.each(['ArrowUp', 'Enter', ' '])(
      'panel otwiera także %j',
      async (klawisz) => {
        const fixture = await render(Host);
        await press(fixture, klawisz);

        expect(panel()).not.toBeNull();
        expect(triggerOf(fixture).getAttribute('aria-expanded')).toBe('true');
      },
    );

    it('klawisz spoza obsługiwanych nie otwiera panelu', async () => {
      const fixture = await render(Host);
      await press(fixture, 'PageDown');

      expect(panel()).toBeNull();
    });

    it('Tab zamyka listę, bo ma pozwolić wyjść z kontrolki', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      expect(panel()).not.toBeNull();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      triggerOf(fixture).dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).toBeNull();
      // Tab jako jedyny z obsługiwanych klawiszy NIE jest zjadany: gdyby był,
      // fokus zostałby w kontrolce, z której miał właśnie wyjść.
      expect(event.defaultPrevented).toBe(false);
    });

    it('bufor typeaheadu gaśnie po przerwie w pisaniu', async () => {
      vi.useFakeTimers();
      try {
        const fixture = await render(Host);
        await press(fixture, 'ArrowDown');
        await press(fixture, 'c'); // Czechy — wyłączone, więc szuka dalej
        await press(fixture, 'z'); // „cz" nie pasuje do niczego dostępnego

        vi.advanceTimersByTime(500);

        // Po przerwie „c" zaczyna nowe słowo, a nie dokłada się do starego.
        await press(fixture, 'p'); // Polska
        expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('Home i End na liście bez dostępnych opcji nie aktywują niczego', async () => {
      // Lista ma DWIE opcje, obie wyłączone: przy jednej „brak aktywnej"
      // i „aktywna poza listą" wyglądają tak samo, więc test przechodziłby
      // także dla kontrolki aktywującej opcję o indeksie 1.
      const fixture = await render(AllDisabledHost);
      await press(fixture, 'ArrowDown');
      const aktywna = () =>
        optionsInPanel().findIndex((o) => o.hasAttribute('data-pct-active'));

      expect(aktywna()).toBe(-1);
      await press(fixture, 'End');
      expect(aktywna()).toBe(-1);
      await press(fixture, 'Home');
      expect(aktywna()).toBe(-1);
      expect(
        triggerOf(fixture).getAttribute('aria-activedescendant'),
      ).toBeNull();
    });

    it('Escape zjada klawisz, żeby nie zamknąć czegoś piętro wyżej', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      triggerOf(fixture).dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).toBeNull();
      expect(event.defaultPrevented).toBe(true);
    });

    it('spacja wybiera aktywną opcję tak samo jak Enter', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown');

      await press(fixture, ' ');
      expect(fixture.componentInstance.value()).toBe('de');
      expect(panel()).toBeNull();
    });

    it('typeahead trafiający w PIERWSZĄ opcję też przestawia aktywną', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown'); // aktywna: Niemcy (1)

      // Indeks 0 jest jedyną wartością, przy której `>= 0` i `> 0` dają różny
      // wynik — bez niego granica warunku nie jest mierzona.
      await press(fixture, 'p'); // Polska (0)
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('strzałka z aktywnej opcji wyłączonej wskakuje na skraj listy dostępnych', async () => {
      const fixture = await render(DisabledSelectionHost);
      // Wartość wskazuje `cz`, czyli opcję wyłączoną: aktywna jest wtedy poza
      // listą dostępnych i przesunięcie nie ma od czego liczyć kroku.
      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[2].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('strzałka w górę z aktywnej wyłączonej idzie na koniec listy', async () => {
      const fixture = await render(DisabledSelectionHost);
      await press(fixture, 'ArrowDown');

      await press(fixture, 'ArrowUp');
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

  describe('teksty', () => {
    it('domyślne napisy są angielskie — biblioteka nie narzuca języka', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        fixture.nativeElement
          .querySelector('[data-pct-part="placeholder"]')
          ?.textContent?.trim(),
      ).toBe('Select…');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        document.querySelector('[data-pct-part="empty"]')?.textContent?.trim(),
      ).toBe('No options');
    });

    it('providePctTexts podmienia napisy, a niepodane zostają domyślne', async () => {
      TestBed.configureTestingModule({
        providers: [providePctTexts({ selectEmpty: 'Brak opcji' })],
      });

      const fixture = await render(Host);
      fixture.componentInstance.options.set([]);
      fixture.detectChanges();
      await fixture.whenStable();

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        document.querySelector('[data-pct-part="empty"]')?.textContent?.trim(),
      ).toBe('Brak opcji');
      // Nieprzetłumaczony napis nie znika — zostaje przy wartości domyślnej.
      expect(
        fixture.nativeElement
          .querySelector('[data-pct-part="placeholder"]')
          ?.textContent?.trim(),
      ).toBe('Select…');
    });

    // Wcześniej napis brał się z wartości domyślnej wejścia, czyli z odczytu
    // przy KONSTRUKCJI — ten test padał na `Select…` (decyzja 0014).
    it('zmiana języka w runtime dociera do napisów bez przeładowania', async () => {
      const jezyk = signal<'en' | 'pl'>('en');
      TestBed.configureTestingModule({
        providers: [
          providePctTexts(
            computed(() =>
              jezyk() === 'pl'
                ? { selectPlaceholder: 'Wybierz…', selectEmpty: 'Brak opcji' }
                : {},
            ),
          ),
        ],
      });

      const fixture = await render(Host);
      fixture.componentInstance.options.set([]);
      fixture.detectChanges();
      await fixture.whenStable();

      const placeholder = () =>
        fixture.nativeElement
          .querySelector('[data-pct-part="placeholder"]')
          ?.textContent?.trim();

      expect(placeholder()).toBe('Select…');

      jezyk.set('pl');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(placeholder()).toBe('Wybierz…');
    });

    // Brak wartości i wartość pusta znaczą co innego: pierwsze oddaje napis
    // bibliotece, drugie jest świadomą decyzją autora widoku.
    it('placeholder="" zostaje pusty, a nie wraca do domyślnego', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.placeholder.set('');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        fixture.nativeElement
          .querySelector('[data-pct-part="placeholder"]')
          ?.textContent?.trim(),
      ).toBe('');
    });
  });

  describe('wartości nienapisowe', () => {
    it('wybór ustawia liczbę, a nie jej zapis tekstowy', async () => {
      const fixture = await render(NumberHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      optionsInPanel()[1].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe(20);
    });

    it('compareWith dopasowuje encję po kluczu, nie po referencji', async () => {
      const fixture = await render(EntityHost);

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Kraków');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(optionsInPanel()[1].getAttribute('aria-selected')).toBe('true');
    });

    it('bez compareWith inna instancja tej samej encji nie jest wybrana', async () => {
      const fixture = await render(EntityWithoutCompareHost);
      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]'),
      ).toBeNull();
    });

    it('reset() wraca do emptyValue zgłoszonego przez aplikację', async () => {
      const fixture = await render(NumberHost);
      const select = fixture.debugElement.children[0]
        .componentInstance as PctSelect<number>;

      fixture.componentInstance.emptyValue = -1;
      fixture.componentInstance.value.set(10);
      fixture.detectChanges();
      await fixture.whenStable();

      select.reset();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe(-1);
    });

    it('focus() jest tym, po co sięgają signal forms', async () => {
      const fixture = await render(NumberHost);
      const select = fixture.debugElement.children[0]
        .componentInstance as PctSelect<number>;

      select.focus();
      expect(document.activeElement).toBe(triggerOf(fixture));
    });
  });

  describe('panel poza drzewem hosta', () => {
    it('kliknięcie w ramkę obudowy otwiera listę', async () => {
      const fixture = await render(InFieldHost);
      const row = fixture.nativeElement.querySelector(
        '[data-pct-part="field-row"]',
      ) as HTMLElement;

      // Obudowa nie zna selecta — woła `activate()` z kontraktu PCT_FIELD.
      // Bez tej drogi kliknięcie w ramkę poza samym triggerem nic nie robi,
      // a wygląda na klikalne (`req-a11y-touch`).
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).not.toBeNull();
    });

    it('panel przejmuje motyw najbliższego przodka kontrolki', async () => {
      const fixture = await render(ThemedHost);
      await press(fixture, 'ArrowDown');

      // Nakładka CDK jest dzieckiem `body`, więc kaskada `data-theme` do niej
      // nie dociera — motyw trzeba przenieść ręcznie (`lesson-35`).
      expect(panel()?.closest('[data-theme]')?.getAttribute('data-theme')).toBe(
        'dark',
      );
    });

    it('bez motywu na przodku panel nie dostaje atrybutu', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      expect(panel()?.closest('[data-theme]')).toBeNull();
    });

    it('panelWidth="auto" oddaje szerokość treści, a kontrolka zostaje dolną granicą', async () => {
      const fixture = await render(PanelWidthHost);
      fixture.componentInstance.panelWidth.set('auto');
      fixture.detectChanges();
      await fixture.whenStable();
      await press(fixture, 'ArrowDown');

      const nakladka = panel()?.closest('.cdk-overlay-pane') as HTMLElement;
      // „Nie ustawiaj szerokości" znaczy pusty napis: nakładka ma wtedy
      // wyłącznie `min-width`. Wartość wprost zamieniłaby `auto` w `field`.
      expect(nakladka.style.width).toBe('');
      expect(nakladka.style.minWidth).not.toBe('');
    });

    it('panelWidth wprost trafia na nakładkę bez przeliczania', async () => {
      const fixture = await render(PanelWidthHost);
      fixture.componentInstance.panelWidth.set('320px');
      fixture.detectChanges();
      await fixture.whenStable();
      await press(fixture, 'ArrowDown');

      const nakladka = panel()?.closest('.cdk-overlay-pane') as HTMLElement;
      expect(nakladka.style.width).toBe('320px');
      expect(nakladka.style.minWidth).toBe('');
    });
  });
});
