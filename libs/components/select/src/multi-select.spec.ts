import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField } from '@angular/forms/signals';
import { providePctTexts } from '@pacit/components/core';
import { PctMultiSelect } from './multi-select';
import { PctSelect } from './select';
import { PctSelectOptionTemplate } from './select.template';
import { PctSelectItem, PctSelectOption } from './select.types';

const OPTIONS: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Poland' },
  { value: 'de', label: 'Germany' },
  { value: 'cz', label: 'Czechia', disabled: true },
  { value: 'sk', label: 'Slovakia' },
];

/** The same shape the single-choice control is measured with: a loose option, then headings. */
const GROUPED: readonly PctSelectItem[] = [
  { value: 'any', label: 'Anywhere' },
  {
    label: 'Europe',
    options: [
      { value: 'pl', label: 'Poland' },
      { value: 'de', label: 'Germany' },
    ],
  },
  {
    label: 'Asia',
    options: [{ value: 'jp', label: 'Japan' }],
    disabled: true,
  },
];

const triggerOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="trigger"]',
  ) as HTMLButtonElement;

const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const optionsInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="option"]'),
  ) as HTMLElement[];

const checksInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="option-check"]'),
  ) as HTMLElement[];

const valueText = (f: ComponentFixture<unknown>) =>
  f.nativeElement
    .querySelector('[data-pct-part="value"]')
    ?.textContent?.trim() ?? null;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

async function open<T>(fixture: ComponentFixture<T>): Promise<void> {
  triggerOf(fixture).click();
  await settle(fixture);
}

async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
): Promise<void> {
  triggerOf(fixture).dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true }),
  );
  await settle(fixture);
}

async function clickRow(
  fixture: ComponentFixture<unknown>,
  index: number,
): Promise<void> {
  optionsInPanel()[index].click();
  await settle(fixture);
}

@Component({
  imports: [PctMultiSelect],
  template: `<pct-multi-select
    label="Countries"
    [options]="options()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [(value)]="value"
  />`,
})
class Host {
  options = signal<readonly PctSelectItem[]>(OPTIONS);
  disabled = signal(false);
  ro = signal(false);
  value = signal<string[]>([]);
}

/** An entity: over HTTP a different instance of the same identity arrives. */
interface City {
  readonly id: number;
  readonly name: string;
}

