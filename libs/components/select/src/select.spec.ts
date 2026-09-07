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
import { PctIconTemplate, providePctIcons } from '@pacit/components/icon';
import { PctField } from '@pacit/components/field';
import { part } from '../../testing/src/dom';
import { PctSelect } from './select';
import { PctSelectOptionTemplate } from './select.template';
import {
  pctFilterByLabel,
  pctKeepAll,
  PctSelectFilter,
  PctSelectItem,
  PctSelectOption,
  PctSelectPanelWidth,
} from './select.types';

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

/** The listbox inside the panel — the list, and the element that scrolls (0069). */
const list = () =>
  document.querySelector('[data-pct-part="list"]') as HTMLElement | null;

const optionsInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="option"]'),
  ) as HTMLElement[];

const groupsInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="group"]'),
  ) as HTMLElement[];

/**
 * A list with one option standing before the first heading, exactly as a native `<select>`
 * draws what comes above its first `<optgroup>`. The walk over it is
 * `Anywhere, Poland, Germany (disabled), Japan, Korea` — indexes 0..4 across the headings.
 */
const GROUPED: readonly PctSelectItem[] = [
  { value: 'any', label: 'Anywhere' },
  {
    label: 'Europe',
    options: [
      { value: 'pl', label: 'Poland' },
      { value: 'de', label: 'Germany', disabled: true },
    ],
  },
  {
    label: 'Asia',
    options: [
      { value: 'jp', label: 'Japan' },
      { value: 'kr', label: 'Korea' },
    ],
  },
];

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
  options = signal<readonly PctSelectItem[]>(OPTIONS);
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

const cities = (): readonly PctSelectOption<City>[] => [
  { value: { id: 1, name: 'London' }, label: 'London' },
  { value: { id: 2, name: 'Paris' }, label: 'Paris' },
];

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

/** Two options carrying one value — a defect of the input the component cannot repair. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options()" [(value)]="value" />`,
})
class DuplicateHost {
  readonly options = signal<readonly PctSelectOption[]>([
    { value: 'pl', label: 'Poland' },
    { value: 'de', label: 'Germany' },
    { value: 'pl', label: 'Poland (again)' },
  ]);
  value = signal<string | null>(null);
}

/** Two instances of one identity: equal for `byId`, distinct for the default comparison. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" [compareWith]="byId" />`,
})
class EntityDuplicateHost {
  readonly options: readonly PctSelectOption<City>[] = [
    { value: { id: 1, name: 'London' }, label: 'London' },
    { value: { id: 1, name: 'London' }, label: 'London (again)' },
  ];
  byId = (a: City, b: City) => a.id === b.id;
}

/** The same list without a comparator — the identical options are then two values. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options" />`,
})
class EntityDuplicateWithoutCompareHost {
  readonly options: readonly PctSelectOption<City>[] = [
    { value: { id: 1, name: 'London' }, label: 'London' },
    { value: { id: 1, name: 'London' }, label: 'London (again)' },
  ];
}

/** A list rebuilt from a response: the same data arriving as new instances. */
@Component({
  imports: [PctSelect],
  template: `<pct-select [options]="options()" [compareWith]="byId" />`,
})
class RebuiltListHost {
  readonly options = signal<readonly PctSelectOption<City>[]>(cities());
  byId = (a: City, b: City) => a.id === b.id;

  rebuild(): void {
    this.options.set(cities());
  }
}

/**
 * A select named from outside. The name is an INPUT because the host carries no role for a
 * consumer's `aria-label` to sit on — the heading is here so `ariaLabelledby` has something
 * real to point at.
 */
@Component({
  imports: [PctSelect],
  template: `<h2 id="shipping-heading">Shipping country</h2>
    <pct-select
      [options]="options"
      [label]="label()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
    />`,
})
class NamedHost {
  readonly options = OPTIONS;
  label = signal('');
  ariaLabel = signal('');
  ariaLabelledby = signal('');
}

/** The consumer's own option row, and everything the context carries. */
@Component({
  imports: [PctSelect, PctSelectOptionTemplate],
  template: `<pct-select [options]="options()" [(value)]="value">
    <ng-template
      [pctSelectOption]="options()"
      let-option
      let-i="index"
      let-active="active"
      let-selected="selected"
      let-disabled="disabled"
    >
      <b data-testid="custom"
        >{{ i }}:{{ option.label }}:{{ option.value }}:{{ active }}:{{
          selected
        }}:{{ disabled }}</b
      >
    </ng-template>
  </pct-select>`,
})
class OptionTemplateHost {
  options = signal<readonly PctSelectItem[]>(OPTIONS);
  value = signal<string | null>('');
}

/** The slot written where no select reads it — inside the chrome, beside the control. */
@Component({
  imports: [PctField, PctSelect, PctSelectOptionTemplate],
  template: `<pct-field label="Country">
    <pct-select [options]="options" />
    <ng-template [pctSelectOption]="options" let-option>{{
      option.label
    }}</ng-template>
  </pct-field>`,
})
class MisplacedSlotHost {
  options = OPTIONS;
}

/** The same slot inside an `@if` — right markup that a counting report would have accused. */
@Component({
  imports: [PctSelect, PctSelectOptionTemplate],
  template: `<pct-select [options]="options">
    @if (shown()) {
      <ng-template [pctSelectOption]="options" let-option
        ><b data-testid="custom">{{ option.label }}</b></ng-template
      >
    }
  </pct-select>`,
})
class ConditionalSlotHost {
  options = OPTIONS;
  shown = signal(true);
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

