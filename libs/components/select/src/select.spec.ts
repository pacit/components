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
  { value: 'pl', label: 'Poland' },
  { value: 'de', label: 'Germany' },
  { value: 'cz', label: 'Czechia', disabled: true },
  { value: 'sk', label: 'Slovakia' },
];

const triggerOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="trigger"]',
  ) as HTMLButtonElement;

/** The panel renders in a CDK overlay — outside the component tree. */
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
  label = signal('Country');
  hint = signal('');
  /** `undefined` means "no value" — the text then comes from `PCT_TEXTS`. */
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
    label="Country"
    [options]="options"
    [formField]="f.country"
  />`,
})
class SignalFormHost {
  options = OPTIONS;
  model = signal({ country: '' });
  f = form(this.model, (p) => {
    required(p.country, { message: 'Pick a country' });
  });
}

/** An entity: over HTTP a different instance of the same identity arrives. */
interface City {
  readonly id: number;
  readonly name: string;
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    [options]="options"
    [compareWith]="byId"
    [(value)]="value"
  />`,
})
class EntityHost {
  readonly options: readonly PctSelectOption<City>[] = [
    { value: { id: 1, name: 'London' }, label: 'London' },
    { value: { id: 2, name: 'Paris' }, label: 'Paris' },
  ];
  /** Deliberately NOT the same reference as the option on the list. */
  value = signal<City | null>({ id: 2, name: 'Paris' });
  byId = (a: City, b: City) => a.id === b.id;
}

/** The same setup without `compareWith` — the control that it does the work. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [(value)]="value" />`,
})
class EntityWithoutCompareHost {
  readonly options: readonly PctSelectOption<City>[] = [
    { value: { id: 1, name: 'London' }, label: 'London' },
    { value: { id: 2, name: 'Paris' }, label: 'Paris' },
  ];
  value = signal<City | null>({ id: 2, name: 'Paris' });
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
    { value: 10, label: 'Ten' },
    { value: 20, label: 'Twenty' },
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

/** The control inside the wrapper — a click on the border reaches it through `activate()`. */
@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Country">
    <pct-select [options]="options" [(value)]="value" />
  </pct-field>`,
})
class InFieldHost {
  options = OPTIONS;
  value = signal<string | null>('');
}

/** The theme sits on an ancestor of the host — the panel lives outside that tree. */
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

/** The value points at a DISABLED option — the active one is then off the available list. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [(value)]="value" />`,
})
class DisabledSelectionHost {
  options = OPTIONS;
  value = signal<string | null>('cz');
}

/** A control with NOT ONE binding — it measures the input defaults. */
@Component({
  imports: [PctSelect],
  template: `<pct-select />`,
})
class BareHost {}