@Component({
  imports: [PctMultiSelect],
  template: `<pct-multi-select
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
  value = signal<City[]>([{ id: 2, name: 'Paris' }]);
  byId = (a: City, b: City) => a.id === b.id;
}

@Component({
  imports: [PctMultiSelect, FormField],
  template: `<pct-multi-select [options]="options" [formField]="f.tags" />`,
})
class SignalFormHost {
  options = OPTIONS;
  model = signal<{ tags: string[] }>({ tags: ['de'] });
  f = form(this.model);
}

@Component({
  imports: [PctMultiSelect, PctSelectOptionTemplate],
  template: `<pct-multi-select [options]="options" [(value)]="value">
    <ng-template [pctSelectOption]="options" let-option let-selected="selected">
      <span data-testid="row">{{ option.label }}:{{ selected }}</span>
    </ng-template>
  </pct-multi-select>`,
})
class TemplateHost {
  readonly options = OPTIONS;
  value = signal<string[]>(['de']);
}

describe('PctMultiSelect', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('with not one binding it is an empty, working control', async () => {
    // An input's default is a contract as much as the input is: a test that always passes
    // the value measures its own binding and never the default. `[]` is what "nothing
    // chosen" is here, and it is the reason there is no `emptyValue` to declare.
    @Component({
      imports: [PctMultiSelect],
      template: `<pct-multi-select [options]="options" />`,
    })
    class Bare {
      readonly options = OPTIONS;
    }

    const fixture = await render(Bare);
    expect(valueText(fixture)).toBeNull();

    await open(fixture);
    expect(
      optionsInPanel().map((o) => o.getAttribute('aria-selected')),
    ).toEqual(['false', 'false', 'false', 'false']);
    expect(checksInPanel()).toHaveLength(0);
  });

  it('an unbound control picks into an EMPTY list, not into whatever it started with', async () => {
    // The half the case above cannot see: a default holding a value no option carries draws
    // nothing — no label, no mark, no `aria-selected` — and shows only in the array the first
    // pick produces, because a value the list cannot name is kept rather than dropped. Read
    // through the output alone, so the input keeps its default.
    @Component({
      imports: [PctMultiSelect],
      template: `<pct-multi-select
        [options]="options"
        (valueChange)="last = $event"
      />`,
    })
    class Unbound {
      readonly options = OPTIONS;
      last: string[] | null = null;
    }

    const fixture = await render(Unbound);
    await open(fixture);
    await clickRow(fixture, 1);

    expect(fixture.componentInstance.last).toEqual(['de']);
  });

  it('the ids name the control they belong to', async () => {
    // The prefix comes through `super()` rather than from a field, because a subclass's
    // initialisers run after the base's — and an id in the tree that says `pct-select` on a
    // many-choice control is a debugging trail leading to the wrong file.
    const fixture = await render(Host);
    expect(triggerOf(fixture).id).toMatch(/^pct-multi-select-\d+-trigger$/);

    await open(fixture);
    expect(panel()?.id).toMatch(/^pct-multi-select-\d+-listbox$/);
    expect(optionsInPanel()[0].id).toMatch(/^pct-multi-select-\d+-option-0$/);
  });

  it('says it takes many answers, where the single-choice control says nothing', async () => {
    const fixture = await render(Host);
    await open(fixture);

    expect(panel()?.getAttribute('role')).toBe('listbox');
    expect(panel()?.getAttribute('aria-multiselectable')).toBe('true');
  });

  it('adds a choice and LEAVES THE PANEL OPEN', async () => {
    const fixture = await render(Host);
    await open(fixture);
    await clickRow(fixture, 0);

    expect(fixture.componentInstance.value()).toEqual(['pl']);
    expect(panel()).not.toBeNull();
    expect(triggerOf(fixture).getAttribute('aria-expanded')).toBe('true');

    // …so a second choice takes no second journey.
    await clickRow(fixture, 1);
    expect(fixture.componentInstance.value()).toEqual(['pl', 'de']);
    expect(panel()).not.toBeNull();
  });

  it('a second press on a chosen row takes it away', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['pl', 'de']);
    await settle(fixture);
    await open(fixture);
    await clickRow(fixture, 0);

    expect(fixture.componentInstance.value()).toEqual(['de']);
    expect(optionsInPanel()[0].getAttribute('aria-selected')).toBe('false');
  });

  it('marks every chosen row, and marks it twice: in the tree and on the screen', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['pl', 'sk']);
    await settle(fixture);
    await open(fixture);

    expect(
      optionsInPanel().map((o) => o.getAttribute('aria-selected')),
    ).toEqual(['true', 'false', 'false', 'true']);
    expect(
      optionsInPanel().map((o) => o.hasAttribute('data-pct-selected')),
    ).toEqual([true, false, false, true]);

    // The glyph is drawn where it is true and nowhere else — the surface alone would have
    // been three states in two backgrounds.
    expect(checksInPanel()).toHaveLength(2);
    expect(
      optionsInPanel().map(
        (o) => o.querySelector('[data-pct-part="option-check"]') !== null,
      ),
    ).toEqual([true, false, false, true]);
    // Said once to a reader: the row carries `aria-selected`, the glyph carries nothing.
    expect(checksInPanel()[0].getAttribute('aria-hidden')).toBe('true');
  });

  it('a single-choice list draws no mark, though it is the same template', async () => {
    @Component({
      imports: [PctSelect],
      template: `<pct-select [options]="options" [value]="'pl'" />`,
    })
    class One {
      readonly options = OPTIONS;
    }

    const fixture = await render(One);
    await open(fixture);

    expect(optionsInPanel()[0].getAttribute('aria-selected')).toBe('true');
    expect(checksInPanel()).toHaveLength(0);
    expect(panel()?.getAttribute('aria-multiselectable')).toBeNull();
  });

  it('gives the value back in the LIST order, whatever order the picking took', async () => {
    const fixture = await render(Host);
    await open(fixture);
    await clickRow(fixture, 3);
    await clickRow(fixture, 0);
    await clickRow(fixture, 1);

    // Picked sk, pl, de — the value is the set, written the way the list reads.
    expect(fixture.componentInstance.value()).toEqual(['pl', 'de', 'sk']);
  });

  it('keeps a value no option carries, and keeps it ahead of the ones the list can order', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['xx', 'sk']);
    await settle(fixture);
    await open(fixture);
    await clickRow(fixture, 0);

    // `xx` is the application's data, not a defect to repair: it survives a pick.
    expect(fixture.componentInstance.value()).toEqual(['xx', 'pl', 'sk']);
    // …and it names no row, because the list cannot name it.
    expect(
      optionsInPanel().map((o) => o.getAttribute('aria-selected')),
    ).toEqual(['true', 'false', 'false', 'true']);
  });

  it('the trigger reads the chosen labels, in the list order, through PCT_TEXTS', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['sk', 'pl']);
    await settle(fixture);

    expect(valueText(fixture)).toBe('Poland, Slovakia');
  });

  it('the separator is a string, so it is translated with the rest', async () => {
    TestBed.configureTestingModule({
      providers: [providePctTexts({ selectSeparator: ' · ' })],
    });
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['pl', 'de']);
    await settle(fixture);

    expect(valueText(fixture)).toBe('Poland · Germany');
  });

  it('with nothing chosen the trigger shows the placeholder', async () => {
    const fixture = await render(Host);

    expect(valueText(fixture)).toBeNull();
    expect(
      fixture.nativeElement
        .querySelector('[data-pct-part="placeholder"]')
        ?.textContent?.trim(),
    ).toBe('Select…');
  });

  it('Enter toggles the active row and the panel stays open; Escape shuts it', async () => {
    const fixture = await render(Host);
    await press(fixture, 'ArrowDown');
    await press(fixture, 'Enter');

    expect(fixture.componentInstance.value()).toEqual(['pl']);
    expect(panel()).not.toBeNull();

    await press(fixture, 'ArrowDown');
    await press(fixture, ' ');
    expect(fixture.componentInstance.value()).toEqual(['pl', 'de']);
    expect(panel()).not.toBeNull();

    await press(fixture, 'Escape');
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.value()).toEqual(['pl', 'de']);
  });

  it('a second press on the trigger shuts the panel, though a pick does not', async () => {
    const fixture = await render(Host);
    await open(fixture);
    await clickRow(fixture, 0);
    expect(panel()).not.toBeNull();

    triggerOf(fixture).click();
    await settle(fixture);
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.value()).toEqual(['pl']);
  });

  it('opens the walk on the FIRST chosen row', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(['sk', 'de']);
    await settle(fixture);
    await open(fixture);

    expect(triggerOf(fixture).getAttribute('aria-activedescendant')).toBe(
      optionsInPanel()[1].id,
    );
  });

  it('a disabled option and a disabled group take no answer', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.options.set(GROUPED);
    await settle(fixture);
    await open(fixture);

    // Index 3 is Japan, inside the disabled Asia group; index 0 is the loose option.
    await clickRow(fixture, 3);
    expect(fixture.componentInstance.value()).toEqual([]);

    await clickRow(fixture, 0);
    expect(fixture.componentInstance.value()).toEqual(['any']);
  });

  it('a disabled or readonly control answers nothing at all', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    await settle(fixture);

    triggerOf(fixture).click();
    await settle(fixture);
    expect(panel()).toBeNull();
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it('a heading is drawn the same way, and the marks land inside it', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.options.set(GROUPED);
    fixture.componentInstance.value.set(['pl']);
    await settle(fixture);
    await open(fixture);

    const groups = Array.from(
      document.querySelectorAll('[data-pct-part="group"]'),
    ) as HTMLElement[];
    expect(groups).toHaveLength(2);
    expect(
      groups[0].querySelector('[data-pct-part="option-check"]'),
    ).not.toBeNull();
    // The walk crosses the headings here as it does there: four rows, numbered across.
    expect(optionsInPanel()).toHaveLength(4);
  });

  it('compares by key, so an instance from the server is a chosen row', async () => {
    const fixture = await render(EntityHost);
    await open(fixture);

    expect(
      optionsInPanel().map((o) => o.getAttribute('aria-selected')),
    ).toEqual(['false', 'true']);

    // And taking it away removes it by key rather than by reference — nothing stays behind.
    await clickRow(fixture, 1);
    expect(fixture.componentInstance.value()).toEqual([]);
  });

  it('hands the row template the state of THAT row', async () => {
    const fixture = await render(TemplateHost);
    await open(fixture);

    const rows = Array.from(
      document.querySelectorAll('[data-testid="row"]'),
    ).map((r) => r.textContent?.trim());
    expect(rows).toEqual([
      'Poland:false',
      'Germany:true',
      'Czechia:false',
      'Slovakia:false',
    ]);
  });

  it('is a signal-forms control whose field is a list', async () => {
    const fixture = await render(SignalFormHost);
    const host = fixture.componentInstance;

    expect(valueText(fixture)).toBe('Germany');

    await open(fixture);
    await clickRow(fixture, 0);
    expect(host.model().tags).toEqual(['pl', 'de']);

    // A reset empties the list — `[]` is what "nothing chosen" is for every `T`, so there is
    // no `emptyValue` to declare.
    host.f().reset();
    await settle(fixture);
    expect(host.model().tags).toEqual([]);
    expect(valueText(fixture)).toBeNull();
  });

  it('the two controls declare the same inputs, but for the value and its empty', async () => {
    // The two classes are one implementation with two value channels, and the inputs are
    // declared once — on the base. This is what says so after a build: an input added to one
    // and forgotten on the other is a difference in these two sets, and nothing else in the
    // repository would report it.
    await render(Host);
    const inputsOf = (type: unknown) =>
      new Set(
        Object.keys(
          (type as { ɵcmp: { inputs: Record<string, unknown> } }).ɵcmp.inputs,
        ),
      );

    const one = inputsOf(PctSelect);
    const many = inputsOf(PctMultiSelect);

    expect([...one].filter((name) => !many.has(name))).toEqual(['emptyValue']);
    expect([...many].filter((name) => !one.has(name))).toEqual([]);
    expect(one.has('value') && many.has('value')).toBe(true);
  });
});
