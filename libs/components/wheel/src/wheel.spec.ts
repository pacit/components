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
import type { PctCompareWith, PctSize } from '@pacit/components/core';
import { PctField } from '@pacit/components/field';
import { allParts, part } from '../../testing/src/dom';
import { PctWheel, PctWheelOption } from './wheel';

const DAYS: readonly PctWheelOption[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' },
  { value: 'sat', label: 'Saturday' },
  { value: 'sun', label: 'Sunday' },
];

/** The height the layout stub gives every row, in pixels. */
const ROW = 32;

async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

const listOf = (fixture: ComponentFixture<unknown>) => part(fixture, 'list');
const rowsOf = (fixture: ComponentFixture<unknown>) =>
  allParts(fixture, 'option');
const hostOf = (fixture: ComponentFixture<unknown>) =>
  (fixture.nativeElement as HTMLElement).querySelector(
    'pct-wheel',
  ) as HTMLElement;

/** Presses a key on the listbox; the event comes back so a case can read `defaultPrevented`. */
function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  listOf(fixture).dispatchEvent(event);
  return event;
}

/** A scroll that came to rest at `top`, as the engine reports it. */
function rest(fixture: ComponentFixture<unknown>, top: number): void {
  const list = listOf(fixture);
  list.scrollTop = top;
  list.dispatchEvent(new Event('scrollend'));
}

/** The start of a gesture over the rows — a pointer going down, or a wheel turning. */
function touchRows(
  fixture: ComponentFixture<unknown>,
  type: 'pointerdown' | 'wheel' = 'pointerdown',
): void {
  listOf(fixture).dispatchEvent(new Event(type));
}

interface ScrollCall {
  readonly top: number;
  readonly behavior: ScrollBehavior;
}

/**
 * jsdom lays nothing out: a row has no height, `scrollTop` stays `0` and `scrollTo` is not
 * there, so the wheel's scroll code finds a wheel that is not on the screen and stands still.
 * This gives it a screen — every element `ROW` high, a `scrollTop` that keeps what is written
 * and a `scrollTo` that moves it at once — and takes it back.
 */
function layout(): { calls: ScrollCall[]; restore: () => void } {
  const calls: ScrollCall[] = [];
  const tops = new WeakMap<Element, number>();
  const kept = {
    offsetHeight: Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'offsetHeight',
    ),
    scrollTop: Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollTop',
    ),
    scrollTo: Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollTo',
    ),
  };
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => ROW,
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
    configurable: true,
    get(this: Element) {
      return tops.get(this) ?? 0;
    },
    set(this: Element, top: number) {
      tops.set(this, top);
    },
  });
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    writable: true,
    value(this: Element, options: ScrollToOptions) {
      calls.push({
        top: options.top as number,
        behavior: options.behavior as ScrollBehavior,
      });
      tops.set(this, options.top as number);
    },
  });
  const put = (
    target: object,
    name: 'offsetHeight' | 'scrollTop' | 'scrollTo',
  ): void => {
    const descriptor = kept[name];
    if (descriptor) Object.defineProperty(target, name, descriptor);
    else delete (target as Record<string, unknown>)[name];
  };
  return {
    calls,
    restore: () => {
      put(HTMLElement.prototype, 'offsetHeight');
      put(HTMLElement.prototype, 'scrollTop');
      put(HTMLElement.prototype, 'scrollTo');
    },
  };
}