    expect(list()?.getAttribute('role')).toBe('listbox');
    expect(optionsInPanel()).toHaveLength(4);
    expect(triggerOf(fixture).getAttribute('aria-expanded')).toBe('true');
    expect(triggerOf(fixture).getAttribute('aria-controls')).toBe(
      part(document, 'list').id,
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

    /**
     * The gesture the template's `(overlayOutsideClick)` answers, in jsdom. It is here because
     * a coverage exception said it could not be: the reason written down was that a synthetic
     * click measures nothing, and the CDK's dispatcher listens on the document and answers
     * one — the environment was never the limit, nothing had asked. The three-engine case in
     * `apps/sandbox-e2e/src/select.spec.ts` stays where it is: it is the one that proves the
     * gesture works on a click a browser dispatched.
     */
    it('a click outside the panel closes it', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      expect(panel()).not.toBeNull();

      document.body.click();
      fixture.detectChanges();
      await fixture.whenStable();

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

    it('the CDK is not a second owner of Escape', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');
      expect(panel()).not.toBeNull();

      // The road the CDK's dispatcher takes: a listener on the document, delivering to the
      // top-most attached overlay — so the target is `body` and not the trigger, and
      // `keyCode` is set because that is the field the CDK reads. Until C19 this closed the
      // panel: `disableClose` was false, the overlay detached itself and `(detach)` finished
      // the job, and no test in this file named that owner. The panel now stays, because the
      // key belongs to the trigger's map and to nothing else. Switch
      // `cdkConnectedOverlayDisableClose` back off and this case goes red.
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
          cancelable: true,
        }),
      );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).not.toBeNull();
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

  describe('the mouse and the keyboard point at the same option', () => {
    const hover = async (fixture: ComponentFixture<unknown>, index: number) => {
      optionsInPanel()[index].dispatchEvent(
        new MouseEvent('mouseenter', { bubbles: false }),
      );
      fixture.detectChanges();
      await fixture.whenStable();
    };

    it('hovering an option makes it the active one', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      await hover(fixture, 3);

      // Otherwise Enter after a hover would pick something other than what is
      // highlighted — the mouse moved the eye, the keyboard kept its own place.
      expect(optionsInPanel()[3].hasAttribute('data-pct-active')).toBe(true);
      await press(fixture, 'Enter');
      expect(fixture.componentInstance.value()).toBe('sk');
    });

    it('hovering a disabled option activates nothing', async () => {
      const fixture = await render(Host);
      await press(fixture, 'ArrowDown');

      await hover(fixture, 2);

      // A highlight on an option a click cannot pick promises what the control will
      // not deliver.
      expect(optionsInPanel()[2].hasAttribute('data-pct-active')).toBe(false);
      expect(optionsInPanel()[0].hasAttribute('data-pct-active')).toBe(true);
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

  /**
   * The same sentence, said to the other reader (`req-a11y-built-in`). Focus stays on the
   * trigger and an empty listbox has no option for `aria-activedescendant` to name, so the
   * text drawn inside the panel reaches the eye and nobody else — the live channel from
   * `core` is where a screen reader is
   * ([0026](../../../../docs/decisions/0026-one-channel-per-politeness.md)).
   */
  describe('the empty panel announces itself', () => {
    const live = (): string | null =>
      document.querySelector('[data-pct-live="polite"]')?.textContent ?? null;

    const openEmpty = async (): Promise<ComponentFixture<Host>> => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([]);
      fixture.detectChanges();
      await fixture.whenStable();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    };

    it('opening an empty panel puts the text on the polite channel', async () => {
      await openEmpty();

      expect(live()).toBe('No options');
    });

    /**
     * The sentence stands BESIDE the list, not in it (0069): a `listbox` may own options
     * and groups and nothing else, so a message row inside it was a critical
     * `aria-required-children` — measured over `select-empty` in `a11y.spec.ts`, on a panel
     * four audits stood over and none had opened — and an empty listbox is a state, which
     * axe marks for review and does not fail.
     */
    it('the sentence stands beside the list, not in it', async () => {
      await openEmpty();

      const listbox = list();
      const empty = document.querySelector('[data-pct-part="empty"]');
      expect(listbox?.getAttribute('role')).toBe('listbox');
      expect(listbox?.children.length).toBe(0);
      expect(empty?.textContent?.trim()).toBe('No options');
      expect(listbox?.contains(empty)).toBe(false);
      expect(empty?.parentElement).toBe(panel());
    });

    it('a panel with options says nothing', async () => {
      const fixture = await render(Host);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(live()).toBe('');
    });

    it('closing withdraws it, so the next opening says it again', async () => {
      const fixture = await openEmpty();

      await press(fixture, 'Escape');
      expect(live()).toBe('');

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(live()).toBe('No options');
    });

    /**
     * A control destroyed with its panel open takes its sentence with it. Left behind, the
     * text would sit on a shared channel until something else wrote over it — and the next
     * select to open an empty panel would find its own message already there and stay silent.
     */
    it('a destroyed select leaves nothing on the channel', async () => {
      const fixture = await openEmpty();

      fixture.destroy();

      expect(live()).toBe('');
    });
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

    // The bridge carries more than the value, and each half below is a promise a consumer's
    // form code leans on: `disable()` must reach the real <button>, because a trigger only
    // visually dimmed still opens the panel for the keyboard.
    it('reactive forms: disable() and enable() reach the trigger', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      ctrl.disable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(triggerOf(fixture).disabled).toBe(true);

      ctrl.enable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(triggerOf(fixture).disabled).toBe(false);
    });

    it('reactive forms: validity reaches the trigger as aria-invalid', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      expect(triggerOf(fixture).getAttribute('aria-invalid')).toBeNull();

      ctrl.markAsTouched();
      ctrl.setErrors({ boom: true });
      fixture.detectChanges();
      await fixture.whenStable();
      expect(triggerOf(fixture).getAttribute('aria-invalid')).toBe('true');
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

    it('a value cleared to null never reaches the consumer comparator', async () => {
      const fixture = await render(EntityHost);

      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await fixture.whenStable();

      // Both computeds now run against a comparator that would throw on `null` — an empty
      // trigger and a panel with nothing selected are the proof the guards answered first.
      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]'),
      ).toBeNull();

      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(
        optionsInPanel().filter(
          (option) => option.getAttribute('aria-selected') === 'true',
        ),
      ).toEqual([]);
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

  /**
   * A value maps back to an option, so two options sharing a value make the mapping
   * ambiguous — and the component cannot pick for the application. It says so in dev mode
   * instead, permanently in English and outside `PCT_TEXTS` (`req-api-texts`).
   */
  describe('two options with one value', () => {
    /** Every case here provokes a warning; a real one in the output would read as a failure. */
    const silenced = () =>
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('names both positions and both labels, once for the pair', async () => {
      const warn = silenced();
      try {
        await render(DuplicateHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // The whole message, not a fragment of it: the positions because the labels are what
        // differ (naming the value alone leaves the reader searching a list they have just
        // read), and the way out because "do not do this" leaves them where it found them.
        expect(String(warn.mock.calls[0][0])).toBe(
          '[pct-select] Options with the same value: ' +
            '0 ("Poland") and 2 ("Poland (again)"). ' +
            'A value maps back to an option through `compareWith`, and the first ' +
            'match wins: the later option can never show as selected, and choosing ' +
            "it displays the earlier one's label. Give the options distinct values, " +
            'or a `compareWith` that tells them apart.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('a list with distinct values stays silent', async () => {
      const warn = silenced();
      try {
        await render(Host);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('follows the input rather than the first render, and reports every pair', async () => {
      const fixture = await render(Host);
      const warn = silenced();
      try {
        fixture.componentInstance.options.set([
          { value: 'pl', label: 'Poland' },
          { value: 'de', label: 'Germany' },
          { value: 'pl', label: 'Poland (again)' },
          { value: 'de', label: 'Germany (again)' },
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain(
          'same value: 0 ("Poland") and 2 ("Poland (again)"), ' +
            '1 ("Germany") and 3 ("Germany (again)").',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('what counts as the same value is compareWith, not the reference', async () => {
      const warn = silenced();
      try {
        await render(EntityDuplicateHost);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain('0 ("London")');
      } finally {
        warn.mockRestore();
      }
    });

    it('the same two options without a comparator are two values', async () => {
      const warn = silenced();
      try {
        await render(EntityDuplicateWithoutCompareHost);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('the later option cannot show as selected — what the warning is about', async () => {
      const warn = silenced();
      try {
        const fixture = await render(DuplicateHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();

        optionsInPanel()[2].click();
        fixture.detectChanges();
        await fixture.whenStable();

        // The click set the value it shares with option 0 — and the trigger shows that one.
        expect(fixture.componentInstance.value()).toBe('pl');
        expect(part(fixture.nativeElement, 'value').textContent).toContain(
          'Poland',
        );
        expect(part(fixture.nativeElement, 'value').textContent).not.toContain(
          'again',
        );
      } finally {
        warn.mockRestore();
      }
    });
  });

  /**
   * `track $index`: a row is a function of its index in every binding, so the loop has no use
   * for the identity of values the library did not create.
   */
  it('a list rebuilt from equal data reuses the rows', async () => {
    const fixture = await render(RebuiltListHost);
    triggerOf(fixture).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const before = optionsInPanel();
    fixture.componentInstance.rebuild();
    fixture.detectChanges();
    await fixture.whenStable();

    const after = optionsInPanel();
    expect(after).toHaveLength(before.length);
    // Tracking by value would key on the references, so all of these would be new elements.
    expect(after[0]).toBe(before[0]);
    expect(after[1]).toBe(before[1]);
  });

  // The name the host cannot carry: `role="combobox"` sits on the trigger and `role="listbox"`
  // on the panel, so a consumer's `aria-label` on `<pct-select>` lands on an element with no
  // role and is ignored (req-a11y-built-in).
  describe('the accessible name comes in through an input', () => {
    it('ariaLabel names the trigger and the panel, and never the host', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabel.set('Shipping country');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(triggerOf(fixture).getAttribute('aria-label')).toBe(
        'Shipping country',
      );
      expect(
        (
          fixture.nativeElement.querySelector('pct-select') as HTMLElement
        ).getAttribute('aria-label'),
      ).toBeNull();

      await press(fixture, 'ArrowDown');
      expect(list()?.getAttribute('aria-label')).toBe('Shipping country');
    });

    it('ariaLabelledby replaces the internal label rather than joining it', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.label.set('Country');
      fixture.componentInstance.ariaLabelledby.set('shipping-heading');
      fixture.detectChanges();
      await fixture.whenStable();

      // Joined, the name would read "Country Shipping country" — two names for one control.
      expect(triggerOf(fixture).getAttribute('aria-labelledby')).toBe(
        'shipping-heading',
      );

      await press(fixture, 'ArrowDown');
      expect(list()?.getAttribute('aria-labelledby')).toBe('shipping-heading');
    });

    it('with neither input the visible label still names the trigger', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.label.set('Country');
      fixture.detectChanges();
      await fixture.whenStable();

      const trigger = triggerOf(fixture);
      expect(trigger.getAttribute('aria-label')).toBeNull();
      expect(trigger.getAttribute('aria-labelledby')).toBe(
        (
          fixture.nativeElement.querySelector(
            '[data-pct-part="label"]',
          ) as HTMLElement
        ).id,
      );
    });
  });
  describe('the option row a consumer writes (req-api-templates)', () => {
    it('replaces the built-in label and is handed the whole context', async () => {
      const fixture = await render(OptionTemplateHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = optionsInPanel();
      expect(rows).toHaveLength(4);
      // The row's own chrome stays with the component — only its CONTENT is the consumer's.
      expect(rows[0].getAttribute('role')).toBe('option');
      expect(rows[0].querySelector('[data-testid="custom"]')).not.toBeNull();
      // index, label, value, active, selected, disabled — the first option is the active one
      // on opening with no value chosen.
      expect(rows[0].textContent?.trim()).toBe('0:Poland:pl:true:false:false');
      expect(rows[2].textContent?.trim()).toBe('2:Czechia:cz:false:false:true');
    });

    it('the context follows the state the built-in row paints', async () => {
      const fixture = await render(OptionTemplateHost);
      fixture.componentInstance.value.set('de');
      fixture.detectChanges();
      await fixture.whenStable();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionsInPanel()[1].textContent?.trim()).toBe(
        '1:Germany:de:true:true:false',
      );
      // The same row, after the keyboard moves the active option off it.
      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()[1].textContent?.trim()).toBe(
        '1:Germany:de:false:true:false',
      );
    });

    it('without a template the built-in label is what renders', async () => {
      const fixture = await render(Host);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionsInPanel()[0].textContent?.trim()).toBe('Poland');
      expect(
        optionsInPanel()[0].querySelector('[data-testid="custom"]'),
      ).toBeNull();
    });
  });

  describe('groups (what a native `<optgroup>` draws)', () => {
    const openGrouped = async (
      list: readonly PctSelectItem[] = GROUPED,
    ): Promise<ComponentFixture<Host>> => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set(list);
      fixture.detectChanges();
      await fixture.whenStable();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      return fixture;
    };

    it('draws a heading as a named group and leaves the loose option outside one', async () => {
      await openGrouped();

      const groups = groupsInPanel();
      expect(groups).toHaveLength(2);
      expect(groups.map((g) => g.getAttribute('role'))).toEqual([
        'group',
        'group',
      ]);

      // The name is a REFERENCE to the visible heading, not a copy of its text: one sentence
      // on the screen and in the tree (`lesson-91`).
      const heading = groups[0].querySelector('[data-pct-part="group-label"]');
      expect(heading?.textContent?.trim()).toBe('Europe');
      expect(groups[0].getAttribute('aria-labelledby')).toBe(heading?.id);
      expect(heading?.id).toBeTruthy();
      expect(groups[1].getAttribute('aria-labelledby')).toBe(
        groups[1].querySelector('[data-pct-part="group-label"]')?.id,
      );

      // An option before the first heading is owned by the listbox itself — a plain wrapper
      // around it would leave `role="option"` with no owner.
      const rows = optionsInPanel();
      expect(rows).toHaveLength(5);
      expect(rows[0].parentElement?.getAttribute('role')).toBe('listbox');
      expect(rows[1].parentElement).toBe(groups[0]);
      expect(rows[4].parentElement).toBe(groups[1]);
    });

    it('an option after a heading belongs to nobody, not to the heading above it', async () => {
      await openGrouped([
        { label: 'Europe', options: [{ value: 'pl', label: 'Poland' }] },
        { value: 'any', label: 'Anywhere' },
        { value: 'none', label: 'Nowhere' },
      ]);

      const groups = groupsInPanel();
      expect(groups).toHaveLength(1);
      const rows = optionsInPanel();
      expect(rows[0].parentElement).toBe(groups[0]);
      // The two loose ones share ONE nameless section and hang off the listbox itself.
      expect(rows[1].parentElement?.getAttribute('role')).toBe('listbox');
      expect(rows[2].parentElement).toBe(rows[1].parentElement);
    });

    it('numbers the options across the headings, not inside them', async () => {
      const fixture = await openGrouped();
      const rows = optionsInPanel();

      // Distinct ids, in the order the keyboard walks them.
      expect(new Set(rows.map((r) => r.id)).size).toBe(5);
      const trigger = triggerOf(fixture);
      expect(trigger.getAttribute('aria-activedescendant')).toBe(rows[0].id);

      await press(fixture, 'ArrowDown');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(rows[1].id);
      // Germany is disabled, so one press crosses it AND the heading below it.
      await press(fixture, 'ArrowDown');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(rows[3].id);

      await press(fixture, 'End');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(rows[4].id);
      await press(fixture, 'Home');
      expect(trigger.getAttribute('aria-activedescendant')).toBe(rows[0].id);
    });

    it('picks an option out of the second group and shows its label', async () => {
      const fixture = await openGrouped();
      optionsInPanel()[3].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe('jp');
      expect(part(fixture, 'value').textContent?.trim()).toBe('Japan');
    });

    it('a value inside a group is the selected row', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set(GROUPED);
      fixture.componentInstance.value.set('kr');
      fixture.detectChanges();
      await fixture.whenStable();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = optionsInPanel();
      expect(rows[4].getAttribute('aria-selected')).toBe('true');
      expect(
        rows.filter((r) => r.getAttribute('aria-selected') === 'true'),
      ).toHaveLength(1);
      // Opening puts the cursor on the chosen row, wherever its heading is.
      expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[4].id,
      );
    });

    it('typeahead crosses the headings', async () => {
      const fixture = await openGrouped();
      await press(fixture, 'j');
      expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
        optionsInPanel()[3].id,
      );
    });

    it('a disabled group disables every option below it', async () => {
      const fixture = await openGrouped([
        { value: 'any', label: 'Anywhere' },
        {
          label: 'Europe',
          disabled: true,
          options: [
            { value: 'pl', label: 'Poland' },
            { value: 'de', label: 'Germany' },
          ],
        },
      ]);

      const rows = optionsInPanel();
      expect(rows[1].getAttribute('aria-disabled')).toBe('true');
      expect(rows[2].getAttribute('aria-disabled')).toBe('true');
      expect(rows[1].hasAttribute('data-pct-disabled')).toBe(true);

      rows[1].click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe('');

      // The keyboard walks past the whole group: there is nowhere below to go.
      await press(fixture, 'ArrowDown');
      expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[0].id,
      );
    });

    it("a consumer's own row is told the group's state, not the option's", async () => {
      const fixture = await render(OptionTemplateHost);
      fixture.componentInstance.options.set([
        {
          label: 'Europe',
          disabled: true,
          options: [{ value: 'pl', label: 'Poland' }],
        },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      // index, label, value, active, selected, disabled — the last one is the ROW's, and the
      // option object it stands beside carries no `disabled` at all.
      expect(optionsInPanel()[0].textContent?.trim()).toBe(
        '0:Poland:pl:false:false:true',
      );
    });

    it("the group's state does not rewrite the option a consumer handed in", async () => {
      const option: PctSelectOption = { value: 'pl', label: 'Poland' };
      await openGrouped([
        { label: 'Europe', disabled: true, options: [option] },
      ]);
      expect(option.disabled).toBeUndefined();
    });

    it('a group with no options is drawn by nobody', async () => {
      await openGrouped([
        { label: 'Nowhere', options: [] },
        { label: 'Asia', options: [{ value: 'jp', label: 'Japan' }] },
      ]);

      const groups = groupsInPanel();
      expect(groups).toHaveLength(1);
      expect(
        groups[0].querySelector('[data-pct-part="group-label"]')?.textContent,
      ).toContain('Asia');
    });

    it('groups that are all empty are an empty list, message and all', async () => {
      await openGrouped([
        { label: 'Nowhere', options: [] },
        { label: 'Nowhere either', options: [] },
      ]);

      expect(optionsInPanel()).toHaveLength(0);
      expect(groupsInPanel()).toHaveLength(0);
      expect(
        document.querySelector('[data-pct-part="empty"]')?.textContent?.trim(),
      ).toBe('No options');
    });

    it('two equal values are reported by their position in the whole list', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      await openGrouped([
        { label: 'Europe', options: [{ value: 'pl', label: 'Poland' }] },
        { label: 'Again', options: [{ value: 'pl', label: 'Poland twice' }] },
      ]);

      expect(warn).toHaveBeenCalledTimes(1);
      expect(warn.mock.calls[0][0]).toContain(
        '0 ("Poland") and 1 ("Poland twice")',
      );
      warn.mockRestore();
    });
  });

  describe('a slot the select never reads', () => {
    const silenced = () =>
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('says so when the slot stands beside the control rather than inside it', async () => {
      const warn = silenced();
      try {
        await render(MisplacedSlotHost);
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain(
          '[pctSelectOption] This template fills a slot of a component that does not ' +
            'read it',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('an `@if` between the slot and the select is not a fault, and still renders', async () => {
      const warn = silenced();
      try {
        const fixture = await render(ConditionalSlotHost);
        expect(warn).not.toHaveBeenCalled();
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(
          optionsInPanel()[0].querySelector('[data-testid="custom"]'),
        ).not.toBeNull();
      } finally {
        warn.mockRestore();
      }
    });
  });
  /**
   * Filtering. What is measured here is one sentence in two halves: the question narrows the
   * PANEL and never the value, and it does not outlive the panel it was asked in
   * ([0035](../../../../docs/decisions/0035-a-filter-is-a-question-not-a-value.md)).
   */
  describe('a question typed into the trigger (filterable)', () => {
    @Component({
      imports: [PctSelect],
      template: `<pct-select
        label="Country"
        [options]="options()"
        [filterable]="true"
        [filterWith]="filterWith()"
        [readonly]="ro()"
        [(value)]="value"
        [(filterText)]="query"
        (touch)="touchCount = touchCount + 1"
      />`,
    })
    class FilterHost {
      options = signal<readonly PctSelectItem[]>(OPTIONS);
      value = signal<string | null>('');
      query = signal('');
      ro = signal(false);
      filterWith = signal<PctSelectFilter>(pctFilterByLabel);
      touchCount = 0;
    }

    const field = (f: ComponentFixture<unknown>) =>
      triggerOf(f) as unknown as HTMLInputElement;

    /** What a keystroke really is on a text field: the value, then the `input` event. */
    const type = async (f: ComponentFixture<unknown>, text: string) => {
      const input = field(f);
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      f.detectChanges();
      await f.whenStable();
    };

    const labels = () => optionsInPanel().map((o) => o.textContent?.trim());

    it('the trigger is a text field, and the select-only one is not', async () => {
      const fixture = await render(FilterHost);
      const input = field(fixture);

      expect(input.tagName).toBe('INPUT');
      expect(input.getAttribute('role')).toBe('combobox');
      // The one ARIA attribute that says the panel answers what is typed.
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      // On an `<input>` `name` is what a native form submits the TEXT under, and the text is
      // the question — so this branch carries none.
      expect(input.hasAttribute('name')).toBe(false);

      const plain = triggerOf(await render(Host));
      expect(plain.tagName).toBe('BUTTON');
      expect(plain.hasAttribute('aria-autocomplete')).toBe(false);
    });

    it('typing opens the panel and leaves standing what the letters name', async () => {
      const fixture = await render(FilterHost);
      expect(panel()).toBeNull();

      await type(fixture, 'la');

      expect(panel()).not.toBeNull();
      expect(labels()).toEqual(['Poland']);
      expect(fixture.componentInstance.query()).toBe('la');
    });

    it('the case of the letters is not part of the question', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'POL');

      expect(labels()).toEqual(['Poland']);
    });

    it('the cursor goes to the first row still standing, skipping a disabled one', async () => {
      const fixture = await render(FilterHost);

      // `ia` leaves Czechia (disabled) and Slovakia, in that order.
      await type(fixture, 'ia');
      expect(labels()).toEqual(['Czechia', 'Slovakia']);

      const active = optionsInPanel().findIndex((o) =>
        o.hasAttribute('data-pct-active'),
      );
      expect(active).toBe(1);
      // …and the id it is named by is one that is in the tree.
      const named = field(fixture).getAttribute('aria-activedescendant');
      expect(named).toBe(optionsInPanel()[1].id);
    });

    it('a question nothing answers says so, and not what an empty list says', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'never');

      expect(optionsInPanel()).toHaveLength(0);
      expect(
        panel()?.querySelector('[data-pct-part="empty"]')?.textContent?.trim(),
      ).toBe('No matches');
      expect(
        document.querySelector('[data-pct-live="polite"]')?.textContent,
      ).toBe('No matches');
    });

    it('and the sentence is withdrawn when the question goes', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'never');
      await press(fixture, 'Escape');

      // The query is already `''` by now, so the sentence to take off the channel is no
      // longer the one the control would compute — both are withdrawn, and `retract` takes
      // off only what is still there.
      expect(
        document.querySelector('[data-pct-live="polite"]')?.textContent,
      ).toBe('');
    });

    it('Enter picks what is standing, and the question goes with the panel', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'ny');
      expect(labels()).toEqual(['Germany']);

      await press(fixture, 'Enter');

      expect(fixture.componentInstance.value()).toBe('de');
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.query()).toBe('');
      // The field goes back to holding the answer.
      expect(field(fixture).value).toBe('Germany');
    });

    it('Escape closes and the list comes back whole', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'la');
      await press(fixture, 'Escape');

      expect(panel()).toBeNull();
      expect(fixture.componentInstance.query()).toBe('');

      await press(fixture, 'ArrowDown');
      expect(labels()).toEqual(['Poland', 'Germany', 'Czechia', 'Slovakia']);
    });

    it('with nothing chosen the placeholder is the library string, open or closed', async () => {
      const fixture = await render(FilterHost);
      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(field(fixture).getAttribute('placeholder')).toBe('Select…');

      await press(fixture, 'ArrowDown');
      // Open, and still the library's: an answer is what moves to the placeholder, and there
      // is none.
      expect(field(fixture).getAttribute('placeholder')).toBe('Select…');
    });

    it('a chosen label survives a question that hides it', async () => {
      const fixture = await render(FilterHost);
      fixture.componentInstance.value.set('pl');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(field(fixture).value).toBe('Poland');

      await type(fixture, 'never');

      // The field holds the question — and the answer stands behind it, as a placeholder,
      // which is the one string a reader never calls the field's value.
      expect(field(fixture).value).toBe('never');
      expect(field(fixture).getAttribute('placeholder')).toBe('Poland');
      // …and nothing was written: a question is not an answer.
      expect(fixture.componentInstance.value()).toBe('pl');

      await press(fixture, 'Escape');
      expect(field(fixture).value).toBe('Poland');
    });

    it('a filter nobody asked is not called: no question, no narrowing', async () => {
      const fixture = await render(FilterHost);
      // A predicate that answers "no" to everything. With a question typed it empties the
      // panel; with none it is never reached, because there is nothing to be asked about.
      fixture.componentInstance.filterWith.set(() => false);
      fixture.detectChanges();

      await press(fixture, 'ArrowDown');
      expect(optionsInPanel()).toHaveLength(4);

      await type(fixture, 'la');
      expect(optionsInPanel()).toHaveLength(0);
    });

    it('a filter of the consumer own decides instead of the label', async () => {
      const fixture = await render(FilterHost);
      // A list where the code is what the user knows: `de` names Germany, not Poland.
      fixture.componentInstance.filterWith.set((option, query) =>
        String(option.value).startsWith(query.toLowerCase()),
      );
      fixture.detectChanges();

      await type(fixture, 'de');
      expect(labels()).toEqual(['Germany']);
    });

    it('the letters belong to the caret: End, Home and the space bar move no cursor', async () => {
      const fixture = await render(FilterHost);
      await type(fixture, 'a');
      expect(labels()).toHaveLength(4);

      await press(fixture, 'ArrowDown'); // Poland → Germany
      const active = () =>
        optionsInPanel().findIndex((o) => o.hasAttribute('data-pct-active'));
      expect(active()).toBe(1);

      await press(fixture, 'End');
      expect(active()).toBe(1);
      await press(fixture, 'Home');
      expect(active()).toBe(1);

      await press(fixture, ' ');
      expect(active()).toBe(1);
      // A space is a character, so it neither picks nor closes.
      expect(fixture.componentInstance.value()).toBe('');
      expect(panel()).not.toBeNull();
    });

    it('and no typeahead — the letters are already going somewhere', async () => {
      const fixture = await render(FilterHost);
      await press(fixture, 'ArrowDown');
      const active = () =>
        optionsInPanel().findIndex((o) => o.hasAttribute('data-pct-active'));
      expect(active()).toBe(0);

      await press(fixture, 'g');

      expect(active()).toBe(0);
      // The same key on the select-only trigger jumps to Germany.
      const plain = await render(Host);
      triggerOf(plain).click();
      plain.detectChanges();
      await press(plain, 'g');
      expect(
        optionsInPanel().findIndex((o) => o.hasAttribute('data-pct-active')),
      ).toBe(1);
    });

    it('neither Enter nor a space opens the panel, because the field has both', async () => {
      const fixture = await render(FilterHost);

      await press(fixture, 'Enter');
      expect(panel()).toBeNull();
      await press(fixture, ' ');
      expect(panel()).toBeNull();

      await press(fixture, 'ArrowDown');
      expect(panel()).not.toBeNull();
    });

    it('a heading left with nothing standing is not drawn', async () => {
      const fixture = await render(FilterHost);
      fixture.componentInstance.options.set(GROUPED);
      fixture.detectChanges();

      await type(fixture, 'or');

      expect(labels()).toEqual(['Korea']);
      expect(groupsInPanel()).toHaveLength(1);
      expect(
        groupsInPanel()[0]
          .querySelector('[data-pct-part="group-label"]')
          ?.textContent?.trim(),
      ).toBe('Asia');
      // The numbering is the numbering of what is standing: the one row left is row 0.
      expect(optionsInPanel()[0].id.endsWith('-option-0')).toBe(true);
    });

    it('a question written on a select that takes none narrows nothing', async () => {
      @Component({
        imports: [PctSelect],
        template: `<pct-select [options]="options" filterText="never" />`,
      })
      class Unasked {
        options = OPTIONS;
      }

      const fixture = await render(Unasked);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionsInPanel()).toHaveLength(4);
    });

    it('a readonly control refuses the letters, and the platform refuses them first', async () => {
      const fixture = await render(FilterHost);
      fixture.componentInstance.ro.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(field(fixture).hasAttribute('readonly')).toBe(true);

      await type(fixture, 'la');
      expect(panel()).toBeNull();
      expect(fixture.componentInstance.query()).toBe('');

      // A readonly `<input>` still takes a click, unlike a disabled `<button>` — so the press
      // has a guard of its own and this is what says so.
      field(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).toBeNull();
    });

    it('a click on the text field opens and never closes', async () => {
      const fixture = await render(FilterHost);

      field(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).not.toBeNull();

      await type(fixture, 'a');
      expect(optionsInPanel()).toHaveLength(4);
      await press(fixture, 'ArrowDown');

      // A press on a text field is a caret being placed, not a switch being flipped — and the
      // question stands where it was. A panel that closed and reopened under the click would
      // have taken it with it, which is the one way this could look right and be wrong.
      field(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).not.toBeNull();
      expect(fixture.componentInstance.query()).toBe('a');
      expect(optionsInPanel()).toHaveLength(4);
      // …and the cursor is where the walk left it, on the SECOND row. A panel opened again
      // under the click would have put it back on the first.
      expect(field(fixture).getAttribute('aria-activedescendant')).toBe(
        optionsInPanel()[1].id,
      );
    });

    it('the chrome is told the cursor is a caret, and told again when it stops being one', async () => {
      @Component({
        imports: [PctField, PctSelect],
        template: `<pct-field label="Country"
          ><pct-select [options]="options" [filterable]="asks()"
        /></pct-field>`,
      })
      class InField {
        options = OPTIONS;
        asks = signal(true);
      }

      const fixture = await render(InField);
      const field = fixture.nativeElement.querySelector('pct-field');
      expect(field.getAttribute('data-pct-cursor')).toBe('text');

      fixture.componentInstance.asks.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      // A getter that reads a signal is a signal to the `computed` that reads it.
      expect(field.getAttribute('data-pct-cursor')).toBe('pointer');
    });

    it('leaving the field reports the touch, as leaving the button does', async () => {
      const fixture = await render(FilterHost);

      field(fixture).dispatchEvent(new FocusEvent('blur', { bubbles: true }));
      await fixture.whenStable();

      expect(fixture.componentInstance.touchCount).toBe(1);
    });

    it('the default filter folds case and leaves the accents alone', () => {
      const person: PctSelectOption = { value: 'zoe', label: 'Zoë' };

      expect(pctFilterByLabel(person, 'ZOË')).toBe(true);
      expect(pctFilterByLabel(person, 'oë')).toBe(true);
      // The half nobody promises: whether an accent is a letter of its own is a question of
      // language — `Intl.Collator` answers it one way for German and the other for Swedish on
      // the same pair of letters — so the library leaves it to `filterWith` (`lesson-101`).
      expect(pctFilterByLabel(person, 'zoe')).toBe(false);
    });
  });

  describe('the cross that takes the answer back (clearable)', () => {
    @Component({
      imports: [PctSelect],
      template: `<pct-select
        label="Country"
        [options]="options()"
        [clearable]="clearable()"
        [filterable]="filterable()"
        [disabled]="disabled()"
        [readonly]="ro()"
        [emptyValue]="emptyValue()"
        [(value)]="value"
        [(filterText)]="query"
      />`,
    })
    class ClearHost {
      options = signal<readonly PctSelectItem[]>(OPTIONS);
      clearable = signal(true);
      filterable = signal(false);
      disabled = signal(false);
      ro = signal(false);
      emptyValue = signal<string | null>(null);
      value = signal<string | null>('pl');
      query = signal('');
    }

    const cross = (f: ComponentFixture<unknown>) =>
      f.nativeElement.querySelector(
        '[data-pct-part="clear"]',
      ) as HTMLButtonElement | null;

    /** A real press: `mousedown` first, which is where the focus decision is taken. */
    const pressCross = async (f: ComponentFixture<unknown>) => {
      const button = cross(f);
      const down = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      button?.dispatchEvent(down);
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      f.detectChanges();
      await f.whenStable();
      return down;
    };

    const type = async (f: ComponentFixture<unknown>, text: string) => {
      const input = triggerOf(f) as unknown as HTMLInputElement;
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      f.detectChanges();
      await f.whenStable();
    };

    it('stands only where there is an answer to take back, and only when asked for', async () => {
      const fixture = await render(ClearHost);
      expect(cross(fixture)).not.toBeNull();
      expect(cross(fixture)?.getAttribute('aria-label')).toBe('Clear');

      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(cross(fixture)).toBeNull();

      fixture.componentInstance.value.set('pl');
      fixture.componentInstance.clearable.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(cross(fixture)).toBeNull();
    });

    it('a select nobody told to be clearable draws none, answer or no answer', async () => {
      // The default is part of the promise: a cross is a road back out of a required field,
      // and an application has to ask for it.
      const fixture = await render(Host);
      fixture.componentInstance.value.set('pl');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(part(fixture, 'value').textContent?.trim()).toBe('Poland');
      expect(
        fixture.nativeElement.querySelector('[data-pct-part="clear"]'),
      ).toBeNull();
    });

    it('is out of the tab order, because the platform’s own clear is', async () => {
      const fixture = await render(ClearHost);
      expect(cross(fixture)?.getAttribute('tabindex')).toBe('-1');
      // A `<button>`, so a virtual cursor still reaches it — the tab order is the only thing
      // it is kept out of.
      expect(cross(fixture)?.tagName).toBe('BUTTON');
      expect(cross(fixture)?.getAttribute('type')).toBe('button');
    });

    it('a press writes the empty value and leaves the panel alone', async () => {
      const fixture = await render(ClearHost);
      await pressCross(fixture);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(panel()).toBeNull();
      // Gone with the answer it was offering to take back.
      expect(cross(fixture)).toBeNull();
      expect(part(fixture, 'placeholder')?.textContent?.trim()).toBe('Select…');
    });

    it('the empty value is the consumer’s, not `null`', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.emptyValue.set('');
      fixture.detectChanges();
      await fixture.whenStable();

      await pressCross(fixture);
      expect(fixture.componentInstance.value()).toBe('');
    });

    it('an open panel stays open, and stays on the row it was on', async () => {
      const fixture = await render(ClearHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).not.toBeNull();

      await pressCross(fixture);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(panel()).not.toBeNull();
      // The panel opened on the answer; taking the answer back does not move the cursor.
      expect(optionsInPanel()[0].getAttribute('data-pct-active')).toBe('');
    });

    it('refuses the default of the press, so focus never leaves the trigger', async () => {
      const fixture = await render(ClearHost);
      const down = await pressCross(fixture);
      expect(down.defaultPrevented).toBe(true);
    });

    it('a value no option names draws no cross — the trigger shows nothing to take back', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.value.set('xx');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        fixture.nativeElement.querySelector('[data-pct-part="value"]'),
      ).toBeNull();
      expect(cross(fixture)).toBeNull();
    });

    it('a control nobody may change draws none either', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.ro.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(cross(fixture)).toBeNull();

      fixture.componentInstance.ro.set(false);
      fixture.componentInstance.disabled.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(cross(fixture)).toBeNull();
    });

    it('Escape over a shut panel takes the answer back and spends the key', async () => {
      const fixture = await render(ClearHost);
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      triggerOf(fixture).dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBeNull();
      expect(event.defaultPrevented).toBe(true);
    });

    it('and it is Escape that does it, not any key that reaches a shut trigger', async () => {
      const fixture = await render(ClearHost);
      // A letter over a shut panel is typeahead's, and typeahead needs a list to walk: it
      // does nothing here. What it must not do is take the answer back.
      await press(fixture, 'a');

      expect(fixture.componentInstance.value()).toBe('pl');
      expect(panel()).toBeNull();
    });

    it('…and with nothing to take back it leaves the key to whatever stands around it', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await fixture.whenStable();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      triggerOf(fixture).dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      // A dialog this select stands inside is the reason: a key spent here is a dialog that
      // stops closing.
      expect(event.defaultPrevented).toBe(false);
    });

    it('a select nobody made clearable answers Escape with nothing at all', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.clearable.set(false);
      fixture.detectChanges();
      await fixture.whenStable();

      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      triggerOf(fixture).dispatchEvent(event);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe('pl');
      expect(event.defaultPrevented).toBe(false);
    });

    it('over an open filtering panel it takes the QUESTION and leaves the answer', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.filterable.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      await type(fixture, 'ger');
      expect(optionsInPanel().map((o) => o.textContent?.trim())).toEqual([
        'Germany',
      ]);

      await pressCross(fixture);

      expect(fixture.componentInstance.query()).toBe('');
      expect(fixture.componentInstance.value()).toBe('pl');
      expect(panel()).not.toBeNull();
      expect(optionsInPanel().length).toBe(4);
      // The list widened underneath it, so the walk starts again from the top.
      expect(optionsInPanel()[0].getAttribute('data-pct-active')).toBe('');
    });

    it('…and with the question gone there is nothing left for it to take', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.filterable.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      await type(fixture, 'ger');
      expect(cross(fixture)).not.toBeNull();

      await pressCross(fixture);

      // The panel is up and the trigger holds no text: an answer stands behind it as the
      // placeholder, and a placeholder is nobody's value.
      expect(cross(fixture)).toBeNull();
      expect(
        (triggerOf(fixture) as unknown as HTMLInputElement).placeholder,
      ).toBe('Poland');
    });

    it('a shut filtering trigger clears the answer, as the button one does', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.filterable.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(cross(fixture)).not.toBeNull();
      await pressCross(fixture);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(panel()).toBeNull();
    });

    it('a press on the cross is not a click outside the panel', async () => {
      const fixture = await render(ClearHost);
      fixture.componentInstance.filterable.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      await type(fixture, 'ger');
      expect(panel()).not.toBeNull();

      // What the CDK really listens to: a click on the document, read against the overlay's
      // origin. The origin is the box, and the cross stands inside it.
      cross(fixture)?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(panel()).not.toBeNull();
    });

    it('the space the cross needs is reserved by the input alone', async () => {
      const fixture = await render(ClearHost);
      const host = fixture.nativeElement.querySelector('pct-select');
      expect(host.hasAttribute('data-pct-clearable')).toBe(true);

      // Not "there is a cross standing": the value goes, the attribute stays, and the words
      // on the trigger do not move.
      fixture.componentInstance.value.set(null);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(cross(fixture)).toBeNull();
      expect(host.hasAttribute('data-pct-clearable')).toBe(true);

      fixture.componentInstance.clearable.set(false);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(host.hasAttribute('data-pct-clearable')).toBe(false);
    });

    it('a form reset is the same two things plus the panel', async () => {
      const fixture = await render(ClearHost);
      const select = fixture.debugElement.children[0].componentInstance;
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(panel()).not.toBeNull();

      select.reset();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBeNull();
      expect(panel()).toBeNull();
    });
  });

  /**
   * A list that arrives after the control does. What is measured here is a fact about the
   * LIST — the panel says the list is coming instead of concluding that there is nothing, and
   * it says so to the reader as well — and the one thing a late list moves without anybody
   * touching a key: the cursor
   * ([0037](../../../../docs/decisions/0037-loading-is-a-fact-about-the-list.md)).
   */
  describe('a list that is still coming (loading)', () => {
    @Component({
      imports: [PctSelect],
      template: `<pct-select
        label="Country"
        [options]="options()"
        [loading]="loading()"
        [filterable]="filterable()"
        [filterWith]="filterWith()"
        [(value)]="value"
        [(filterText)]="query"
      />`,
    })
    class AsyncHost {
      options = signal<readonly PctSelectItem[]>([]);
      loading = signal(true);
      filterable = signal(false);
      filterWith = signal<PctSelectFilter>(pctFilterByLabel);
      value = signal<string | null>(null);
      query = signal('');
    }

    const live = (): string | null =>
      document.querySelector('[data-pct-live="polite"]')?.textContent ?? null;

    const settle = async (f: ComponentFixture<unknown>) => {
      f.detectChanges();
      await f.whenStable();
    };

    const openAsync = async (): Promise<ComponentFixture<AsyncHost>> => {
      const fixture = await render(AsyncHost);
      triggerOf(fixture).click();
      await settle(fixture);
      return fixture;
    };

    /** The same options again — another instance of each, as a second fetch brings them. */
    const arrive = (labels: readonly [string, string][]): PctSelectOption[] =>
      labels.map(([value, label]) => ({ value, label }));

    const COUNTRIES: readonly [string, string][] = [
      ['pl', 'Poland'],
      ['de', 'Germany'],
      ['sk', 'Slovakia'],
    ];

    const activeLabel = (): string | undefined =>
      optionsInPanel()
        .find((o) => o.hasAttribute('data-pct-active'))
        ?.textContent?.trim();

    it('an empty panel says the list is coming, and only then that there is none', async () => {
      const fixture = await openAsync();

      expect(part(document, 'empty').textContent?.trim()).toBe('Loading…');

      // The two sentences it replaces are CONCLUSIONS, and one is reached the moment the
      // request is over — with the panel never closing.
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      expect(part(document, 'empty').textContent?.trim()).toBe('No options');
    });

    it('a question nobody has answered yet is not a question with no answer', async () => {
      const fixture = await render(AsyncHost);
      fixture.componentInstance.filterable.set(true);
      await settle(fixture);

      const input = triggerOf(fixture) as unknown as HTMLInputElement;
      input.value = 'pol';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);

      // "No matches" here would be a sentence about a server that has not spoken yet, and
      // the user's next act — deleting the letters — is decided by it.
      expect(part(document, 'empty').textContent?.trim()).toBe('Loading…');
    });

    it('the listbox says it is busy, and stops saying it', async () => {
      const fixture = await openAsync();

      expect(part(document, 'list').getAttribute('aria-busy')).toBe('true');

      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      // `aria-busy="false"` is the default value: written out it would stand in the tree of
      // every panel on the page and say nothing.
      expect(part(document, 'list').hasAttribute('aria-busy')).toBe(false);
    });

    it('the rows already on the screen are marked, not taken away', async () => {
      const fixture = await render(AsyncHost);
      fixture.componentInstance.loading.set(false);
      fixture.componentInstance.options.set(arrive(COUNTRIES));
      await settle(fixture);
      triggerOf(fixture).click();
      await settle(fixture);

      // A second question is on its way and the answer to the first is on the screen. Taking
      // it away would empty the panel under a user who is reading it — `aria-busy` is the
      // whole of what a stale reading needs.
      fixture.componentInstance.loading.set(true);
      await settle(fixture);

      expect(optionsInPanel().map((o) => o.textContent?.trim())).toEqual([
        'Poland',
        'Germany',
        'Slovakia',
      ]);
      expect(document.querySelector('[data-pct-part="empty"]')).toBeNull();
    });

    it('a list arriving takes nothing away — not the focus, not the panel', async () => {
      const fixture = await render(AsyncHost);
      const trigger = triggerOf(fixture);
      trigger.focus();
      trigger.click();
      await settle(fixture);

      fixture.componentInstance.loading.set(true);
      fixture.componentInstance.options.set(arrive(COUNTRIES));
      await settle(fixture);

      // The difference from `pctButton`'s input of the same name, in one case: there the
      // loading IS the control's action in flight, here the control works and its list is
      // late. A disabled element drops focus on `body`, which is the end of the key map.
      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(document.activeElement).toBe(trigger);
      expect(panel()).not.toBeNull();
    });

    it('the reader is told, and what was said is taken back', async () => {
      const fixture = await openAsync();

      expect(live()).toBe('Loading…');

      // The list arrives and the request ends in one pass. The channel is SHARED, so a
      // sentence left standing on it is not merely stale: the next control to say the same
      // thing is deduplicated into silence. A retraction that names the sentences it knows
      // about cannot serve three of them — the third one is exactly what it does not name.
      fixture.componentInstance.options.set(arrive(COUNTRIES));
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      expect(live()).toBe('');
    });

    it('a sentence that replaces another is announced in its place', async () => {
      const fixture = await openAsync();
      expect(live()).toBe('Loading…');

      // One conclusion IS reached the moment the request is over, with the panel never
      // closing — which is the second thing the old retraction could not have known about.
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      expect(live()).toBe('No options');
    });

    it('the list arriving puts the cursor on its first row', async () => {
      const fixture = await openAsync();
      const trigger = triggerOf(fixture);

      // An open panel over a list nobody could stand in: there is no active option, so the
      // trigger names none.
      expect(trigger.hasAttribute('aria-activedescendant')).toBe(false);

      fixture.componentInstance.options.set(arrive(COUNTRIES));
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      expect(activeLabel()).toBe('Poland');
      // And the reader is pointed at it: what ends "Loading…" is the list itself being read.
      expect(
        document.getElementById(
          trigger.getAttribute('aria-activedescendant') ?? '',
        ),
      ).toBe(optionsInPanel()[0]);
    });

    it('a list fetched again keeps the cursor on the option it was standing on', async () => {
      const fixture = await openAsync();
      fixture.componentInstance.options.set(arrive(COUNTRIES));
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      await press(fixture, 'ArrowDown');
      expect(activeLabel()).toBe('Germany');

      // Another instance of the same options, one more in front: the same fetch, answered
      // twice. An index kept as a number would now be naming Poland.
      fixture.componentInstance.options.set(
        arrive([['at', 'Austria'], ...COUNTRIES]),
      );
      await settle(fixture);

      expect(activeLabel()).toBe('Germany');
    });

    it('a shorter list never leaves the trigger naming an option that is gone', async () => {
      const fixture = await openAsync();
      fixture.componentInstance.options.set(arrive(COUNTRIES));
      fixture.componentInstance.loading.set(false);
      await settle(fixture);

      await press(fixture, 'ArrowDown');
      await press(fixture, 'ArrowDown');
      expect(activeLabel()).toBe('Slovakia');

      // The server's second answer holds one row, and it is not the row the cursor stood on.
      fixture.componentInstance.options.set(arrive([['at', 'Austria']]));
      await settle(fixture);

      const named = triggerOf(fixture).getAttribute('aria-activedescendant');
      expect(document.getElementById(named ?? '')).toBe(optionsInPanel()[0]);
      expect(activeLabel()).toBe('Austria');
    });

    it('a list narrowed by somebody else is not narrowed again', async () => {
      const fixture = await render(AsyncHost);
      const host = fixture.componentInstance;
      host.filterable.set(true);
      host.loading.set(false);
      // What a server answered "nyc" with: the label does not contain the letters, because
      // the matching was somebody else's — a code, an old name, a misspelling.
      host.options.set(arrive([['us-ny', 'New York']]));
      await settle(fixture);

      const input = triggerOf(fixture) as unknown as HTMLInputElement;
      input.value = 'nyc';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await settle(fixture);

      // The default predicate takes the row back out — in a library that never said it would.
      expect(optionsInPanel()).toHaveLength(0);

      host.filterWith.set(pctKeepAll);
      await settle(fixture);

      expect(optionsInPanel().map((o) => o.textContent?.trim())).toEqual([
        'New York',
      ]);
    });
  });

  describe('a window over a list nobody scrolls to the end of (virtual)', () => {
    /**
     * A thousand rows — twenty-five times the probe window, which is what these cases need to
     * be about. The honest number is **five thousand** and it is measured where it means
     * something: in a browser, on the sandbox card and in `select.spec.ts` of the e2e suite.
     * Here it is one thousand for a reason worth writing down rather than tuning away: a case
     * that really builds every row takes seconds under coverage instrumentation and **twenty
     * of them** under the mutation runner's, where it times out and takes the whole gate with
     * it. The list a test builds is part of the test's cost.
     */
    const MANY: readonly PctSelectOption[] = Array.from(
      { length: 1000 },
      (_, i) => ({ value: `r${i}`, label: `Row ${i}` }),
    );

    @Component({
      imports: [PctSelect],
      template: `<pct-select
        [options]="options()"
        [virtual]="virtual()"
        [(value)]="value"
      />`,
    })
    class ManyHost {
      options = signal<readonly PctSelectItem[]>(MANY);
      virtual = signal(true);
      value = signal<string | null>(null);
    }

    /**
     * jsdom has no layout — every `offsetHeight` and every `clientHeight` is 0 — so the panel
     * measures nothing and draws its probe window. That is the state the count promise is
     * measured in, and it is deliberate: a gate whose numbers came out of a guessed layout
     * would be measuring the guess.
     *
     * The cases about the ARITHMETIC declare the layout instead, on the prototype and for the
     * length of one case, because the three numbers the window runs on are read from the DOM
     * and there is no other way to give a DOM without layout a height.
     */
    const withLayout = (row: number, viewport: number, heading = 0) => {
      const proto = HTMLElement.prototype;
      const offset = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
      const client = Object.getOwnPropertyDescriptor(proto, 'clientHeight');
      const rect = proto.getBoundingClientRect;
      Object.defineProperty(proto, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
          const part = this.getAttribute('data-pct-part');
          if (part === 'option') return row;
          if (part === 'group-label') return heading;
          return 0;
        },
      });
      // The arithmetic reads a rect and not `offsetHeight`, because `offsetHeight` is an
      // integer and a row is 35.59 px (`lesson-108`).
      proto.getBoundingClientRect = function (this: HTMLElement) {
        const part = this.getAttribute('data-pct-part');
        const height =
          part === 'option' ? row : part === 'group-label' ? heading : 0;
        return {
          height,
          width: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      };
      Object.defineProperty(proto, 'clientHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return this.getAttribute('data-pct-part') === 'list' ? viewport : 0;
        },
      });
      return () => {
        if (offset) Object.defineProperty(proto, 'offsetHeight', offset);
        if (client) Object.defineProperty(proto, 'clientHeight', client);
        proto.getBoundingClientRect = rect;
      };
    };

    const scrollTo = async (
      fixture: ComponentFixture<unknown>,
      top: number,
    ) => {
      const element = list() as HTMLElement & { scrollTop: number };
      element.scrollTop = top;
      element.dispatchEvent(new Event('scroll'));
      fixture.detectChanges();
      await fixture.whenStable();
    };

    const lead = (element: HTMLElement | null) =>
      element?.style.getPropertyValue('--_pct-select-lead') ?? '';
    const tail = (element: HTMLElement | null) =>
      element?.style.getPropertyValue('--_pct-select-tail') ?? '';

    it('a list drawn whole puts every row in the DOM', async () => {
      const fixture = await render(ManyHost);
      fixture.componentInstance.virtual.set(false);
      fixture.detectChanges();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(optionsInPanel()).toHaveLength(1000);
      expect(list()?.getAttribute('data-pct-virtual')).toBeNull();
    });

    it('a window draws forty of them, and the list is still a thousand long', async () => {
      const fixture = await render(ManyHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      const rows = optionsInPanel();
      expect(rows).toHaveLength(40);
      expect(rows[0].textContent?.trim()).toBe('Row 0');
      expect(list()?.getAttribute('data-pct-virtual')).toBe('');

      // The pair a window owes the reader, and the one no audit asks for: the length the DOM
      // no longer carries, and where in it this row stands.
      expect(rows[0].getAttribute('aria-setsize')).toBe('1000');
      expect(rows[0].getAttribute('aria-posinset')).toBe('1');
      expect(rows[39].getAttribute('aria-posinset')).toBe('40');
    });

    it('a list drawn whole says neither, because the DOM holds the set', async () => {
      const fixture = await render(ManyHost);
      fixture.componentInstance.virtual.set(false);
      fixture.detectChanges();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      const row = optionsInPanel()[0];
      expect(row.getAttribute('aria-setsize')).toBeNull();
      expect(row.getAttribute('aria-posinset')).toBeNull();
    });

    it('the row the cursor names is drawn, wherever in the list it stands', async () => {
      const fixture = await render(ManyHost);
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      await press(fixture, 'End');

      // `aria-activedescendant` names an ELEMENT, so the window has to hold the cursor: a
      // name pointing at a row that was not drawn is a name pointing at nothing.
      const named = triggerOf(fixture).getAttribute('aria-activedescendant');
      expect(named).toBeTruthy();
      expect(document.getElementById(named as string)).not.toBeNull();
      expect(optionsInPanel()).toHaveLength(40);
      const drawn = optionsInPanel();
      expect(drawn[drawn.length - 1].textContent?.trim()).toBe('Row 999');
    });

    it('a value far down the list opens the panel on its own row', async () => {
      const fixture = await render(ManyHost);
      fixture.componentInstance.value.set('r840');
      fixture.detectChanges();
      triggerOf(fixture).click();
      fixture.detectChanges();
      await fixture.whenStable();

      const labels = optionsInPanel().map((row) => row.textContent?.trim());
      expect(labels).toContain('Row 840');
      expect(labels).not.toContain('Row 0');
    });

    it('the space the rows nobody drew would have taken is on the panel', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        // The measurement lands on the render that follows the one it read.
        await scrollTo(fixture, 0);

        const rows = optionsInPanel();
        // Rows 0..6 fill the 240 px on the screen, four more are drawn past the bottom edge,
        // and the top edge has nothing to overscan into.
        expect(rows).toHaveLength(11);
        expect(lead(list())).toBe('0px');
        // Everything below the window: 1000 rows of 36 px, less the eleven drawn.
        expect(tail(list())).toBe(`${(1000 - 11) * 36}px`);
      } finally {
        restore();
      }
    });

    it('a cursor put past the window scrolls the panel to it by arithmetic', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 0);

        await press(fixture, 'End');

        // The row `End` lands on was not in the DOM, so there was nothing to scroll into
        // view: the panel is moved by the geometry, and the window follows the scrollbar it
        // moved. The other way round is a deadlock — the row waits for the scroll and the
        // scroll waits for the row.
        expect((list() as HTMLElement).scrollTop).toBe(1000 * 36 - 240);
        const drawn = optionsInPanel();
        expect(drawn[drawn.length - 1].textContent?.trim()).toBe('Row 999');
        expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
          drawn[drawn.length - 1].id,
        );
      } finally {
        restore();
      }
    });

    it('a scroll away from the cursor leaves the trigger naming nobody', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 0);
        expect(
          triggerOf(fixture).getAttribute('aria-activedescendant'),
        ).not.toBeNull();

        // A drag of the scrollbar moves no cursor, so the two come apart. A name pointing at
        // a row nobody drew is a reference to nothing, and the attribute is optional.
        await scrollTo(fixture, 36 * 500);
        expect(
          triggerOf(fixture).getAttribute('aria-activedescendant'),
        ).toBeNull();

        // The next arrow press brings them back together.
        await press(fixture, 'ArrowDown');
        const named = triggerOf(fixture).getAttribute('aria-activedescendant');
        expect(named).not.toBeNull();
        expect(document.getElementById(named as string)).not.toBeNull();
      } finally {
        restore();
      }
    });

    it('a heading keeps its own id, and its group carries the rows it skipped', async () => {
      const restore = withLayout(36, 240, 24);
      try {
        const fixture = await render(ManyHost);
        // Two headings of a hundred rows each, and a window that starts inside the second.
        fixture.componentInstance.options.set([
          { label: 'First', options: MANY.slice(0, 100) },
          { label: 'Second', options: MANY.slice(100, 200) },
        ]);
        fixture.detectChanges();
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 24 + 100 * 36 + 24 + 10 * 36);

        const groups = groupsInPanel();
        expect(groups).toHaveLength(1);
        // The id names the section it belongs to and not its position in the window: the
        // first group was not drawn at all, and this one is still the second.
        expect(groups[0].getAttribute('aria-labelledby')).toBe(
          list()?.querySelector('[data-pct-part="group-label"]')?.id,
        );
        expect(
          list()?.querySelector('[data-pct-part="group-label"]')?.textContent,
        ).toContain('Second');

        // Its own skipped rows are the group's, and everything above the heading is the
        // panel's — a nameless section would have had nowhere to put either.
        expect(lead(groups[0])).toBe(`${6 * 36}px`);
        expect(lead(list())).toBe(`${24 + 100 * 36}px`);
      } finally {
        restore();
      }
    });

    it('two row heights are reported and not repaired', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const proto = HTMLElement.prototype;
      const offset = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
      Object.defineProperty(proto, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
          if (this.getAttribute('data-pct-part') !== 'option') return 0;
          return this.textContent?.trim() === 'Row 3' ? 72 : 36;
        },
      });
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();

        expect(warn).toHaveBeenCalled();
        expect(warn.mock.calls[0][0]).toContain('rows of two heights');
        expect(warn.mock.calls[0][0]).toContain('36px');
        // Reported, and the list is untouched — which of the two heights is right is the
        // application's question.
        expect(optionsInPanel().length).toBeGreaterThan(0);
      } finally {
        if (offset) Object.defineProperty(proto, 'offsetHeight', offset);
        warn.mockRestore();
      }
    });

    it('a row already on the screen is not scrolled to', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 36 * 10);

        // The window starts four rows above the fold, so the seventh row drawn is row 12 —
        // whole inside the 240 px on the screen, which leaves the panel nothing to do.
        // `block: 'nearest'` written out, and the half of it that is "do nothing".
        expect(optionsInPanel()[6].textContent?.trim()).toBe('Row 12');
        optionsInPanel()[6].dispatchEvent(
          new MouseEvent('mouseenter', { bubbles: true }),
        );
        fixture.detectChanges();
        await fixture.whenStable();

        expect((list() as HTMLElement).scrollTop).toBe(360);
      } finally {
        restore();
      }
    });

    it('a row just past the bottom edge scrolls the panel by exactly its overhang', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 0);

        // Rows 0..5 are whole on the screen and row 6 is cut by the bottom edge. Walking onto
        // row 7 moves the panel by what hangs over it and by nothing more: 7×36 + 36 − 240.
        for (let i = 0; i < 7; i++) await press(fixture, 'ArrowDown');

        expect((list() as HTMLElement).scrollTop).toBe(7 * 36 + 36 - 240);
      } finally {
        restore();
      }
    });

    it('a panel drawn whole scrolls its row into view instead', async () => {
      const into = vi.fn();
      const proto = HTMLElement.prototype as unknown as {
        scrollIntoView?: (options?: unknown) => void;
      };
      const had = Object.prototype.hasOwnProperty.call(proto, 'scrollIntoView');
      const before = proto.scrollIntoView;
      proto.scrollIntoView = into;
      try {
        const fixture = await render(ManyHost);
        fixture.componentInstance.virtual.set(false);
        fixture.componentInstance.options.set(OPTIONS);
        fixture.detectChanges();
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await press(fixture, 'ArrowDown');

        // No window, so there is no arithmetic to scroll by: the row is found by its ID among
        // the ones drawn and asked to bring itself into view. It is the id and not the
        // position, which is what the window broke and what this pins.
        expect(into).toHaveBeenCalled();
        expect(into.mock.instances[into.mock.instances.length - 1]).toBe(
          optionsInPanel()[1],
        );
        expect(into.mock.calls[into.mock.calls.length - 1][0]).toStrictEqual({
          block: 'nearest',
        });
      } finally {
        if (had) proto.scrollIntoView = before;
        else delete proto.scrollIntoView;
      }
    });

    it('a windowed panel with nothing in it draws the sentence and measures nothing', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        fixture.componentInstance.options.set([]);
        fixture.detectChanges();
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();

        // There is no row to read a height from, so the measurement has to survive having
        // nothing to measure — and the panel is the ordinary empty one: the sentence beside
        // an empty list (0069).
        expect(optionsInPanel()).toHaveLength(0);
        expect(
          panel()
            ?.querySelector('[data-pct-part="empty"]')
            ?.textContent?.trim(),
        ).toBe('No options');
        expect(lead(list())).toBe('0px');
        expect(tail(list())).toBe('0px');
      } finally {
        restore();
      }
    });

    it('a heading is counted in where its rows begin', async () => {
      const restore = withLayout(36, 240, 24);
      try {
        const fixture = await render(ManyHost);
        fixture.componentInstance.options.set([
          { label: 'First', options: MANY.slice(0, 100) },
          { label: 'Second', options: MANY.slice(100, 200) },
        ]);
        fixture.detectChanges();
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 0);

        await press(fixture, 'End');

        // The last row of the second section, and the arithmetic that finds it has to count
        // both headings and the whole of the first section: 24 + 100×36 + 24 + 99×36, plus the
        // row itself, less the panel.
        const last = 24 + 100 * 36 + 24 + 99 * 36;
        expect((list() as HTMLElement).scrollTop).toBe(last + 36 - 240);
      } finally {
        restore();
      }
    });

    it('rows of one height are not reported, and an uneven list is only reported where a window reads it', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      const proto = HTMLElement.prototype;
      const offset = Object.getOwnPropertyDescriptor(proto, 'offsetHeight');
      let uneven = false;
      Object.defineProperty(proto, 'offsetHeight', {
        configurable: true,
        get(this: HTMLElement) {
          if (this.getAttribute('data-pct-part') !== 'option') return 0;
          return uneven && this.textContent?.trim() === 'Row 3' ? 72 : 36;
        },
      });
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(warn).not.toHaveBeenCalled();

        // The same uneven list drawn whole says nothing: the height only matters to a window,
        // because a window is arithmetic over it.
        uneven = true;
        fixture.componentInstance.virtual.set(false);
        fixture.detectChanges();
        await fixture.whenStable();
        expect(warn).not.toHaveBeenCalled();
      } finally {
        if (offset) Object.defineProperty(proto, 'offsetHeight', offset);
        warn.mockRestore();
      }
    });

    it('a hair of difference in the measurement is not a measurement', async () => {
      const proto = HTMLElement.prototype;
      const rect = proto.getBoundingClientRect;
      const client = Object.getOwnPropertyDescriptor(proto, 'clientHeight');
      let row = 36;
      Object.defineProperty(proto, 'clientHeight', {
        configurable: true,
        get(this: HTMLElement) {
          return this.getAttribute('data-pct-part') === 'list' ? 240 : 0;
        },
      });
      proto.getBoundingClientRect = function (this: HTMLElement) {
        const height =
          this.getAttribute('data-pct-part') === 'option' ? row : 0;
        return {
          height,
          width: 0,
          top: 0,
          left: 0,
          right: 0,
          bottom: height,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        } as DOMRect;
      };
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 0);
        expect(tail(list())).toBe(`${(1000 - 11) * 36}px`);

        // Firefox reports a row as two values a fifteen-millionth of a pixel apart and
        // alternates between them, because each reading writes the spacer that decides where
        // the next row is laid out. Below a sixty-fourth of a pixel the two are one reading —
        // without that, the panel never settles (`lesson-111`).
        row = 36 + 1 / 128;
        await scrollTo(fixture, 0);
        expect(tail(list())).toBe(`${(1000 - 11) * 36}px`);

        // A row that really changed height — a type size, not a rounding — is a new reading.
        row = 40;
        await scrollTo(fixture, 0);
        expect(tail(list())).not.toBe(`${(1000 - 11) * 36}px`);
      } finally {
        proto.getBoundingClientRect = rect;
        if (client) Object.defineProperty(proto, 'clientHeight', client);
      }
    });

    it('a scroll moves the window and the two spacers still add up to the list', async () => {
      const restore = withLayout(36, 240);
      try {
        const fixture = await render(ManyHost);
        triggerOf(fixture).click();
        fixture.detectChanges();
        await fixture.whenStable();
        await scrollTo(fixture, 36 * 100);

        const rows = optionsInPanel();
        expect(rows[0].textContent?.trim()).toBe('Row 96');
        expect(rows[rows.length - 1].textContent?.trim()).toBe('Row 110');

        const drawn = rows.length * 36;
        const above = Number.parseInt(lead(list()), 10);
        const below = Number.parseInt(tail(list()), 10);
        expect(above).toBe(96 * 36);
        expect(above + drawn + below).toBe(1000 * 36);
      } finally {
        restore();
      }
    });
  });

  describe('the arrow a consumer replaces (req-api-icons)', () => {
    @Component({
      selector: 'pct-probe-arrows',
      imports: [PctIconTemplate],
      template: `<ng-template pctIcon="chevron-down"
        ><i data-testid="own-arrow">v</i></ng-template
      >`,
    })
    class Arrows {}

    const arrow = (f: ComponentFixture<unknown>) =>
      f.nativeElement.querySelector('[data-pct-part="arrow"]') as HTMLElement;

    it('the built-in arrow is the content of the icon that names it', async () => {
      const fixture = await render(Host);
      expect(arrow(fixture).tagName).toBe('PCT-ICON');
      expect(arrow(fixture).getAttribute('aria-hidden')).toBe('true');
      expect(arrow(fixture).firstElementChild?.tagName).toBe('svg');
    });

    it('a provided set draws it instead, in the same place', async () => {
      TestBed.configureTestingModule({ providers: providePctIcons(Arrows) });
      const fixture = await render(Host);

      // The part, the class the sheet turns on opening and the element the flex layout
      // measures are all the same element as before — only its content changed.
      expect(arrow(fixture).tagName).toBe('PCT-ICON');
      expect(
        arrow(fixture).firstElementChild?.getAttribute('data-testid'),
      ).toBe('own-arrow');
      expect(arrow(fixture).querySelector('svg')).toBeNull();
    });
  });
});