/** A list on which EVERY option is disabled. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" />`,
})
class AllDisabledHost {
  readonly options: readonly PctSelectOption[] = [
    { value: 'a', label: 'Alpha', disabled: true },
    { value: 'b', label: 'Beta', disabled: true },
  ];
}

describe('PctSelect', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('the trigger implements the combobox pattern and starts closed', async () => {
    const fixture = await render(Host);
    const trigger = triggerOf(fixture);

    expect(trigger.getAttribute('role')).toBe('combobox');
    expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBeNull();
    expect(panel()).toBeNull();
  });

  it('with not one binding it is an empty, working control', async () => {
    // The input defaults are a contract just as much as the inputs are, and every
    // test that passes them explicitly measures its own binding, not the default.
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

    // The list is empty by default — the panel says so outright instead of opening blank.
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(optionsInPanel()).toHaveLength(0);
    expect(part(document, 'empty').textContent?.trim()).toBe('No options');
  });

  it('the hint describes the trigger, and its absence leaves no dangling reference', async () => {
    const fixture = await render(Host);
    const trigger = triggerOf(fixture);
    expect(trigger.getAttribute('aria-describedby')).toBeNull();

    fixture.componentInstance.hint.set('Pick a shipping country');
    fixture.detectChanges();
    await fixture.whenStable();

    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(
      fixture.nativeElement
        .querySelector(`#${describedBy}`)
        ?.textContent?.trim(),
    ).toBe('Pick a shipping country');
  });

  it('a null value is no choice, not an option whose value is null', async () => {
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
    // With no choice the first AVAILABLE one is active, not "option number −1".
    expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
  });

  it('shows the placeholder text until something is picked', async () => {
    const fixture = await render(Host);
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="placeholder"]'),
    ).toBeTruthy();
    expect(
      fixture.nativeElement.querySelector('[data-pct-part="value"]'),
    ).toBeNull();
  });

  it('a click opens the panel with role listbox and the options', async () => {
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

  it('picking an option sets the value, closes the panel and shows the label', async () => {
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
    ).toContain('Germany');
  });

  it('a click on a disabled option does not change the value', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    optionsInPanel()[2].click(); // Czechia (disabled)
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
    expect(panel()).not.toBeNull(); // the panel stays open
  });

  describe('the keyboard (an implementation of our own — there is no native counterpart)', () => {
    it('the down arrow opens the panel and activates the first option', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      expect(panel()).not.toBeNull();
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
      expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
        optionsInPanel()[0].id,
      );
    });

    it('the arrows move the active option, skipping the disabled ones', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown'); // opening, active: Poland
      await press(fixture, 'ArrowDown'); // Germany
      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowDown'); // skips Czechia -> Slovakia
      expect(optionsInPanel()[2].hasAttribute('data-pct-active')).toBe(false);
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowUp'); // back to Germany
      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);
    });

    it('Home and End jump to the first and the last available option', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'End');
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'Home');
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('Enter picks the active option', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown');
      await press(fixture, 'Enter');

      expect(fixture.componentInstance.value()).toBe('de');
      expect(panel()).toBeNull();
    });

    it('Escape closes the panel without changing the value', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'Escape');

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.value()).toBe('');
    });

    it('typing letters activates the matching option (typeahead)', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'g'); // Germany

      expect(optionsInPanel()[1].hasAttribute('data-pct-active')).toBe(true);
    });

    it('opening activates the already picked option', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set('sk');
      fixture.detectChanges();
      await fixture.whenStable();

      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);
    });

    // There are four opening keys and until 2026-08-06 one was measured: the `||`
    // alternative short-circuits on the first hit, so the other three branches were
    // never executed even once (`lesson-57`).
    it.each(['ArrowUp', 'Enter', ' '])(
      'the panel is opened by %j as well',
      async (key) => {
        const fixture = await render(Host);
        await press(fixture, key);

        expect(panel()).not.toBeNull();
        expect(triggerOf(fixture).getAttribute('aria-expanded')).toBe('true');
      },
    );

    it('a key outside the handled ones does not open the panel', async () => {
      const fixture = await render(Host);
      await press(fixture, 'PageDown');

      expect(panel()).toBeNull();
    });

    it('Tab closes the list, because it has to let you leave the control', async () => {
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
      // Tab is the only handled key that is NOT eaten: were it eaten, focus would
      // stay in the control it was just about to leave.
      expect(event.defaultPrevented).toBe(false);
    });

    it('the typeahead buffer dies out after a pause in typing', async () => {
      vi.useFakeTimers();
      try {
        const fixture = await render(Host);
        await press(fixture, 'ArrowDown');
        await press(fixture, 'c'); // Czechia — disabled, so it looks further
        await press(fixture, 'z'); // "cz" matches nothing available

        vi.advanceTimersByTime(500);

        // After the pause the next letter starts a new word instead of joining the
        // old one.
        await press(fixture, 'p'); // Poland
        expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
      } finally {
        vi.useRealTimers();
      }
    });

    it('Home and End on a list with no available options activate nothing', async () => {
      // The list has TWO options, both disabled: with one, "no active option" and
      // "active outside the list" look the same, so the test would pass for a control
      // that activates the option at index 1 as well.
      const fixture = await render(AllDisabledHost);
      await press(fixture, 'ArrowDown');
      const active = () =>
        optionsInPanel().findIndex((o) => o.hasAttribute('data-pct-active'));

      expect(active()).toBe(-1);
      await press(fixture, 'End');
      expect(active()).toBe(-1);
      await press(fixture, 'Home');
      expect(active()).toBe(-1);
      expect(
        triggerOf(fixture).getAttribute('aria-activedescendant'),
      ).toBeNull();
    });

    it('Escape eats the key so as not to close something one floor up', async () => {
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

    it('space picks the active option the same as Enter', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown');

      await press(fixture, ' ');
      expect(fixture.componentInstance.value()).toBe('de');
      expect(panel()).toBeNull();
    });

    it('a typeahead that hits the FIRST option moves the active one too', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown'); // active: Germany (1)

      // Index 0 is the only value where `>= 0` and `> 0` give a different result —
      // without it the boundary of the condition is not measured.
      await press(fixture, 'p'); // Poland (0)
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('an arrow from a disabled active option jumps to the edge of the available list', async () => {
      const fixture = await render(DisabledSelectionHost);
      // The value points at `cz`, a disabled option: the active one is then off the
      // available list and a move has nothing to count its step from.
      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[2].hasAttribute('data-pct-active')).toBe(true);

      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
    });

    it('the up arrow from a disabled active option goes to the end of the list', async () => {
      const fixture = await render(DisabledSelectionHost);
      await press(fixture, 'ArrowDown');

      await press(fixture, 'ArrowUp');
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);
    });
  });

  it('disabled blocks opening', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(triggerOf(fixture).disabled).toBe(true);
    await press(fixture, 'ArrowDown');
    expect(panel()).toBeNull();
  });

  it('readonly allows opening and focus, but not changing the value', async () => {
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

  it('shows no error until the control has been touched', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Pick a country' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="error"]'),
    ).toBeNull();
    expect(triggerOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('once touched it binds the error through aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Pick a country' }),
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

  it('blur emits touch', async () => {
    const fixture = await render(Host);
    triggerOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('an empty option list shows the fallback message', async () => {
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
    it('syncs the choice with the model and propagates validation', async () => {
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

  describe('compatibility with classic forms (no CVA)', () => {
    it('reactive forms: [formControl] syncs both ways', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Germany');

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
      ).toContain('Slovakia');
    });

    it('template-driven: [(ngModel)] syncs both ways', async () => {
      const fixture = await render(NgModelHost);
      await fixture.whenStable();

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Germany');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      optionsInPanel()[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.country).toBe('pl');
    });
  });

  describe('the texts', () => {
    it('the default texts are English — the library imposes no language', async () => {
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

    it('providePctTexts swaps the texts, and the ones left out stay default', async () => {
      TestBed.configureTestingModule({
        providers: [providePctTexts({ selectEmpty: 'Aucune option' })],
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
      ).toBe('Aucune option');
      // An untranslated text does not disappear — it stays at its default.
      expect(
        fixture.nativeElement
          .querySelector('[data-pct-part="placeholder"]')
          ?.textContent?.trim(),
      ).toBe('Select…');
    });

    // The text used to come from the input default, that is from a read at
    // CONSTRUCTION — this test failed on `Select…` (decision 0014).
    it('a language change at runtime reaches the texts with no reload', async () => {
      const language = signal<'en' | 'fr'>('en');
      TestBed.configureTestingModule({
        providers: [
          providePctTexts(
            computed(() =>
              language() === 'fr'
                ? {
                    selectPlaceholder: 'Sélectionner…',
                    selectEmpty: 'Aucune option',
                  }
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

      language.set('fr');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(placeholder()).toBe('Sélectionner…');
    });

    // No value and an empty value mean different things: the first hands the text
    // over to the library, the second is a deliberate decision of the view author.
    it('placeholder="" stays empty instead of falling back to the default', async () => {
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

  describe('non-string values', () => {
    it('a choice sets the number, not its text form', async () => {
      const fixture = await render(NumberHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      optionsInPanel()[1].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe(20);
    });

    it('compareWith matches an entity by key, not by reference', async () => {
      const fixture = await render(EntityHost);

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]')
          ?.textContent,
      ).toContain('Paris');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(optionsInPanel()[1].getAttribute('aria-selected')).toBe('true');
    });

    it('without compareWith another instance of the same entity is not selected', async () => {
      const fixture = await render(EntityWithoutCompareHost);
      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]'),
      ).toBeNull();
    });

    it('reset() returns to the emptyValue the application declared', async () => {
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

    it('focus() is what signal forms reach for', async () => {
      const fixture = await render(NumberHost);
      const select = fixture.debugElement.children[0]
        .componentInstance as PctSelect<number>;

      select.focus();
      expect(document.activeElement).toBe(triggerOf(fixture));
    });
  });

  describe('the panel outside the host tree', () => {
    it('a click on the wrapper border opens the list', async () => {
      const fixture = await render(InFieldHost);
      const row = fixture.nativeElement.querySelector(
        '[data-pct-part="field-row"]',
      ) as HTMLElement;

      // The wrapper does not know the select — it calls `activate()` from the
      // PCT_FIELD contract. Without that path a click on the border outside the
      // trigger itself does nothing while looking clickable (`req-a11y-touch`).
      row.click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).not.toBeNull();
    });

    it('the panel takes over the theme of the nearest ancestor of the control', async () => {
      const fixture = await render(ThemedHost);
      await press(fixture, 'ArrowDown');

      // The CDK overlay is a child of `body`, so the `data-theme` cascade does not
      // reach it — the theme has to be carried over by hand (`lesson-35`).
      expect(panel()?.closest('[data-theme]')?.getAttribute('data-theme')).toBe(
        'dark',
      );
    });

    it('with no theme on an ancestor the panel gets no attribute', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      expect(panel()?.closest('[data-theme]')).toBeNull();
    });

    it('panelWidth="auto" gives the width to the content, and the control stays the lower bound', async () => {
      const fixture = await render(PanelWidthHost);
      fixture.componentInstance.panelWidth.set('auto');
      fixture.detectChanges();
      await fixture.whenStable();
      await press(fixture, 'ArrowDown');

      const overlay = panel()?.closest('.cdk-overlay-pane') as HTMLElement;
      // "Do not set the width" means an empty string: the overlay then carries only
      // `min-width`. A literal value would turn `auto` into `field`.
      expect(overlay.style.width).toBe('');
      expect(overlay.style.minWidth).not.toBe('');
    });

    it('a literal panelWidth reaches the overlay with no recomputation', async () => {
      const fixture = await render(PanelWidthHost);
      fixture.componentInstance.panelWidth.set('320px');
      fixture.detectChanges();
      await fixture.whenStable();
      await press(fixture, 'ArrowDown');

      const overlay = panel()?.closest('.cdk-overlay-pane') as HTMLElement;
      expect(overlay.style.width).toBe('320px');
      expect(overlay.style.minWidth).toBe('');
    });
  });
});