@Component({
  imports: [PctWheel],
  template: `<pct-wheel
    [options]="options()"
    [label]="label()"
    [hint]="hint()"
    [ariaLabel]="ariaLabel()"
    [ariaLabelledby]="ariaLabelledby()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [warnings]="warnings()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [wrap]="wrap()"
    [rows]="rows()"
    [size]="size()"
    [startAt]="startAt()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  options = signal<readonly PctWheelOption[]>(DAYS);
  label = signal('Weekday');
  hint = signal('');
  ariaLabel = signal('');
  ariaLabelledby = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  warnings = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  wrap = signal(false);
  rows = signal<unknown>(5);
  size = signal<PctSize>('md');
  startAt = signal<string | null>(null);
  value = signal<string | null>(null);
  touchCount = 0;
}

@Component({
  imports: [PctWheel],
  template: `<pct-wheel [options]="options" />`,
})
class BareHost {
  options = DAYS;
}

/** One input written and nothing else — what is left is the default of every other. */
@Component({
  imports: [PctWheel],
  template: `<pct-wheel class="only-invalid" [options]="options" invalid />
    <pct-wheel class="only-touched" [options]="options" touched />
    <pct-wheel class="no-options" />`,
})
class OneInputHost {
  options = DAYS;
}

@Component({
  imports: [PctWheel, FormField],
  template: `<pct-wheel
    label="Weekday"
    [options]="options"
    [formField]="f.day"
  />`,
})
class SignalFormHost {
  options = DAYS;
  model = signal<{ day: string | null }>({ day: null });
  f = form(this.model, (p) => {
    required(p.day, { message: 'Pick a day' });
  });
}

@Component({
  imports: [PctWheel, ReactiveFormsModule],
  template: `<pct-wheel
    ariaLabel="Weekday"
    [options]="options"
    [formControl]="ctrl"
  />`,
})
class ReactiveHost {
  options = DAYS;
  ctrl = new FormControl<string | null>('wed');
}

@Component({
  imports: [PctWheel, FormsModule],
  template: `<pct-wheel
    ariaLabel="Weekday"
    name="day"
    [options]="options"
    [(ngModel)]="day"
  />`,
})
class NgModelHost {
  options = DAYS;
  day: string | null = 'wed';
}

@Component({
  imports: [PctField, PctWheel],
  template: `<pct-field [label]="fieldLabel()" hint="Any day">
    <pct-wheel
      label="Its own"
      hint="Its own hint"
      ariaLabelledby="page-heading"
      [options]="options"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [warnings]="warnings()"
      [(value)]="value"
    />
  </pct-field>`,
})
class FieldHost {
  options = DAYS;
  fieldLabel = signal('Weekday');
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  warnings = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  value = signal<string | null>('wed');
}

interface Speed {
  readonly id: number;
  readonly name: string;
}

@Component({
  imports: [PctWheel],
  template: `<pct-wheel
    ariaLabel="Speed"
    [options]="options"
    [compareWith]="same"
    [startAt]="start()"
    [(value)]="value"
  />`,
})
class EntityHost {
  options: readonly PctWheelOption<Speed>[] = [
    { value: { id: 1, name: 'Slow' }, label: 'Slow' },
    { value: { id: 2, name: 'Fast' }, label: 'Fast' },
  ];
  asked = 0;
  same: PctCompareWith<Speed> = (a, b) => {
    this.asked++;
    return a?.id === b?.id;
  };
  start = signal<Speed | null>(null);
  // Another object than the option's own — equal by key alone.
  value = signal<Speed | null>({ id: 2, name: 'Fast, read from a server' });
}

describe('PctWheel', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('the listbox', () => {
    it('is one tab stop of role listbox, its rows options in the order given', async () => {
      const fixture = await render(Host);
      const list = listOf(fixture);

      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('tabindex')).toBe('0');
      expect(list.id).toMatch(/^pct-wheel-\d+-list$/);
      expect(rowsOf(fixture).map((row) => row.textContent?.trim())).toEqual(
        DAYS.map((day) => day.label),
      );
      for (const row of rowsOf(fixture)) {
        expect(row.getAttribute('role')).toBe('option');
        expect(row.hasAttribute('tabindex')).toBe(false);
        expect(row.parentElement).toBe(list);
      }
    });

    it('the band is drawn after the list, hidden from a reader', async () => {
      const fixture = await render(Host);
      const band = part(fixture, 'band');

      expect(band.getAttribute('aria-hidden')).toBe('true');
      expect(band.previousElementSibling).toBe(listOf(fixture));
      expect(band.parentElement).toBe(part(fixture, 'view'));
    });

    it('with no value the line holds the first row — active, and not chosen', async () => {
      const fixture = await render(Host);
      const rows = rowsOf(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[0].id,
      );
      expect(rows[0].id).toMatch(/^pct-wheel-\d+-option-0$/);
      expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(
        DAYS.map(() => 'false'),
      );
      expect(rows.map((row) => row.hasAttribute('data-pct-active'))).toEqual([
        true,
        false,
        false,
        false,
        false,
        false,
        false,
      ]);
      expect(rows.some((row) => row.hasAttribute('data-pct-chosen'))).toBe(
        false,
      );
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('the value names its row: selected, chosen, and the one the listbox points at', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set('thu');
      await settle(fixture);
      const rows = rowsOf(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[3].id,
      );
      expect(rows[3].id).toMatch(/-option-3$/);
      expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'false',
        'true',
        'false',
        'false',
        'false',
      ]);
      expect(rows[3].getAttribute('data-pct-chosen')).toBe('');
      expect(rows[3].getAttribute('data-pct-active')).toBe('');
      expect(rows[0].hasAttribute('data-pct-active')).toBe(false);
      expect(rows[0].hasAttribute('data-pct-chosen')).toBe(false);
    });

    it('a value no row stands for chooses none, and the line holds the first row', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set('someday');
      await settle(fixture);
      const rows = rowsOf(fixture);

      expect(rows.some((row) => row.hasAttribute('data-pct-chosen'))).toBe(
        false,
      );
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[0].id,
      );
    });

    it('with no value the line holds the row `startAt` names — active, not chosen, nothing written', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.startAt.set('thu');
      await settle(fixture);
      const rows = rowsOf(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[3].id,
      );
      expect(rows.map((row) => row.hasAttribute('data-pct-active'))).toEqual([
        false,
        false,
        false,
        true,
        false,
        false,
        false,
      ]);
      expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual(
        DAYS.map(() => 'false'),
      );
      expect(rows.some((row) => row.hasAttribute('data-pct-chosen'))).toBe(
        false,
      );
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('the row `startAt` names is where a key starts from, and Enter takes it as it stands', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.startAt.set('thu');
      await settle(fixture);

      press(fixture, 'ArrowDown');
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe('fri');

      fixture.componentInstance.value.set(null);
      await settle(fixture);
      expect(press(fixture, 'Enter').defaultPrevented).toBe(true);
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe('thu');
    });

    it('a value that names a row wins over `startAt`, and one that names none leaves it the line', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.startAt.set('thu');
      fixture.componentInstance.value.set('tue');
      await settle(fixture);
      const rows = rowsOf(fixture);
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[1].id,
      );
      expect(rows[3].hasAttribute('data-pct-active')).toBe(false);

      fixture.componentInstance.value.set('someday');
      await settle(fixture);
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[3].id,
      );
      expect(rows.some((row) => row.hasAttribute('data-pct-chosen'))).toBe(
        false,
      );
    });

    it('a `startAt` no row stands for leaves the line on the first row that can be chosen', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday', disabled: true },
        { value: 'tue', label: 'Tuesday' },
        { value: 'wed', label: 'Wednesday' },
      ]);
      fixture.componentInstance.startAt.set('someday');
      await settle(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[1].id,
      );
    });

    it('a `startAt` row that cannot be chosen hands the line to the nearest that can — the one after first', async () => {
      const fixture = await render(Host);
      const days = (...off: string[]): PctWheelOption[] =>
        DAYS.map((day) => ({ ...day, disabled: off.includes(day.value) }));
      fixture.componentInstance.startAt.set('thu');

      fixture.componentInstance.options.set(days('thu'));
      await settle(fixture);
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[4].id,
      );

      fixture.componentInstance.options.set(days('thu', 'fri'));
      await settle(fixture);
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[2].id,
      );

      // No row at all to hand it to: the listbox points at nothing.
      fixture.componentInstance.options.set(
        days(...DAYS.map((day) => day.value)),
      );
      await settle(fixture);
      expect(listOf(fixture).hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('entities are found for `startAt` by `compareWith`', async () => {
      const fixture = TestBed.createComponent(EntityHost);
      fixture.componentInstance.value.set(null);
      fixture.componentInstance.start.set({ id: 2, name: 'Another object' });
      await settle(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[1].id,
      );
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it.each([null, undefined])(
      'a `startAt` of %s is compared with no row',
      async (empty) => {
        const fixture = TestBed.createComponent(EntityHost);
        fixture.componentInstance.value.set(null);
        fixture.componentInstance.start.set(empty as null);
        await settle(fixture);

        expect(fixture.componentInstance.asked).toBe(0);
        expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
          rowsOf(fixture)[0].id,
        );
      },
    );

    it('a `startAt` no row stands for leaves a ring on its first row as well, not on its last', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.wrap.set(true);
      fixture.componentInstance.startAt.set('someday');
      await settle(fixture);

      const id = listOf(fixture).getAttribute('aria-activedescendant');
      expect(
        rowsOf(fixture)
          .find((row) => row.id === id)
          ?.textContent?.trim(),
      ).toBe('Monday');
    });

    it('a row that cannot be chosen says so, and the line starts on the first that can', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday', disabled: true },
        { value: 'tue', label: 'Tuesday' },
        { value: 'wed', label: 'Wednesday', disabled: false },
      ]);
      await settle(fixture);
      const rows = rowsOf(fixture);

      expect(rows.map((row) => row.getAttribute('aria-disabled'))).toEqual([
        'true',
        null,
        null,
      ]);
      expect(rows.map((row) => row.getAttribute('data-pct-disabled'))).toEqual([
        '',
        null,
        null,
      ]);
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[1].id,
      );
      expect(rows[1].hasAttribute('data-pct-active')).toBe(true);
    });

    it('a chosen row that has since been disabled still holds the line', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday' },
        { value: 'tue', label: 'Tuesday', disabled: true },
      ]);
      fixture.componentInstance.value.set('tue');
      await settle(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[1].id,
      );
    });

    it('points at nothing when there is no row to point at', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([]);
      await settle(fixture);
      expect(listOf(fixture).hasAttribute('aria-activedescendant')).toBe(false);

      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday', disabled: true },
      ]);
      await settle(fixture);
      expect(listOf(fixture).hasAttribute('aria-activedescendant')).toBe(false);
      expect(rowsOf(fixture)[0].hasAttribute('data-pct-active')).toBe(false);
    });

    it('entities are compared by `compareWith`', async () => {
      const fixture = await render(EntityHost);
      const rows = rowsOf(fixture);

      expect(rows.map((row) => row.getAttribute('aria-selected'))).toEqual([
        'false',
        'true',
      ]);

      press(fixture, 'ArrowUp');
      await settle(fixture);
      expect(fixture.componentInstance.value()).toBe(
        fixture.componentInstance.options[0].value,
      );
    });

    it.each([null, undefined])(
      'a value of %s is compared with no row',
      async (empty) => {
        const fixture = await render(EntityHost);
        const host = fixture.componentInstance;
        host.asked = 0;

        host.value.set(empty as null);
        await settle(fixture);

        expect(host.asked).toBe(0);
        expect(
          rowsOf(fixture).map((row) => row.getAttribute('aria-selected')),
        ).toEqual(['false', 'false']);
      },
    );

    it('the row already chosen keeps the object the application gave', async () => {
      const fixture = await render(EntityHost);
      const given = fixture.componentInstance.value();

      press(fixture, 'Enter');
      rowsOf(fixture)[1].click();

      expect(fixture.componentInstance.value()).toBe(given);
    });
  });

  describe('the defaults, which the other host here binds over', () => {
    it('a bare wheel is a list of five rows, enabled, unnamed, of the size the config gives', async () => {
      const fixture = await render(BareHost);
      const host = hostOf(fixture);
      const list = listOf(fixture);

      expect(host.classList.contains('pct-wheel')).toBe(true);
      expect(host.getAttribute('data-pct-size')).toBe('md');
      expect(host.style.getPropertyValue('--_pct-wheel-rows')).toBe('5');
      for (const state of [
        'data-pct-invalid',
        'data-pct-warning',
        'data-pct-disabled',
        'data-pct-readonly',
        'data-pct-in-field',
      ])
        expect(host.hasAttribute(state)).toBe(false);

      expect(list.getAttribute('tabindex')).toBe('0');
      for (const attribute of [
        'name',
        'aria-label',
        'aria-labelledby',
        'aria-describedby',
        'aria-invalid',
        'aria-required',
        'aria-readonly',
        'aria-disabled',
      ])
        expect(list.hasAttribute(attribute)).toBe(false);

      // A list and no ring: every row once, none of them a copy.
      expect(rowsOf(fixture).length).toBe(DAYS.length);
      expect(
        rowsOf(fixture).some((row) => row.hasAttribute('aria-hidden')),
      ).toBe(false);
      expect(
        (fixture.nativeElement as HTMLElement).querySelectorAll(
          '[data-pct-part="label"], [data-pct-part="hint"], [data-pct-part="error"], [data-pct-part="warning"]',
        ).length,
      ).toBe(0);

      // And it stops at its ends.
      press(fixture, 'ArrowUp');
      await settle(fixture);
      expect(list.getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[0].id,
      );
    });

    it('invalid without touched, and touched without invalid, light nothing', async () => {
      const fixture = await render(OneInputHost);
      const root = fixture.nativeElement as HTMLElement;

      for (const wheel of ['.only-invalid', '.only-touched']) {
        const host = root.querySelector(wheel) as HTMLElement;
        expect(host.hasAttribute('data-pct-invalid')).toBe(false);
        expect(
          host.querySelector('[role="listbox"]')?.hasAttribute('aria-invalid'),
        ).toBe(false);
      }
    });

    it('a wheel given no options draws no row and points at none', async () => {
      const fixture = await render(OneInputHost);
      const host = (fixture.nativeElement as HTMLElement).querySelector(
        '.no-options',
      ) as HTMLElement;

      expect(host.querySelectorAll('[role="option"]').length).toBe(0);
      expect(
        host
          .querySelector('[role="listbox"]')
          ?.hasAttribute('aria-activedescendant'),
      ).toBe(false);
    });
  });

  describe('the name and the message line', () => {
    it('its own label names the listbox, and the required sign is not read', async () => {
      const fixture = await render(Host);
      const label = part(fixture, 'label');

      expect(label.textContent?.trim()).toBe('Weekday');
      expect(label.id).toMatch(/^pct-wheel-\d+-label$/);
      expect(listOf(fixture).getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.querySelector('.pct-wheel__required')).toBeNull();

      fixture.componentInstance.req.set(true);
      await settle(fixture);
      const sign = part(fixture, 'label').querySelector(
        '.pct-wheel__required',
      ) as HTMLElement;
      expect(sign.textContent).toBe('*');
      expect(sign.getAttribute('aria-hidden')).toBe('true');
      expect(listOf(fixture).getAttribute('aria-required')).toBe('true');
    });

    it('without a label the page names it: `ariaLabelledby`, or `ariaLabel`', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.label.set('');
      host.ariaLabelledby.set('heading');
      await settle(fixture);

      expect(allParts(fixture, 'label').length).toBe(0);
      expect(listOf(fixture).getAttribute('aria-labelledby')).toBe('heading');

      // Its own label comes before the page's.
      host.label.set('Weekday');
      await settle(fixture);
      expect(listOf(fixture).getAttribute('aria-labelledby')).toBe(
        part(fixture, 'label').id,
      );

      host.label.set('');
      host.ariaLabelledby.set('');
      host.ariaLabel.set('Day of the week');
      await settle(fixture);
      expect(listOf(fixture).hasAttribute('aria-labelledby')).toBe(false);
      expect(listOf(fixture).getAttribute('aria-label')).toBe(
        'Day of the week',
      );
    });

    it('the hint describes the listbox', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.hint.set('The week starts on Monday');
      await settle(fixture);
      const hint = part(fixture, 'hint');

      expect(hint.textContent?.trim()).toBe('The week starts on Monday');
      expect(hint.id).toMatch(/^pct-wheel-\d+-hint$/);
      expect(listOf(fixture).getAttribute('aria-describedby')).toBe(hint.id);
    });

    it('the error takes the line once the wheel is touched, and only then', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.hint.set('The week starts on Monday');
      host.invalid.set(true);
      host.errors.set([requiredError({ message: 'Pick a day' })]);
      await settle(fixture);

      expect(allParts(fixture, 'error').length).toBe(0);
      expect(listOf(fixture).hasAttribute('aria-invalid')).toBe(false);
      expect(hostOf(fixture).hasAttribute('data-pct-invalid')).toBe(false);
      expect(allParts(fixture, 'hint').length).toBe(1);

      host.touched.set(true);
      await settle(fixture);
      const error = part(fixture, 'error');

      expect(error.textContent?.trim()).toBe('Pick a day');
      expect(error.getAttribute('role')).toBe('alert');
      expect(error.id).toMatch(/^pct-wheel-\d+-error$/);
      expect(listOf(fixture).getAttribute('aria-describedby')).toBe(error.id);
      expect(listOf(fixture).getAttribute('aria-invalid')).toBe('true');
      expect(hostOf(fixture).getAttribute('data-pct-invalid')).toBe('');
      expect(allParts(fixture, 'hint').length).toBe(0);
    });

    it('a warning takes the line after the error and before the hint, without the invalid face', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.hint.set('The week starts on Monday');
      host.warnings.set([requiredError({ message: 'A day off' })]);
      await settle(fixture);

      // Untouched: the hint alone.
      expect(allParts(fixture, 'warning').length).toBe(0);
      expect(hostOf(fixture).hasAttribute('data-pct-warning')).toBe(false);

      host.touched.set(true);
      await settle(fixture);
      const warning = part(fixture, 'warning');

      expect(warning.getAttribute('role')).toBe('status');
      expect(warning.id).toMatch(/^pct-wheel-\d+-warning$/);
      expect(warning.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Warning: A day off',
      );
      expect(warning.querySelector('.pct-wheel__sr')?.textContent).toBe(
        'Warning:',
      );
      expect(warning.querySelector('pct-icon')).not.toBeNull();
      expect(listOf(fixture).getAttribute('aria-describedby')).toBe(warning.id);
      expect(listOf(fixture).hasAttribute('aria-invalid')).toBe(false);
      expect(hostOf(fixture).getAttribute('data-pct-warning')).toBe('');
      expect(allParts(fixture, 'hint').length).toBe(0);

      // The error outranks it.
      host.invalid.set(true);
      host.errors.set([requiredError({ message: 'Pick a day' })]);
      await settle(fixture);
      expect(allParts(fixture, 'warning').length).toBe(0);
      expect(part(fixture, 'error').textContent?.trim()).toBe('Pick a day');
      expect(hostOf(fixture).hasAttribute('data-pct-warning')).toBe(false);
    });

    it('describes itself by nothing when there is nothing to say', async () => {
      const fixture = await render(Host);
      expect(listOf(fixture).hasAttribute('aria-describedby')).toBe(false);
    });
  });

  describe('the states', () => {
    it('disabled: out of the tab order, said to a reader, and no key or click writes', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.disabled.set(true);
      await settle(fixture);

      expect(listOf(fixture).getAttribute('tabindex')).toBe('-1');
      expect(listOf(fixture).getAttribute('aria-disabled')).toBe('true');
      expect(hostOf(fixture).getAttribute('data-pct-disabled')).toBe('');

      const event = press(fixture, 'ArrowDown');
      rowsOf(fixture)[2].click();
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('readonly: still a tab stop, said to a reader, and no key or click writes', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ro.set(true);
      await settle(fixture);

      expect(listOf(fixture).getAttribute('tabindex')).toBe('0');
      expect(listOf(fixture).getAttribute('aria-readonly')).toBe('true');
      expect(listOf(fixture).hasAttribute('aria-disabled')).toBe(false);
      expect(hostOf(fixture).getAttribute('data-pct-readonly')).toBe('');

      const event = press(fixture, 'ArrowDown');
      rowsOf(fixture)[2].click();
      await settle(fixture);

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('the size is on the host', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.size.set('sm');
      await settle(fixture);
      expect(hostOf(fixture).getAttribute('data-pct-size')).toBe('sm');
    });

    it.each([
      [5, '5'],
      [7, '7'],
      [1, '1'],
      // The line is the middle row: an even count takes the next odd one.
      [4, '5'],
      [2, '3'],
      [2.9, '3'],
      [3.9, '3'],
      ['9', '9'],
      // No count at all falls back to five.
      [0, '5'],
      [0.9, '5'],
      [-3, '5'],
      ['many', '5'],
      [null, '5'],
    ])('rows %o shows %s', async (given, shown) => {
      const fixture = await render(Host);
      fixture.componentInstance.rows.set(given);
      await settle(fixture);
      expect(hostOf(fixture).style.getPropertyValue('--_pct-wheel-rows')).toBe(
        shown,
      );
    });

    it('leaving the wheel emits `touch`', async () => {
      const fixture = await render(Host);
      expect(fixture.componentInstance.touchCount).toBe(0);

      listOf(fixture).dispatchEvent(new Event('blur'));
      expect(fixture.componentInstance.touchCount).toBe(1);
    });

    it('`focus()` focuses the listbox, with the options it is given', async () => {
      const fixture = await render(Host);
      const wheel = fixture.debugElement.children[0]
        .componentInstance as PctWheel;
      const list = listOf(fixture);
      const seen: (FocusOptions | undefined)[] = [];
      const focus = list.focus.bind(list);
      list.focus = (options?: FocusOptions) => {
        seen.push(options);
        focus(options);
      };

      wheel.focus({ preventScroll: true });

      expect(document.activeElement).toBe(list);
      expect(seen).toEqual([{ preventScroll: true }]);
      expect(wheel.controlId).toBe(list.id);
      expect(wheel.labelStrategy).toBe('labelledby');
      expect(wheel.fieldAppearance).toBe('bare');
    });
  });

  describe('the keys', () => {
    it('an arrow moves the line by a row, and the row becomes the value', async () => {
      const fixture = await render(Host);

      const down = press(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe('tue');
      expect(down.defaultPrevented).toBe(true);

      await settle(fixture);
      press(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe('wed');

      await settle(fixture);
      const up = press(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe('tue');
      expect(up.defaultPrevented).toBe(true);
    });

    it('a list stops at its ends — and the key is still the wheel’s', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set('sun');
      await settle(fixture);

      const down = press(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe('sun');
      expect(down.defaultPrevented).toBe(true);

      fixture.componentInstance.value.set('mon');
      await settle(fixture);
      press(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe('mon');
    });

    it('a ring comes round at its ends, and stops being one when `wrap` is taken away', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.wrap.set(true);
      host.value.set('sun');
      await settle(fixture);

      press(fixture, 'ArrowDown');
      expect(host.value()).toBe('mon');
      await settle(fixture);
      press(fixture, 'ArrowUp');
      expect(host.value()).toBe('sun');

      host.wrap.set(false);
      await settle(fixture);
      press(fixture, 'ArrowDown');
      expect(host.value()).toBe('sun');
    });

    it('PageDown and PageUp move by the rows shown', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;

      press(fixture, 'PageDown');
      expect(host.value()).toBe('sat');
      await settle(fixture);
      press(fixture, 'PageUp');
      expect(host.value()).toBe('mon');

      host.rows.set(3);
      await settle(fixture);
      const down = press(fixture, 'PageDown');
      expect(host.value()).toBe('thu');
      expect(down.defaultPrevented).toBe(true);
      await settle(fixture);
      press(fixture, 'PageDown');
      expect(host.value()).toBe('sun');
      await settle(fixture);
      // Three rows back and not the first one: PageUp is not Home.
      press(fixture, 'PageUp');
      expect(host.value()).toBe('thu');
      await settle(fixture);
      press(fixture, 'PageUp');
      expect(host.value()).toBe('mon');
    });

    it('Home and End go to the first and the last row that can be chosen', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.options.set([
        { value: 'mon', label: 'Monday', disabled: true },
        { value: 'tue', label: 'Tuesday' },
        { value: 'wed', label: 'Wednesday' },
        { value: 'thu', label: 'Thursday' },
        { value: 'fri', label: 'Friday', disabled: true },
      ]);
      host.value.set('wed');
      await settle(fixture);

      const end = press(fixture, 'End');
      expect(host.value()).toBe('thu');
      expect(end.defaultPrevented).toBe(true);
      await settle(fixture);
      const home = press(fixture, 'Home');
      expect(host.value()).toBe('tue');
      expect(home.defaultPrevented).toBe(true);
    });

    it('a row that cannot be chosen is passed over', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.options.set([
        { value: 'mon', label: 'Monday' },
        { value: 'tue', label: 'Tuesday', disabled: true },
        { value: 'wed', label: 'Wednesday' },
      ]);
      await settle(fixture);

      press(fixture, 'ArrowDown');
      expect(host.value()).toBe('wed');
      await settle(fixture);
      press(fixture, 'ArrowUp');
      expect(host.value()).toBe('mon');
    });

    it.each(['Enter', ' '])(
      '"%s" takes the row under the line — what chooses the first row of a wheel with no value',
      async (key) => {
        const fixture = await render(Host);

        const event = press(fixture, key);

        expect(fixture.componentInstance.value()).toBe('mon');
        expect(event.defaultPrevented).toBe(true);
      },
    );

    it('a letter goes to the first row that begins with it', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;

      const typed = press(fixture, 'w');
      expect(host.value()).toBe('wed');
      expect(typed.defaultPrevented).toBe(true);
    });

    it('a letter that moves the line nowhere is left to the page', async () => {
      const fixture = await render(Host);
      const host = fixture.componentInstance;
      host.value.set('tue');
      await settle(fixture);

      const miss = press(fixture, 'z');
      expect(host.value()).toBe('tue');
      expect(miss.defaultPrevented).toBe(false);
    });

    it.each([
      ['Tab', {}],
      ['Escape', {}],
      ['F5', {}],
      ['ArrowLeft', {}],
      ['w', { ctrlKey: true }],
      ['w', { metaKey: true }],
      ['w', { altKey: true }],
    ])('"%s" with %o is not the wheel’s key', async (key, init) => {
      const fixture = await render(Host);

      const event = press(fixture, key, init);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(event.defaultPrevented).toBe(false);
    });

    it('a key with a name is no letter, where a row begins with the name too', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([
        { value: 'run', label: 'Run' },
        { value: 'escape', label: 'Escape' },
      ]);
      await settle(fixture);

      const named = press(fixture, 'Escape');

      expect(fixture.componentInstance.value()).toBeNull();
      expect(named.defaultPrevented).toBe(false);
    });

    it('a letter typed with Shift is a letter', async () => {
      const fixture = await render(Host);
      press(fixture, 'F', { shiftKey: true });
      expect(fixture.componentInstance.value()).toBe('fri');
    });

    it('the row already chosen is not written again', async () => {
      const fixture = await render(Host);
      const wheel = fixture.debugElement.children[0]
        .componentInstance as PctWheel;
      let writes = 0;
      wheel.value.subscribe(() => writes++);

      press(fixture, 'ArrowDown');
      expect(writes).toBe(1);
      await settle(fixture);

      press(fixture, 'Enter');
      rowsOf(fixture)[1].click();
      expect(writes).toBe(1);
    });
  });

  describe('a click', () => {
    it('on a row chooses it', async () => {
      const fixture = await render(Host);
      rowsOf(fixture)[4].click();
      expect(fixture.componentInstance.value()).toBe('fri');
    });

    it('on a row that cannot be chosen chooses nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday' },
        { value: 'tue', label: 'Tuesday', disabled: true },
      ]);
      await settle(fixture);

      rowsOf(fixture)[1].click();
      expect(fixture.componentInstance.value()).toBeNull();
    });
  });

  describe('a ring', () => {
    async function ring(value: string | null = 'wed') {
      const fixture = await render(Host);
      fixture.componentInstance.wrap.set(true);
      fixture.componentInstance.value.set(value);
      await settle(fixture);
      return fixture;
    }

    it('draws the rows three times, and only the middle turn is a reader’s', async () => {
      const fixture = await ring();
      const rows = rowsOf(fixture);
      const middle = rows.slice(7, 14);
      const copies = [...rows.slice(0, 7), ...rows.slice(14)];

      expect(rows.length).toBe(21);
      expect(rows.map((row) => row.textContent?.trim())).toEqual(
        [...DAYS, ...DAYS, ...DAYS].map((day) => day.label),
      );

      expect(middle.map((row) => row.id)).toEqual(
        DAYS.map((_, index) => expect.stringMatching(`-option-${index}$`)),
      );
      expect(middle.some((row) => row.hasAttribute('aria-hidden'))).toBe(false);
      expect(middle.map((row) => row.getAttribute('aria-selected'))).toEqual([
        'false',
        'false',
        'true',
        'false',
        'false',
        'false',
        'false',
      ]);

      for (const copy of copies) {
        expect(copy.getAttribute('aria-hidden')).toBe('true');
        expect(copy.hasAttribute('id')).toBe(false);
        expect(copy.hasAttribute('aria-selected')).toBe(false);
        expect(copy.hasAttribute('data-pct-active')).toBe(false);
        expect(copy.hasAttribute('aria-setsize')).toBe(false);
        expect(copy.hasAttribute('aria-posinset')).toBe(false);
      }
    });

    it('the listbox points at the row of the middle turn, and every copy of it is drawn chosen', async () => {
      const fixture = await ring();
      const rows = rowsOf(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rows[9].id,
      );
      expect(
        rows
          .map((row, at) => (row.hasAttribute('data-pct-chosen') ? at : -1))
          .filter((at) => at !== -1),
      ).toEqual([2, 9, 16]);
      expect(
        rows
          .map((row, at) => (row.hasAttribute('data-pct-active') ? at : -1))
          .filter((at) => at !== -1),
      ).toEqual([9]);
    });

    it('a click on a copy is a click on the row it copies', async () => {
      const fixture = await ring();

      rowsOf(fixture)[0].click();
      expect(fixture.componentInstance.value()).toBe('mon');
      await settle(fixture);

      rowsOf(fixture)[20].click();
      expect(fixture.componentInstance.value()).toBe('sun');
    });

    it('a copy of a row that cannot be chosen says so as well', async () => {
      const fixture = await ring(null);
      fixture.componentInstance.options.set([
        { value: 'mon', label: 'Monday' },
        { value: 'tue', label: 'Tuesday', disabled: true },
      ]);
      await settle(fixture);
      const rows = rowsOf(fixture);

      expect(rows.map((row) => row.hasAttribute('data-pct-disabled'))).toEqual([
        false,
        true,
        false,
        true,
        false,
        true,
      ]);
      rows[5].click();
      expect(fixture.componentInstance.value()).toBeNull();
    });
  });

  describe('off the screen', () => {
    it('a wheel with no height does not scroll and a settle writes nothing', async () => {
      // jsdom as it comes: no layout, and no `scrollTo` to call — a call would throw.
      const fixture = await render(Host);
      fixture.componentInstance.value.set('wed');
      await settle(fixture);

      touchRows(fixture);
      listOf(fixture).dispatchEvent(new Event('scrollend'));

      expect(fixture.componentInstance.value()).toBe('wed');
    });
  });

  describe('the scroll', () => {
    let screen: ReturnType<typeof layout>;

    beforeEach(() => {
      screen = layout();
    });
    afterEach(() => {
      screen.restore();
    });

    async function at(
      value: string | null,
      set: (host: Host) => void = () => undefined,
    ) {
      const fixture = TestBed.createComponent(Host);
      fixture.componentInstance.value.set(value);
      set(fixture.componentInstance);
      await settle(fixture);
      return fixture;
    }

    describe('the wheel’s own centring', () => {
      it('opens with the chosen row under the line, placed at once', async () => {
        const fixture = await at('wed');

        expect(screen.calls).toEqual([{ top: 2 * ROW, behavior: 'instant' }]);
        expect(listOf(fixture).scrollTop).toBe(2 * ROW);
      });

      it('with no value the first row is already under the line, and nothing scrolls', async () => {
        await at(null);
        expect(screen.calls).toEqual([]);
      });

      it('with no value and a `startAt` the wheel opens on that row, placed at once', async () => {
        const fixture = await at(null, (host) => host.startAt.set('fri'));

        expect(screen.calls).toEqual([{ top: 4 * ROW, behavior: 'instant' }]);
        expect(fixture.componentInstance.value()).toBeNull();
      });

      it('a ring opens on its middle turn', async () => {
        await at('wed', (host) => host.wrap.set(true));
        expect(screen.calls).toEqual([
          { top: (7 + 2) * ROW, behavior: 'instant' },
        ]);
      });

      it('a ring with no value opens on the first row of its middle turn', async () => {
        await at(null, (host) => host.wrap.set(true));
        expect(screen.calls).toEqual([{ top: 7 * ROW, behavior: 'instant' }]);
      });

      it('a wheel with no row to rest on does not scroll', async () => {
        await at(null, (host) =>
          host.options.set([{ value: 'mon', label: 'Monday', disabled: true }]),
        );
        expect(screen.calls).toEqual([]);
      });

      it('a value the form writes travels to its row, as the motion axis says', async () => {
        const fixture = await at('wed');
        screen.calls.length = 0;

        // No duration on the axis here: the travel is a placement.
        fixture.componentInstance.value.set('fri');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 4 * ROW, behavior: 'instant' }]);

        const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
          getPropertyValue: (name: string) =>
            name === '--pct-motion-transition-duration' ? '150ms' : '',
        } as CSSStyleDeclaration);
        try {
          fixture.componentInstance.value.set('mon');
          await settle(fixture);
          expect(screen.calls[1]).toEqual({ top: 0, behavior: 'smooth' });
          expect(style).toHaveBeenCalledWith(listOf(fixture));
        } finally {
          style.mockRestore();
        }
      });

      it('writes nothing: the settle of its own scroll is not a gesture', async () => {
        const fixture = await at('wed');
        const wheel = fixture.debugElement.children[0]
          .componentInstance as PctWheel;
        let writes = 0;
        wheel.value.subscribe(() => writes++);

        // The engine reports the settle of the opening placement — and of one somewhere else.
        rest(fixture, 2 * ROW);
        rest(fixture, 5 * ROW);

        expect(writes).toBe(0);
        expect(fixture.componentInstance.value()).toBe('wed');
      });

      it('takes the settle from a gesture it interrupts', async () => {
        const fixture = await at('wed');

        // A finger is on the rows when the form writes: the scroll that follows is the wheel's.
        touchRows(fixture);
        fixture.componentInstance.value.set('fri');
        await settle(fixture);
        rest(fixture, 6 * ROW);

        expect(fixture.componentInstance.value()).toBe('fri');
      });

      it('a new list is placed at once, whatever the motion axis says', async () => {
        const fixture = await at('wed');
        screen.calls.length = 0;
        const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
          getPropertyValue: () => '150ms',
        } as unknown as CSSStyleDeclaration);
        try {
          fixture.componentInstance.options.set([
            { value: 'tue', label: 'Tuesday' },
            { value: 'wed', label: 'Wednesday' },
          ]);
          await settle(fixture);
          expect(screen.calls).toEqual([{ top: ROW, behavior: 'instant' }]);

          // And so is a list that becomes a ring.
          fixture.componentInstance.wrap.set(true);
          await settle(fixture);
          expect(screen.calls[1]).toEqual({
            top: (2 + 1) * ROW,
            behavior: 'instant',
          });
        } finally {
          style.mockRestore();
        }
      });

      it('a row already under the line, to within a pixel, is left alone', async () => {
        const fixture = await at('wed');
        screen.calls.length = 0;
        const list = listOf(fixture);

        // A row of a fractional height rests a fraction off: 4 × 32 is asked for, 127.5 held.
        list.scrollTop = 4 * ROW - 0.5;
        fixture.componentInstance.value.set('fri');
        await settle(fixture);
        expect(screen.calls).toEqual([]);

        list.scrollTop = 5 * ROW + 1;
        fixture.componentInstance.value.set('sat');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 5 * ROW, behavior: 'instant' }]);
      });

      it('a ring travels to the nearest copy of the row, not back across the list', async () => {
        const fixture = await at('sun', (host) => host.wrap.set(true));
        screen.calls.length = 0;

        // From Sunday of the middle turn, Monday of the NEXT turn is one row on.
        fixture.componentInstance.value.set('mon');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 14 * ROW, behavior: 'instant' }]);

        // The settle then puts it back on the middle turn, the same row under the line.
        rest(fixture, 14 * ROW);
        expect(listOf(fixture).scrollTop).toBe(7 * ROW);

        // And from Monday, Sunday of the turn BEFORE is one row back.
        screen.calls.length = 0;
        fixture.componentInstance.value.set('sun');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 6 * ROW, behavior: 'instant' }]);
      });

      it('between two copies as near as each other, the middle turn wins', async () => {
        const fixture = await at('mon', (host) => host.wrap.set(true));
        screen.calls.length = 0;
        const list = listOf(fixture);

        // Halfway between Monday of the first turn (0) and Monday of the middle one (7 rows).
        list.scrollTop = 3.5 * ROW;
        fixture.componentInstance.value.set('tue');
        await settle(fixture);
        fixture.componentInstance.value.set('mon');
        list.scrollTop = 3.5 * ROW;
        await settle(fixture);

        expect(screen.calls[screen.calls.length - 1]).toEqual({
          top: 7 * ROW,
          behavior: 'instant',
        });
      });
    });

    describe('a gesture', () => {
      it.each(['pointerdown', 'wheel'] as const)(
        'started by "%s": the row the scroll settles on becomes the value',
        async (type) => {
          const fixture = await at('wed');
          screen.calls.length = 0;

          touchRows(fixture, type);
          rest(fixture, 5 * ROW);

          expect(fixture.componentInstance.value()).toBe('sat');
          // The line is on the row already: nothing is left to centre.
          expect(screen.calls).toEqual([]);
        },
      );

      it('writes once: the next settle is nobody’s', async () => {
        const fixture = await at('wed');

        touchRows(fixture);
        rest(fixture, 5 * ROW);
        rest(fixture, ROW);

        expect(fixture.componentInstance.value()).toBe('sat');
      });

      it('the row under the line is the nearest to where the scroll rests', async () => {
        const fixture = await at('mon');

        touchRows(fixture);
        rest(fixture, 3 * ROW + 15);
        expect(fixture.componentInstance.value()).toBe('thu');
        await settle(fixture);

        touchRows(fixture);
        rest(fixture, 3 * ROW + 16);
        expect(fixture.componentInstance.value()).toBe('fri');
      });

      it('a scroll past either end rests on the row at that end', async () => {
        const fixture = await at('wed');

        touchRows(fixture);
        rest(fixture, -40);
        expect(fixture.componentInstance.value()).toBe('mon');
        await settle(fixture);

        touchRows(fixture);
        rest(fixture, 40 * ROW);
        expect(fixture.componentInstance.value()).toBe('sun');
      });

      it('settling back on the chosen row writes nothing, and puts the line back on it', async () => {
        const fixture = await at('wed');
        const wheel = fixture.debugElement.children[0]
          .componentInstance as PctWheel;
        let writes = 0;
        wheel.value.subscribe(() => writes++);
        screen.calls.length = 0;

        // A drag that ends a few pixels off the row it started on.
        touchRows(fixture);
        rest(fixture, 2 * ROW + 6);

        expect(writes).toBe(0);
        expect(screen.calls).toEqual([{ top: 2 * ROW, behavior: 'instant' }]);
      });

      it.each([
        ['disabled', (host: Host) => host.disabled.set(true)],
        ['readonly', (host: Host) => host.ro.set(true)],
      ])('a %s wheel takes no value from it', async (_, set) => {
        const fixture = await at('wed', set);

        touchRows(fixture);
        rest(fixture, 5 * ROW);
        expect(fixture.componentInstance.value()).toBe('wed');

        // And the gesture is spent: enabling the wheel does not hand it the next settle.
        fixture.componentInstance.disabled.set(false);
        fixture.componentInstance.ro.set(false);
        await settle(fixture);
        rest(fixture, 5 * ROW);
        expect(fixture.componentInstance.value()).toBe('wed');
      });

      it('a key ends it: the settle of the key’s own scroll is not a gesture', async () => {
        const fixture = await at('wed');

        touchRows(fixture);
        press(fixture, 'Enter');
        rest(fixture, 5 * ROW);

        expect(fixture.componentInstance.value()).toBe('wed');
      });

      it('a click ends it — on a row that cannot be chosen too', async () => {
        const fixture = await at('mon', (host) =>
          host.options.set([
            { value: 'mon', label: 'Monday' },
            { value: 'tue', label: 'Tuesday', disabled: true },
            { value: 'wed', label: 'Wednesday' },
          ]),
        );

        // The pointer that went down for the click started no scroll.
        touchRows(fixture);
        rowsOf(fixture)[1].click();
        rest(fixture, 2 * ROW);

        expect(fixture.componentInstance.value()).toBe('mon');
      });
    });

    describe('a settle on a row that cannot be chosen', () => {
      const off = (value: string): PctWheelOption => ({
        value,
        label: value,
        disabled: true,
      });
      const on = (value: string): PctWheelOption => ({ value, label: value });

      it('goes on to the row after it, and the line follows', async () => {
        const fixture = await at(null, (host) =>
          host.options.set([on('a'), off('b'), on('c')]),
        );
        screen.calls.length = 0;

        touchRows(fixture);
        rest(fixture, ROW);

        expect(fixture.componentInstance.value()).toBe('c');
        expect(screen.calls).toEqual([{ top: 2 * ROW, behavior: 'instant' }]);
      });

      it('goes back to the row before it when none comes after', async () => {
        const fixture = await at(null, (host) =>
          host.options.set([on('a'), on('b'), off('c')]),
        );

        touchRows(fixture);
        rest(fixture, 2 * ROW);

        expect(fixture.componentInstance.value()).toBe('b');
      });

      it('the nearer row wins over the row after', async () => {
        const fixture = await at(null, (host) =>
          host.options.set([
            on('a'),
            on('b'),
            off('c'),
            off('d'),
            off('e'),
            on('f'),
          ]),
        );

        touchRows(fixture);
        rest(fixture, 2 * ROW);

        expect(fixture.componentInstance.value()).toBe('b');
      });

      it('a list does not look past its ends, and a ring does — forwards', async () => {
        const options = [on('a'), on('b'), off('c'), off('d')];
        const list = await at(null, (host) => host.options.set(options));
        touchRows(list);
        rest(list, 3 * ROW);
        expect(list.componentInstance.value()).toBe('b');

        const ring = await at(null, (host) => {
          host.options.set(options);
          host.wrap.set(true);
        });
        touchRows(ring);
        rest(ring, (4 + 3) * ROW);
        expect(ring.componentInstance.value()).toBe('a');
      });

      it('a list does not look past its ends, and a ring does — backwards', async () => {
        const options = [off('a'), off('b'), on('c'), on('d')];
        const list = await at(null, (host) => host.options.set(options));
        touchRows(list);
        rest(list, 0);
        expect(list.componentInstance.value()).toBe('c');

        const ring = await at(null, (host) => {
          host.options.set(options);
          host.wrap.set(true);
        });
        touchRows(ring);
        rest(ring, 4 * ROW);
        expect(ring.componentInstance.value()).toBe('d');
      });

      it('chooses nothing where no row can be chosen', async () => {
        const fixture = await at(null, (host) =>
          host.options.set([off('a'), off('b')]),
        );

        touchRows(fixture);
        rest(fixture, ROW);

        expect(fixture.componentInstance.value()).toBeNull();
        expect(screen.calls).toEqual([]);
      });
    });

    describe('the ring’s runway', () => {
      it('a settle on an outer turn is put back on the middle one, by whole turns', async () => {
        const fixture = await at('wed', (host) => host.wrap.set(true));
        const list = listOf(fixture);

        // The first turn: Saturday, five rows from the start.
        rest(fixture, 5 * ROW);
        expect(list.scrollTop).toBe((7 + 5) * ROW);

        // The last turn: Tuesday, fifteen rows from the start.
        rest(fixture, (14 + 1) * ROW);
        expect(list.scrollTop).toBe((7 + 1) * ROW);

        // No gesture brought either of them: the value is what it was.
        expect(fixture.componentInstance.value()).toBe('wed');
      });

      it('a settle on the middle turn stays where it is — the handler finds nothing to do twice', async () => {
        const fixture = await at('wed', (host) => host.wrap.set(true));
        const list = listOf(fixture);

        rest(fixture, 5 * ROW);
        list.dispatchEvent(new Event('scrollend'));
        expect(list.scrollTop).toBe((7 + 5) * ROW);

        // The two ends of the middle turn are on it.
        rest(fixture, 7 * ROW);
        expect(list.scrollTop).toBe(7 * ROW);
        rest(fixture, 13 * ROW);
        expect(list.scrollTop).toBe(13 * ROW);
        // And the rows on either side of it are not.
        rest(fixture, 6 * ROW);
        expect(list.scrollTop).toBe(13 * ROW);
        rest(fixture, 14 * ROW);
        expect(list.scrollTop).toBe(7 * ROW);
      });

      it('a gesture that ends on an outer turn chooses the row it copies', async () => {
        const fixture = await at('wed', (host) => host.wrap.set(true));
        const list = listOf(fixture);
        screen.calls.length = 0;

        touchRows(fixture);
        rest(fixture, (14 + 1) * ROW);

        expect(fixture.componentInstance.value()).toBe('tue');
        expect(list.scrollTop).toBe((7 + 1) * ROW);
        // Put back by whole turns: the line is on the row, and nothing travels.
        expect(screen.calls).toEqual([]);
      });

      it('a list is one turn: a settle anywhere on it moves nothing', async () => {
        const fixture = await at('wed');

        rest(fixture, 6 * ROW);

        expect(listOf(fixture).scrollTop).toBe(6 * ROW);
      });
    });

    describe('a travel overtaken by the next', () => {
      /**
       * A ring on Monday — row 7, the first of the middle turn — on a motion axis with a
       * duration, so that its travels take time. The layout stub moves the scroll at once; a
       * case puts it back where a travel under way would still be.
       */
      async function travelling() {
        const fixture = await at('mon', (host) => host.wrap.set(true));
        const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
          getPropertyValue: (name: string) =>
            name === '--pct-motion-transition-duration' ? '150ms' : '',
        } as CSSStyleDeclaration);
        screen.calls.length = 0;
        return { fixture, list: listOf(fixture), style };
      }

      it('the settle of the travel before puts no turn right under the next one', async () => {
        const { fixture, list, style } = await travelling();
        try {
          // Sunday is one row up, on the turn before: the rows have stopped there and the
          // engine has not said so yet when the next key comes.
          press(fixture, 'ArrowUp');
          await settle(fixture);
          press(fixture, 'ArrowDown');
          await settle(fixture);
          expect(screen.calls).toEqual([
            { top: 6 * ROW, behavior: 'smooth' },
            { top: 7 * ROW, behavior: 'smooth' },
          ]);

          // Now it says so, and the travel back to Monday has not moved a row: no turn is
          // put right — that would be Sunday on the middle turn — and Monday is asked for again.
          list.scrollTop = 6 * ROW;
          list.dispatchEvent(new Event('scrollend'));
          expect(screen.calls).toEqual([
            { top: 6 * ROW, behavior: 'smooth' },
            { top: 7 * ROW, behavior: 'smooth' },
            { top: 7 * ROW, behavior: 'smooth' },
          ]);

          // The travel arrives, and the wheel is at rest: the next settle is read again.
          rest(fixture, 7 * ROW);
          expect(list.scrollTop).toBe(7 * ROW);
          rest(fixture, 6 * ROW);
          expect(list.scrollTop).toBe(13 * ROW);
          expect(fixture.componentInstance.value()).toBe('mon');
        } finally {
          style.mockRestore();
        }
      });

      it.each(['pointerdown', 'wheel'] as const)(
        'a %s takes the scroll from the travel, and its settle is read',
        async (type) => {
          const { fixture, list, style } = await travelling();
          try {
            press(fixture, 'ArrowUp');
            await settle(fixture);

            touchRows(fixture, type);
            rest(fixture, 5 * ROW);

            expect(fixture.componentInstance.value()).toBe('sat');
            expect(list.scrollTop).toBe((7 + 5) * ROW);
          } finally {
            style.mockRestore();
          }
        },
      );

      it('a travel taken back before it moved is asked back to the row it left', async () => {
        const { fixture, list, style } = await travelling();
        try {
          press(fixture, 'ArrowUp');
          await settle(fixture);
          list.scrollTop = 7 * ROW;
          press(fixture, 'ArrowDown');
          await settle(fixture);

          // The scroll stands on Monday's row already — and is on its way to Sunday's, which
          // no scroll of no distance takes back.
          expect(screen.calls).toEqual([{ top: 6 * ROW, behavior: 'smooth' }]);

          // It comes to rest on Sunday's, and is sent to the row the value is on.
          rest(fixture, 6 * ROW);
          expect(screen.calls).toEqual([
            { top: 6 * ROW, behavior: 'smooth' },
            { top: 7 * ROW, behavior: 'smooth' },
          ]);

          // There it rests, and a settle anywhere is read again.
          rest(fixture, 7 * ROW);
          rest(fixture, 6 * ROW);
          expect(list.scrollTop).toBe(13 * ROW);
          expect(screen.calls.length).toBe(2);
        } finally {
          style.mockRestore();
        }
      });

      it('a travel made at once is overtaken by nothing', async () => {
        const { fixture, list, style } = await travelling();
        style.mockRestore();

        // No duration on the axis: the scroll is on Sunday's row when the call returns, and
        // a settle heard anywhere else is a settle there.
        press(fixture, 'ArrowUp');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 6 * ROW, behavior: 'instant' }]);
        rest(fixture, 5 * ROW);
        expect(list.scrollTop).toBe((7 + 5) * ROW);

        // And a row the scroll already stands on is not asked for.
        rest(fixture, 6 * ROW);
        screen.calls.length = 0;
        press(fixture, 'ArrowDown');
        await settle(fixture);
        list.scrollTop = 13 * ROW;
        press(fixture, 'ArrowUp');
        await settle(fixture);
        expect(screen.calls).toEqual([{ top: 14 * ROW, behavior: 'instant' }]);

        // Nor is it noted: a settle on another row of the middle turn is left where it is.
        rest(fixture, 12 * ROW);
        expect(list.scrollTop).toBe(12 * ROW);
        expect(screen.calls.length).toBe(1);
      });
    });

    describe('the size of the list changing', () => {
      const observers: {
        callback: ResizeObserverCallback;
        observed: Element[];
        disconnected: boolean;
      }[] = [];

      beforeEach(() => {
        observers.length = 0;
        vi.stubGlobal(
          'ResizeObserver',
          class {
            private readonly record: (typeof observers)[number];
            constructor(callback: ResizeObserverCallback) {
              this.record = { callback, observed: [], disconnected: false };
              observers.push(this.record);
            }
            observe(element: Element): void {
              this.record.observed.push(element);
            }
            disconnect(): void {
              this.record.disconnected = true;
            }
          },
        );
      });
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('puts the row under the line back where the line is, at once', async () => {
        const fixture = await at('wed', (host) => host.wrap.set(true));
        const list = listOf(fixture);
        screen.calls.length = 0;
        const style = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
          getPropertyValue: () => '150ms',
        } as unknown as CSSStyleDeclaration);

        try {
          expect(observers.length).toBe(1);
          expect(observers[0].observed).toEqual([list]);

          // The rows grew under the scroll: what was the line's place is another row's now —
          // and on another turn, which a placement does not keep.
          list.scrollTop = 17 * ROW;
          observers[0].callback([], {} as ResizeObserver);

          expect(screen.calls).toEqual([
            { top: (7 + 2) * ROW, behavior: 'instant' },
          ]);
        } finally {
          style.mockRestore();
        }
      });

      it('stops watching when the wheel goes', async () => {
        const fixture = await at('wed');
        expect(observers[0].disconnected).toBe(false);

        fixture.destroy();

        expect(observers[0].disconnected).toBe(true);
      });
    });
  });

  describe('signal forms', () => {
    it('a key writes the model, and the schema’s verdict reaches the listbox', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const list = listOf(fixture);

      expect(host.f.day().valid()).toBe(false);
      expect(list.getAttribute('aria-required')).toBe('true');
      // Invalid and untouched: the form does not open red.
      expect(list.hasAttribute('aria-invalid')).toBe(false);

      list.dispatchEvent(new Event('blur'));
      await settle(fixture);
      expect(host.f.day().touched()).toBe(true);
      expect(list.getAttribute('aria-invalid')).toBe('true');
      expect(part(fixture, 'error').textContent?.trim()).toBe('Pick a day');

      press(fixture, 'ArrowDown');
      await settle(fixture);
      expect(host.model().day).toBe('tue');
      expect(host.f.day().valid()).toBe(true);
      expect(list.hasAttribute('aria-invalid')).toBe(false);
      expect(allParts(fixture, 'error').length).toBe(0);
    });

    it('a value the model writes moves the line', async () => {
      const fixture = await render(SignalFormHost);
      fixture.componentInstance.model.set({ day: 'fri' });
      await settle(fixture);

      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[4].id,
      );
    });

    it('a form’s reset keeps the value the form holds, and leaves the form pristine', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      press(fixture, 'ArrowDown');
      await settle(fixture);
      expect(host.f.day().dirty()).toBe(true);

      host.f().reset();
      await settle(fixture);

      expect(host.model().day).toBe('tue');
      expect(host.f.day().dirty()).toBe(false);
      expect(rowsOf(fixture)[1].getAttribute('aria-selected')).toBe('true');
    });

    it('a form’s reset to a value shows that value, and the wheel’s own reset writes nothing after it', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      press(fixture, 'ArrowDown');
      await settle(fixture);

      host.f().reset({ day: 'fri' });
      await settle(fixture);

      expect(host.model().day).toBe('fri');
      expect(host.f.day().dirty()).toBe(false);
      expect(rowsOf(fixture)[4].getAttribute('aria-selected')).toBe('true');
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[4].id,
      );
    });

    it('the form’s name for the field is written on the listbox', async () => {
      const fixture = await render(SignalFormHost);

      expect(listOf(fixture).getAttribute('name')).toBe(
        fixture.componentInstance.f.day().name(),
      );
      expect(fixture.componentInstance.f.day().name()).not.toBe('');
    });
  });

  describe('compatibility with classic forms (no CVA)', () => {
    it('reactive forms: [formControl] syncs both ways', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      expect(rowsOf(fixture)[2].getAttribute('aria-selected')).toBe('true');

      press(fixture, 'ArrowDown');
      await settle(fixture);
      expect(ctrl.value).toBe('thu');
      expect(ctrl.dirty).toBe(true);

      ctrl.setValue('mon');
      await settle(fixture);
      expect(rowsOf(fixture)[0].getAttribute('aria-selected')).toBe('true');
      expect(listOf(fixture).getAttribute('aria-activedescendant')).toBe(
        rowsOf(fixture)[0].id,
      );
    });

    it('reactive forms: disable() and enable() reach the listbox', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      ctrl.disable();
      await settle(fixture);
      expect(listOf(fixture).getAttribute('aria-disabled')).toBe('true');
      expect(listOf(fixture).getAttribute('tabindex')).toBe('-1');

      ctrl.enable();
      await settle(fixture);
      expect(listOf(fixture).hasAttribute('aria-disabled')).toBe(false);
      expect(listOf(fixture).getAttribute('tabindex')).toBe('0');
    });

    it('reactive forms: leaving the wheel marks the control touched', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;
      expect(ctrl.touched).toBe(false);

      listOf(fixture).dispatchEvent(new Event('blur'));
      await settle(fixture);

      expect(ctrl.touched).toBe(true);
    });

    it('template-driven: [(ngModel)] syncs both ways, and a name given is written on the listbox', async () => {
      const fixture = await render(NgModelHost);
      await settle(fixture);

      expect(rowsOf(fixture)[2].getAttribute('aria-selected')).toBe('true');
      expect(listOf(fixture).getAttribute('name')).toBe('day');

      press(fixture, 'End');
      await settle(fixture);
      expect(fixture.componentInstance.day).toBe('sun');
    });
  });

  describe('inside a pct-field', () => {
    it('the chrome names and describes the listbox, and the wheel draws no line of its own', async () => {
      const fixture = await render(FieldHost);
      const root = fixture.nativeElement as HTMLElement;
      const list = listOf(fixture);
      const label = part(fixture, 'field-label');
      const hint = part(fixture, 'field-hint');

      expect(hostOf(fixture).getAttribute('data-pct-in-field')).toBe('');
      expect(list.getAttribute('aria-labelledby')).toBe(label.id);
      expect(list.getAttribute('aria-describedby')).toBe(hint.id);
      expect(
        root.querySelectorAll(
          '[data-pct-part="label"], [data-pct-part="hint"], [data-pct-part="error"], [data-pct-part="warning"]',
        ).length,
      ).toBe(0);
    });

    it('a field with no label leaves the name to the page, never to the wheel’s own label', async () => {
      const fixture = await render(FieldHost);
      fixture.componentInstance.fieldLabel.set('');
      await settle(fixture);

      expect(allParts(fixture, 'label').length).toBe(0);
      expect(listOf(fixture).getAttribute('aria-labelledby')).toBe(
        'page-heading',
      );
    });

    it('the error and the warning are the chrome’s to draw, and the host still says which is lit', async () => {
      const fixture = await render(FieldHost);
      const host = fixture.componentInstance;
      host.touched.set(true);
      host.warnings.set([requiredError({ message: 'A day off' })]);
      await settle(fixture);

      expect(allParts(fixture, 'warning').length).toBe(0);
      expect(part(fixture, 'field-warning').textContent).toContain('A day off');
      expect(hostOf(fixture).getAttribute('data-pct-warning')).toBe('');
      expect(listOf(fixture).getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-warning').id,
      );

      host.invalid.set(true);
      host.errors.set([requiredError({ message: 'Pick a day' })]);
      await settle(fixture);

      expect(allParts(fixture, 'error').length).toBe(0);
      expect(part(fixture, 'field-error').textContent).toContain('Pick a day');
      expect(hostOf(fixture).getAttribute('data-pct-invalid')).toBe('');
      expect(listOf(fixture).getAttribute('aria-invalid')).toBe('true');
    });
  });
});
