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
  type ValidationError,
} from '@angular/forms/signals';
import { providePctTexts } from '@pacit/components/core';
import { PctDay } from '@pacit/components/date';
import { PctField } from '@pacit/components/field';

import { PctDateTime } from './datetime';
import { PctDatetime, PctDateTimePredicate } from './datetime-field';

const dayText = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="date-control"]',
  ) as HTMLInputElement;

const timeText = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="time-control"]',
  ) as HTMLInputElement;

const textsOf = (f: ComponentFixture<unknown>) =>
  Array.from(
    f.nativeElement.querySelectorAll(
      '[data-pct-part="date-control"], [data-pct-part="time-control"]',
    ),
  ) as HTMLInputElement[];

/** Node writes U+202F before a day period where every browser writes a space (0086, D4). */
const shown = (input: HTMLInputElement) => input.value.replace(/\u202f/g, ' ');

const toggleOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="toggle"]',
  ) as HTMLButtonElement;

const hostOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('pct-datetime') as HTMLElement;

const part = (f: ComponentFixture<unknown>, name: string) =>
  f.nativeElement.querySelector(
    `[data-pct-part="${name}"]`,
  ) as HTMLElement | null;

/** The panel renders in a CDK overlay — outside the component tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const gridIn = () =>
  document.querySelector(
    '[data-pct-part="panel"] [data-pct-part="grid"]',
  ) as HTMLElement;

const cursorIn = () =>
  document.querySelector(
    '[data-pct-part="panel"] [data-pct-part="day"][tabindex="0"]',
  ) as HTMLElement;

const captionIn = () =>
  document
    .querySelector('[data-pct-part="panel"] [data-pct-part="caption"]')
    ?.textContent?.trim();

const dayIn = (name: string) =>
  Array.from(
    document.querySelectorAll<HTMLElement>(
      '[data-pct-part="panel"] [data-pct-part="day"]',
    ),
  ).find((cell) => cell.getAttribute('aria-label')?.includes(name)) as
    HTMLElement | undefined;

const columnIn = (field: string) =>
  document.querySelector(
    `[data-pct-part="panel"] [data-pct-part="column"][data-pct-field="${field}"]`,
  ) as HTMLElement;

const activeIn = (list: HTMLElement) =>
  list
    .querySelector(`#${list.getAttribute('aria-activedescendant')}`)
    ?.textContent?.trim();

const takeable = (list: HTMLElement) =>
  Array.from(
    list.querySelectorAll<HTMLElement>(
      '[role="option"]:not([aria-disabled="true"])',
    ),
  ).map((row) => row.textContent?.trim());

const chosenIn = (list: HTMLElement) =>
  Array.from(
    list.querySelectorAll<HTMLElement>('[role="option"][aria-selected="true"]'),
  ).map((row) => row.textContent?.trim());

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function settle(f: ComponentFixture<unknown>) {
  f.detectChanges();
  await f.whenStable();
}

async function type(
  f: ComponentFixture<unknown>,
  control: HTMLInputElement,
  text: string,
) {
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(f);
}

/** A half left for somewhere else in the field, or — `outside` — for the page. */
async function leave(
  f: ComponentFixture<unknown>,
  control: HTMLElement,
  to: HTMLElement | null,
) {
  control.dispatchEvent(new Event('blur'));
  control.dispatchEvent(
    new FocusEvent('focusout', { bubbles: true, relatedTarget: to }),
  );
  await settle(f);
}

async function open(f: ComponentFixture<unknown>) {
  toggleOf(f).click();
  await settle(f);
}

async function key(
  f: ComponentFixture<unknown>,
  target: HTMLElement,
  name: string,
  init: KeyboardEventInit = {},
) {
  const event = new KeyboardEvent('keydown', {
    key: name,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  target.dispatchEvent(event);
  await settle(f);
  return event;
}

const errorOf = (f: ComponentFixture<unknown>) =>
  part(f, 'error')?.textContent?.trim() ?? null;

@Component({
  imports: [PctDatetime],
  template: `<pct-datetime
    [(value)]="value"
    [label]="label()"
    [hint]="hint()"
    [locale]="locale()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [dateDisabled]="dateDisabled()"
    [datetimeDisabled]="datetimeDisabled()"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [required]="required()"
    [showFormat]="showFormat()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    (touch)="touches = touches + 1"
  />`,
})
class Host {
  readonly value = signal<PctDateTime | null>('2026-12-01T13:05');
  readonly label = signal('Starts');
  readonly hint = signal('');
  readonly locale = signal('en-GB');
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly step = signal(60);
  readonly dateDisabled = signal<((day: PctDay) => boolean) | null>(null);
  readonly datetimeDisabled = signal<PctDateTimePredicate | null>(null);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly showFormat = signal(true);
  readonly touched = signal(false);
  readonly invalid = signal(false);
  readonly errors = signal<readonly ValidationError.WithOptionalFieldTree[]>(
    [],
  );
  touches = 0;
}

@Component({
  imports: [PctDatetime, PctField],
  template: `<pct-field label="Starts" hint="When it begins">
    <pct-datetime [(value)]="value" locale="en-GB" />
  </pct-field>`,
})
class InField {
  readonly value = signal<PctDateTime | null>('2026-12-01T13:05');
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

afterEach(() => {
  // An overlay a case left open stands in `body` for the next one.
  document
    .querySelectorAll('.cdk-overlay-container')
    .forEach((node) => node.remove());
});

describe('PctDatetime — the two texts', () => {
  it('writes the day and the time each in its own text, in the field’s language', async () => {
    const f = await render(Host);
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(shown(timeText(f))).toBe('13:05');

    f.componentInstance.locale.set('en-US');
    await settle(f);
    expect(shown(dayText(f))).toBe('12/01/2026');
    expect(shown(timeText(f))).toBe('1:05 PM');
  });

  it('stands the halves in the order the language writes a day with a time — the time first in Vietnamese', async () => {
    const f = await render(Host);
    expect(textsOf(f).map((t) => t.dataset['pctPart'])).toEqual([
      'date-control',
      'time-control',
    ]);
    const label = part(f, 'label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(dayText(f).id);

    f.componentInstance.locale.set('vi-VN');
    await settle(f);
    expect(textsOf(f).map((t) => t.dataset['pctPart'])).toEqual([
      'time-control',
      'date-control',
    ]);
    // The label points at whichever stands first, and both halves keep their values.
    expect(label.getAttribute('for')).toBe(timeText(f).id);
    expect(shown(timeText(f))).toBe('13:05');
    expect(shown(dayText(f))).toBe('01/12/2026');
  });

  it('is empty in both texts when the value is, with two format hints in the language’s order', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    expect(dayText(f).value).toBe('');
    expect(timeText(f).value).toBe('');
    expect(dayText(f).getAttribute('placeholder')).toBe('dd/mm/yyyy');
    expect(timeText(f).getAttribute('placeholder')).toBe('hh:mm');

    f.componentInstance.locale.set('pl-PL');
    await settle(f);
    expect(dayText(f).getAttribute('placeholder')).toBe('dd.mm.yyyy');

    f.componentInstance.showFormat.set(false);
    await settle(f);
    expect(dayText(f).hasAttribute('placeholder')).toBe(false);
    expect(timeText(f).hasAttribute('placeholder')).toBe(false);
  });

  it('writes the hints with the letters the texts channel gives it — the order stays the field’s', async () => {
    TestBed.configureTestingModule({
      providers: [
        providePctTexts({
          dateDayLetter: 'j',
          dateYearLetter: 'a',
          timeHourLetter: 'H',
        }),
      ],
    });
    const f = await render(Host);
    f.componentInstance.value.set(null);
    f.componentInstance.step.set(1);
    await settle(f);
    expect(dayText(f).getAttribute('placeholder')).toBe('jj/mm/aaaa');
    expect(timeText(f).getAttribute('placeholder')).toBe('HH:mm:ss');
  });

  it('draws each text as wide as its half is written', async () => {
    const f = await render(Host);
    // `dd/mm/yyyy` and `28/12/2026` are ten wide, `hh:mm` and `23:58` five — and one to spare.
    expect(dayText(f).getAttribute('size')).toBe('11');
    expect(timeText(f).getAttribute('size')).toBe('6');
    f.componentInstance.locale.set('en-US');
    await settle(f);
    // `h:mm AM/PM`, the hint with the clock's own two words, is wider than `11:58 PM`.
    expect(timeText(f).getAttribute('size')).toBe('11');
  });

  it('names each text by the label and a word of its own, and the group by the label (0090, E1–E3)', async () => {
    const f = await render(Host);
    const label = part(f, 'label') as HTMLElement;
    const group = f.nativeElement.querySelector(
      '[role="group"]',
    ) as HTMLElement;
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);

    const [labelId, dayWord] = (
      dayText(f).getAttribute('aria-labelledby') as string
    ).split(' ');
    const [labelId2, timeWord] = (
      timeText(f).getAttribute('aria-labelledby') as string
    ).split(' ');
    expect(labelId).toBe(label.id);
    expect(labelId2).toBe(label.id);
    const word = (id: string) => f.nativeElement.querySelector(`#${id}`);
    expect(word(dayWord).textContent.trim()).toBe('Day');
    expect(word(timeWord).textContent.trim()).toBe('Time');
    // Read as a name, never as content beside the texts.
    expect(word(dayWord).hidden).toBe(true);
    expect(word(timeWord).hidden).toBe(true);
  });

  it('takes the two words and the button’s name from the texts channel', async () => {
    TestBed.configureTestingModule({
      providers: [
        providePctTexts({
          datetimeDay: 'Jour',
          datetimeTime: 'Heure',
          datetimeOpen: 'Choisir une date et une heure',
        }),
      ],
    });
    const f = await render(Host);
    const words = Array.from(
      f.nativeElement.querySelectorAll('span[hidden]'),
    ).map((span) => (span as HTMLElement).textContent?.trim());
    expect(words).toEqual(['Jour', 'Heure']);
    expect(toggleOf(f).getAttribute('aria-label')).toBe(
      'Choisir une date et une heure',
    );
  });

  it('names itself through an aria input when it draws no label, a word still after it', async () => {
    @Component({
      imports: [PctDatetime],
      template: `<span id="slot">Slot</span>
        <pct-datetime ariaLabel="Start" />
        <pct-datetime ariaLabelledby="slot" />
        <pct-datetime />`,
    })
    class Named {}

    const f = await render(Named);
    const days = Array.from(
      f.nativeElement.querySelectorAll('[data-pct-part="date-control"]'),
    ) as HTMLInputElement[];
    const groups = Array.from(
      f.nativeElement.querySelectorAll('[role="group"]'),
    ) as HTMLElement[];
    const [nameId, word] = (
      days[0].getAttribute('aria-labelledby') as string
    ).split(' ');
    expect(f.nativeElement.querySelector(`#${nameId}`).textContent.trim()).toBe(
      'Start',
    );
    expect(groups[0].getAttribute('aria-label')).toBe('Start');
    expect(groups[0].hasAttribute('aria-labelledby')).toBe(false);
    expect(word).toMatch(/day-word$/);
    expect(days[1].getAttribute('aria-labelledby')?.split(' ')[0]).toBe('slot');
    expect(groups[1].getAttribute('aria-labelledby')).toBe('slot');
    expect(groups[1].hasAttribute('aria-label')).toBe(false);
    // With no name at all, each text is still told which half it is.
    expect(days[2].getAttribute('aria-labelledby')).toMatch(/^\S+day-word$/);
    expect(groups[2].hasAttribute('aria-labelledby')).toBe(false);
    expect(groups[2].hasAttribute('aria-label')).toBe(false);
    expect(f.nativeElement.querySelector('[data-pct-part="label"]')).toBeNull();
  });

  it('is two plain textboxes for a numeric keypad, with nothing the browser fills in', async () => {
    const f = await render(Host);
    for (const control of textsOf(f)) {
      expect(control.type).toBe('text');
      expect(control.getAttribute('inputmode')).toBe('numeric');
      expect(control.getAttribute('autocomplete')).toBe('off');
      expect(control.hasAttribute('role')).toBe(false);
      expect(control.hasAttribute('aria-expanded')).toBe(false);
    }
  });
});

describe('PctDatetime — typing', () => {
  it('composes the value only once both halves hold one', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    expect(f.componentInstance.value()).toBeNull();
    await type(f, timeText(f), '18:30');
    expect(f.componentInstance.value()).toBe('2026-12-24T18:30');
    // Emptied, a half takes the value with it — the other half stays on the screen.
    await type(f, timeText(f), '');
    expect(f.componentInstance.value()).toBeNull();
    expect(shown(dayText(f))).toBe('24/12/2026');
  });

  it('does not rewrite a half being typed, and writes the canonical text back when it is left', async () => {
    const f = await render(Host);
    await type(f, dayText(f), '2/1/2027');
    expect(dayText(f).value).toBe('2/1/2027');
    expect(f.componentInstance.value()).toBe('2027-01-02T13:05');
    await leave(f, dayText(f), timeText(f));
    expect(shown(dayText(f))).toBe('02/01/2027');
    // The time's text was never touched.
    expect(shown(timeText(f))).toBe('13:05');
  });

  it('writes the value in the field’s shape: seconds where the step has them', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(1);
    await settle(f);
    await type(f, timeText(f), '14:15');
    expect(f.componentInstance.value()).toBe('2026-12-01T14:15:00');
  });

  it('changes nothing when a half is focused and left without an edit', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(1);
    await settle(f);
    const changes: unknown[] = [];
    const sub = f.debugElement
      .query((node) => node.name === 'pct-datetime')
      .componentInstance.value.subscribe((v: unknown) => changes.push(v));
    await leave(f, timeText(f), dayText(f));
    await leave(f, dayText(f), timeText(f));
    sub.unsubscribe();
    expect(changes).toEqual([]);
    expect(f.componentInstance.value()).toBe('2026-12-01T13:05');
    // Nor its text: a seconds field given `13:05` does not write it back as `13:05:00`.
    expect(timeText(f).value).toBe('13:05');
  });

  it('keeps the shape a value from outside was given', async () => {
    const f = await render(Host);
    f.componentInstance.value.set('2026-12-01T13:05:30');
    await settle(f);
    expect(timeText(f).value).toBe('13:05:30');
    await type(f, dayText(f), '02/12/2026');
    expect(f.componentInstance.value()).toBe('2026-12-02T13:05:30');
  });
});

describe('PctDatetime — junk in a half', () => {
  it('keeps the junk, says which half it is in, and leaves the other half alone', async () => {
    const f = await render(Host);
    await type(f, dayText(f), '31/02/2026');
    await leave(f, dayText(f), timeText(f));
    expect(dayText(f).value).toBe('31/02/2026');
    expect(shown(timeText(f))).toBe('13:05');
    expect(f.componentInstance.value()).toBeNull();
    expect(errorOf(f)).toBe('Not a date');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(true);
    expect(dayText(f).getAttribute('aria-invalid')).toBe('true');
    expect(timeText(f).hasAttribute('aria-invalid')).toBe(false);
  });

  it('says it is not a time for junk in the time, and keeps the day', async () => {
    const f = await render(Host);
    await type(f, timeText(f), '25:99');
    await leave(f, timeText(f), dayText(f));
    expect(timeText(f).value).toBe('25:99');
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(errorOf(f)).toBe('Not a time');
    expect(timeText(f).getAttribute('aria-invalid')).toBe('true');
    expect(dayText(f).hasAttribute('aria-invalid')).toBe(false);
  });

  it('says the day’s sentence when both halves are junk, and marks both', async () => {
    const f = await render(Host);
    await type(f, timeText(f), 'later');
    await leave(f, timeText(f), dayText(f));
    await type(f, dayText(f), 'soon');
    await leave(f, dayText(f), timeText(f));
    expect(errorOf(f)).toBe('Not a date');
    expect(dayText(f).getAttribute('aria-invalid')).toBe('true');
    expect(timeText(f).getAttribute('aria-invalid')).toBe('true');
  });

  it('takes the report back on the first keystroke, and when a value arrives from outside', async () => {
    const f = await render(Host);
    await type(f, dayText(f), 'soon');
    await leave(f, dayText(f), timeText(f));
    expect(errorOf(f)).toBe('Not a date');
    await type(f, dayText(f), 'soo');
    expect(errorOf(f)).toBeNull();
    await leave(f, dayText(f), timeText(f));
    expect(errorOf(f)).toBe('Not a date');

    f.componentInstance.value.set('2027-03-04T05:06');
    await settle(f);
    expect(errorOf(f)).toBeNull();
    expect(shown(dayText(f))).toBe('04/03/2027');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });

  it('opens the calendar on the month the junk names (0090 §2)', async () => {
    const f = await render(Host);
    await type(f, dayText(f), '31/02/2026');
    await leave(f, dayText(f), timeText(f));
    await open(f);
    expect(captionIn()).toBe('February 2026');
    // A cursor on the month, and nothing chosen in it.
    expect(cursorIn().getAttribute('aria-label')).toContain('1 February 2026');
    expect(
      document.querySelectorAll('[data-pct-part="day"][data-pct-chosen]'),
    ).toHaveLength(0);
  });

  it('opens on today when the junk names no month', async () => {
    const f = await render(Host);
    await type(f, dayText(f), '31/13/2026');
    await leave(f, dayText(f), timeText(f));
    await open(f);
    expect(captionIn()).not.toBe('February 2026');
    expect(captionIn()).not.toBe('December 2026');
  });

  it('reports nothing while disabled', async () => {
    const f = await render(Host);
    await type(f, dayText(f), 'soon');
    await leave(f, dayText(f), timeText(f));
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(errorOf(f)).toBeNull();
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });
});

describe('PctDatetime — a half left empty (0090 §3)', () => {
  it('says so when focus leaves the whole field with one half held, required or not', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    // Moving to the time is staying in the field.
    await leave(f, dayText(f), timeText(f));
    expect(errorOf(f)).toBeNull();
    expect(f.componentInstance.touches).toBe(0);
    // Off the field, to the page.
    await leave(f, timeText(f), null);
    expect(errorOf(f)).toBe('Enter both a date and a time');
    expect(f.componentInstance.touches).toBe(1);
    expect(f.componentInstance.value()).toBeNull();
    // The empty half carries the mark.
    expect(timeText(f).getAttribute('aria-invalid')).toBe('true');
    expect(dayText(f).hasAttribute('aria-invalid')).toBe(false);
  });

  it('says so for a time with no day, the mirror', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, timeText(f), '09:00');
    await leave(f, timeText(f), null);
    expect(errorOf(f)).toBe('Enter both a date and a time');
    expect(dayText(f).getAttribute('aria-invalid')).toBe('true');
  });

  it('is taken back by a keystroke in the empty half, and not by one in the held half', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    await leave(f, dayText(f), null);
    expect(errorOf(f)).toBe('Enter both a date and a time');
    await type(f, dayText(f), '25/12/2026');
    expect(errorOf(f)).toBe('Enter both a date and a time');
    await type(f, timeText(f), '1');
    expect(errorOf(f)).toBeNull();
  });

  it('is taken back when a value arrives from outside', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    await leave(f, dayText(f), null);
    f.componentInstance.value.set('2027-01-01T00:00');
    await settle(f);
    expect(errorOf(f)).toBeNull();
  });

  it('gives way to junk in a half — text that is not a value comes first', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, timeText(f), 'later');
    await leave(f, timeText(f), null);
    expect(errorOf(f)).toBe('Not a time');
  });

  it('says nothing for two empty halves, nor while disabled', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await leave(f, dayText(f), null);
    expect(errorOf(f)).toBeNull();
    await type(f, dayText(f), '24/12/2026');
    await leave(f, dayText(f), null);
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(errorOf(f)).toBeNull();
  });

  it('counts the button and the panel as the field, and leaving the panel for the page as leaving', async () => {
    const f = await render(Host);
    await leave(f, timeText(f), toggleOf(f));
    expect(f.componentInstance.touches).toBe(0);
    await open(f);
    const cell = cursorIn();
    cell.dispatchEvent(
      new FocusEvent('focusout', {
        bubbles: true,
        relatedTarget: columnIn('hour'),
      }),
    );
    await settle(f);
    expect(f.componentInstance.touches).toBe(0);
    cell.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: null }),
    );
    await settle(f);
    expect(f.componentInstance.touches).toBe(1);
  });
});

describe('PctDatetime — the panel', () => {
  it('opens from the button, says so on it, and is a dialog named by the button’s name', async () => {
    const f = await render(Host);
    const toggle = toggleOf(f);
    expect(toggle.getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.hasAttribute('aria-controls')).toBe(false);
    expect(toggle.getAttribute('aria-label')).toBe('Choose date and time');
    await open(f);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(toggle.getAttribute('aria-controls')).toBe(panel()?.id);
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(panel()?.getAttribute('aria-label')).toBe('Choose date and time');
    expect(hostOf(f).hasAttribute('data-pct-open')).toBe(true);
  });

  it('is taken back by a reset, the pair stays, and focus held in it comes back to the field', async () => {
    const f = await render(Host);
    await open(f);
    expect(panel()?.contains(document.activeElement)).toBe(true);
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;

    // A form put back to its start has no panel hanging off it — the select's reading. A
    // panel taken out under focus would drop it to `body`.
    field.reset();
    await settle(f);

    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(f.componentInstance.value()).toBe('2026-12-01T13:05');
    expect(document.activeElement).toBe(dayText(f));
  });

  it('leaves focus where it is when a reset closes a panel that does not hold it', async () => {
    const f = await render(Host);
    await open(f);
    (document.activeElement as HTMLElement).blur();
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;

    field.reset();
    await settle(f);

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it('closes a panel asked for in the same task as the reset, before it is drawn', async () => {
    const f = await render(Host);
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;
    // The press opens the panel and the reset arrives before a render has drawn it.
    toggleOf(f).click();
    field.reset();
    await settle(f);

    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(dayText(f));
  });

  it('opens on the day and the time it holds, with focus on the grid', async () => {
    const f = await render(Host);
    await open(f);
    expect(captionIn()).toBe('December 2026');
    expect(cursorIn().getAttribute('aria-label')).toContain('1 December 2026');
    expect(document.activeElement).toBe(cursorIn());
    expect(activeIn(columnIn('hour'))).toBe('13');
    expect(activeIn(columnIn('minute'))).toBe('05');
  });

  it('writes a day picked in the grid, keeps the time as typed, and hands focus to the hours', async () => {
    const f = await render(Host);
    await type(f, timeText(f), '9:07');
    await open(f);
    await key(f, gridIn(), 'ArrowRight');
    await key(f, gridIn(), 'Enter');
    expect(f.componentInstance.value()).toBe('2026-12-02T09:07');
    expect(shown(dayText(f))).toBe('02/12/2026');
    // The time's text is as the user left it — settled when the panel opened, as leaving it
    // would have settled it, and not rewritten by a pick of the day.
    expect(timeText(f).value).toBe('09:07');
    expect(panel()).not.toBeNull();
    expect(document.activeElement).toBe(columnIn('hour'));
  });

  it('takes a click on a day as Enter on it', async () => {
    const f = await render(Host);
    await open(f);
    dayIn('15 December 2026')?.click();
    await settle(f);
    expect(f.componentInstance.value()).toBe('2026-12-15T13:05');
    expect(document.activeElement).toBe(columnIn('hour'));
  });

  it('writes a day with no time as no value, and the columns stand on now, chosen nowhere', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await open(f);
    await key(f, gridIn(), 'Enter');
    expect(f.componentInstance.value()).toBeNull();
    expect(dayText(f).value).not.toBe('');
    expect(timeText(f).value).toBe('');
    expect(activeIn(columnIn('hour'))).toBeDefined();
    expect(chosenIn(columnIn('hour'))).toEqual([]);
    // The value appears the moment the second half holds one.
    await key(f, columnIn('hour'), 'Enter');
    expect(f.componentInstance.value()).not.toBeNull();
    expect(panel()).toBeNull();
  });

  it('writes the time a column walks to, and closes on Enter with focus back on the field', async () => {
    const f = await render(Host);
    await open(f);
    await key(f, columnIn('minute'), 'ArrowDown');
    expect(f.componentInstance.value()).toBe('2026-12-01T13:06');
    expect(shown(timeText(f))).toBe('13:06');
    expect(panel()).not.toBeNull();
    await key(f, columnIn('minute'), 'Enter');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(dayText(f));
  });

  it('closes on Escape with the value as the halves left it, and the Escape goes no further', async () => {
    const f = await render(Host);
    await open(f);
    await key(f, columnIn('hour'), 'ArrowDown');
    let heard = 0;
    const listener = () => (heard += 1);
    document.addEventListener('keydown', listener);
    const escape = await key(f, gridIn(), 'Escape');
    document.removeEventListener('keydown', listener);
    expect(panel()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
    expect(heard).toBe(0);
    expect(f.componentInstance.value()).toBe('2026-12-01T14:05');
    expect(document.activeElement).toBe(dayText(f));
  });

  describe('Tab walks the grid, then the columns, and leaves (0031)', () => {
    const stopsIn = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"]',
        ),
      );

    it('has the month buttons, the grid’s cell and a stop per column — the columns after the grid', async () => {
      const f = await render(Host);
      await open(f);
      const stops = stopsIn(panel() as HTMLElement);
      expect(stops.map((s) => s.dataset['pctPart'])).toEqual([
        'nav',
        'nav',
        'day',
        'column',
        'column',
      ]);
      expect(stops[3]).toBe(columnIn('hour'));
    });

    it('closes forward off the last stop and backward off the first, focus back on the field', async () => {
      const f = await render(Host);
      await open(f);
      let stops = stopsIn(panel() as HTMLElement);
      const forward = await key(f, stops[stops.length - 1], 'Tab');
      expect(panel()).toBeNull();
      expect(forward.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(dayText(f));

      await open(f);
      stops = stopsIn(panel() as HTMLElement);
      await key(f, stops[0], 'Tab', { shiftKey: true });
      expect(panel()).toBeNull();

      await open(f);
      await key(f, panel() as HTMLElement, 'Tab', { shiftKey: true });
      expect(panel()).toBeNull();
    });

    it('stays open while the walk is still inside — from the grid to the hours and back', async () => {
      const f = await render(Host);
      await open(f);
      const forward = await key(f, cursorIn(), 'Tab');
      expect(forward.defaultPrevented).toBe(false);
      expect(panel()).not.toBeNull();
      const back = await key(f, columnIn('hour'), 'Tab', { shiftKey: true });
      expect(back.defaultPrevented).toBe(false);
      expect(panel()).not.toBeNull();
    });
  });

  it('closes on the button that opened it', async () => {
    const f = await render(Host);
    await open(f);
    await open(f);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(dayText(f));
  });

  it('closes on a press outside, and leaves focus where the press landed', async () => {
    const f = await render(Host);
    await open(f);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(f);
    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(dayText(f));
  });

  it('is not opened by a disabled or a read-only field, and freezes both halves of an open one', async () => {
    const f = await render(Host);
    await open(f);
    f.componentInstance.readonly.set(true);
    await settle(f);
    expect(columnIn('hour').getAttribute('aria-disabled')).toBe('true');
    expect(gridIn().getAttribute('aria-disabled')).toBe('true');
    await key(f, gridIn(), 'Escape');
    expect(panel()).toBeNull();
    await open(f);
    expect(panel()).toBeNull();
    expect(toggleOf(f).disabled).toBe(true);
    expect(dayText(f).readOnly).toBe(true);
    expect(timeText(f).readOnly).toBe(true);

    f.componentInstance.readonly.set(false);
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(toggleOf(f).disabled).toBe(true);
    expect(dayText(f).disabled).toBe(true);
    expect(timeText(f).disabled).toBe(true);
    expect(hostOf(f).hasAttribute('data-pct-disabled')).toBe(true);
  });
});

describe('PctDatetime — the bounds (0090 §5)', () => {
  it('casts the bounds’ days on the calendar', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T09:00');
    f.componentInstance.max.set('2026-12-04T17:00');
    f.componentInstance.value.set('2026-12-03T12:00');
    await settle(f);
    await open(f);
    expect(dayIn('1 December 2026')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(dayIn('2 December 2026')?.hasAttribute('aria-disabled')).toBe(false);
    expect(dayIn('4 December 2026')?.hasAttribute('aria-disabled')).toBe(false);
    expect(dayIn('5 December 2026')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('casts a bound’s time on the columns only on the bound’s own day', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T09:00');
    f.componentInstance.max.set('2026-12-04T17:00');
    f.componentInstance.value.set('2026-12-02T12:00');
    await settle(f);
    await open(f);
    expect(takeable(columnIn('hour'))[0]).toBe('09');
    expect(takeable(columnIn('hour'))).toHaveLength(15);

    f.componentInstance.value.set('2026-12-03T12:00');
    await settle(f);
    expect(takeable(columnIn('hour'))).toHaveLength(24);

    f.componentInstance.value.set('2026-12-04T12:00');
    await settle(f);
    expect(takeable(columnIn('hour')).at(-1)).toBe('17');
    expect(takeable(columnIn('hour'))).toHaveLength(18);
  });

  it('refuses every time of a day outside the window', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T09:00');
    f.componentInstance.max.set('2026-12-04T17:00');
    f.componentInstance.value.set('2026-12-05T12:00');
    await settle(f);
    await open(f);
    expect(takeable(columnIn('hour'))).toEqual([]);
    f.componentInstance.value.set('2026-12-01T12:00');
    await settle(f);
    expect(takeable(columnIn('hour'))).toEqual([]);
  });

  it('counts the step from midnight and moves a bound off it inward', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(900);
    f.componentInstance.min.set('2026-12-02T09:05');
    f.componentInstance.max.set('2026-12-02T17:50');
    f.componentInstance.value.set('2026-12-02T09:30');
    await settle(f);
    await open(f);
    // The quarters of every day, the one before 09:15 refused on the bound’s day.
    expect(takeable(columnIn('minute'))).toEqual(['15', '30', '45']);
    f.componentInstance.value.set('2026-12-02T17:00');
    await settle(f);
    expect(takeable(columnIn('minute'))).toEqual(['00', '15', '30', '45']);
    expect(takeable(columnIn('hour')).at(-1)).toBe('17');
  });

  it('refuses every row where the move inward crosses — and never hands the columns a reversed pair', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(900);
    f.componentInstance.min.set('2026-12-02T09:05');
    f.componentInstance.max.set('2026-12-02T09:10');
    f.componentInstance.value.set('2026-12-02T09:05');
    await settle(f);
    await open(f);
    expect(takeable(columnIn('hour'))).toEqual([]);
    expect(takeable(columnIn('minute'))).toEqual([]);
    // A `min` at 23:50 leaves its day no quarter at all.
    f.componentInstance.min.set('2026-12-02T23:50');
    f.componentInstance.max.set(undefined);
    await settle(f);
    expect(takeable(columnIn('hour'))).toEqual([]);
  });

  it('reads a reversed pair as no bounds at all, and says so in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T22:00');
    f.componentInstance.max.set('2026-12-02T06:00');
    f.componentInstance.value.set('2026-12-02T12:00');
    await settle(f);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[pct-datetime] min=2026-12-02T22:00 is later than max=',
      ),
    );
    await open(f);
    expect(takeable(columnIn('hour'))).toHaveLength(24);
    expect(dayIn('1 December 2026')?.hasAttribute('aria-disabled')).toBe(false);
    warn.mockRestore();
  });

  it('does not rewrite a value outside the bounds, nor one off the step', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T09:00');
    f.componentInstance.step.set(900);
    await settle(f);
    await type(f, timeText(f), '08:07');
    await leave(f, timeText(f), dayText(f));
    expect(f.componentInstance.value()).toBe('2026-12-01T08:07');
    expect(shown(timeText(f))).toBe('08:07');
  });

  it('reads a bound that is not a datetime as no bound at all', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02 09:00');
    f.componentInstance.value.set('2026-12-01T12:00');
    await settle(f);
    await open(f);
    expect(dayIn('1 December 2026')?.hasAttribute('aria-disabled')).toBe(false);
    expect(takeable(columnIn('hour'))).toHaveLength(24);
  });
});

describe('PctDatetime — the predicates', () => {
  it('hands dateDisabled to the calendar as it is', async () => {
    const f = await render(Host);
    f.componentInstance.dateDisabled.set((day) => day === '2026-12-25');
    await settle(f);
    await open(f);
    expect(dayIn('25 December 2026')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
  });

  it('asks datetimeDisabled of every time of the chosen day, with the day in it, and never of the grid', async () => {
    const asked: string[] = [];
    const f = await render(Host);
    f.componentInstance.step.set(900);
    f.componentInstance.datetimeDisabled.set((value) => {
      asked.push(value);
      return value.startsWith('2026-12-01T10:');
    });
    await settle(f);
    await open(f);
    expect(asked).toHaveLength(96);
    expect(asked.every((value) => value.startsWith('2026-12-01T'))).toBe(true);
    expect(takeable(columnIn('hour'))).not.toContain('10');
    expect(takeable(columnIn('hour'))).toHaveLength(23);
    // The day itself is still a day the grid offers.
    expect(dayIn('1 December 2026')?.hasAttribute('aria-disabled')).toBe(false);

    // Another day is asked afresh.
    asked.length = 0;
    await key(f, gridIn(), 'ArrowRight');
    await key(f, gridIn(), 'Enter');
    expect(asked.every((value) => value.startsWith('2026-12-02T'))).toBe(true);
    expect(takeable(columnIn('hour'))).toHaveLength(24);
  });

  it('asks nothing while there is no day to ask about', async () => {
    const asked: string[] = [];
    const f = await render(Host);
    f.componentInstance.value.set(null);
    f.componentInstance.datetimeDisabled.set((value) => {
      asked.push(value);
      return true;
    });
    await settle(f);
    await open(f);
    expect(asked).toEqual([]);
    expect(takeable(columnIn('hour'))).toHaveLength(24);
  });
});

describe('PctDatetime — the step', () => {
  it('lists the seconds where the step has them, and reads a step it cannot list as 60, said in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render(Host);
    f.componentInstance.step.set(30);
    await settle(f);
    await open(f);
    expect(columnIn('second')).not.toBeNull();
    f.componentInstance.step.set(420);
    await settle(f);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[pct-datetime] step=420'),
    );
    expect(columnIn('second')).toBeNull();
    expect(columnIn('minute').querySelectorAll('[role="option"]')).toHaveLength(
      60,
    );
    warn.mockRestore();
  });
});

describe('PctDatetime — the chrome it draws when there is none around it', () => {
  it('draws its own label, the required marker and the hint, and describes both texts by it', async () => {
    const f = await render(Host);
    f.componentInstance.hint.set('When it begins');
    f.componentInstance.required.set(true);
    await settle(f);
    const label = part(f, 'label') as HTMLLabelElement;
    expect(label.textContent).toContain('Starts');
    expect(label.querySelector('span')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    const hint = part(f, 'hint') as HTMLElement;
    expect(hint.textContent?.trim()).toBe('When it begins');
    for (const control of textsOf(f)) {
      expect(control.required).toBe(true);
      expect(control.getAttribute('aria-describedby')).toBe(hint.id);
    }
  });

  it('gives the one message line to the error, announces it, and marks both texts', async () => {
    @Component({
      imports: [PctDatetime],
      template: `<pct-datetime
        label="Starts"
        hint="When it begins"
        value="2026-12-01T13:05"
        [invalid]="true"
        [touched]="true"
        [errors]="errors"
      />`,
    })
    class Invalid {
      readonly errors = [{ kind: 'demo', message: 'Pick a later slot' }];
    }

    const f = await render(Invalid);
    const error = part(f, 'error') as HTMLElement;
    expect(error.textContent?.trim()).toBe('Pick a later slot');
    expect(error.getAttribute('role')).toBe('alert');
    expect(part(f, 'hint')).toBeNull();
    for (const control of textsOf(f)) {
      expect(control.getAttribute('aria-describedby')).toBe(error.id);
      expect(control.getAttribute('aria-invalid')).toBe('true');
    }
    expect(hostOf(f).hasAttribute('data-pct-invalid')).toBe(true);
  });

  it('draws the warning line in the warning tone, after an error and before a hint (0087)', async () => {
    @Component({
      imports: [PctDatetime],
      template: `<pct-datetime
        label="Starts"
        hint="When it begins"
        [touched]="true"
        [warnings]="warnings"
      />`,
    })
    class Warned {
      readonly warnings = [{ kind: 'late', message: 'Rather late' }];
    }

    const f = await render(Warned);
    const warning = part(f, 'warning') as HTMLElement;
    expect(warning.textContent).toContain('Rather late');
    expect(warning.getAttribute('role')).toBe('status');
    expect(dayText(f).getAttribute('aria-describedby')).toBe(warning.id);
    expect(dayText(f).hasAttribute('aria-invalid')).toBe(false);
    expect(hostOf(f).hasAttribute('data-pct-warning')).toBe(true);
  });

  it('carries the value as the platform writes it under the native name, and no name by default', async () => {
    @Component({
      imports: [PctDatetime],
      template: `<pct-datetime
          name="startsAt"
          [(value)]="value"
          locale="en-GB"
        /><pct-datetime />`,
    })
    class Named {
      readonly value = signal<PctDateTime | null>('2026-12-01T13:05');
    }

    const f = await render(Named);
    const hidden = Array.from(
      f.nativeElement.querySelectorAll('input[type="hidden"]'),
    ) as HTMLInputElement[];
    expect(hidden).toHaveLength(1);
    expect(hidden[0].name).toBe('startsAt');
    expect(hidden[0].value).toBe('2026-12-01T13:05');
    for (const control of textsOf(f))
      expect(control.hasAttribute('name')).toBe(false);
  });

  it('takes junk back on reset, and the value it leaves is the one it held — none', async () => {
    const f = await render(Host);
    await type(f, dayText(f), 'soon');
    await leave(f, dayText(f), timeText(f));
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;
    field.reset();
    await settle(f);
    expect(dayText(f).value).toBe('');
    expect(timeText(f).value).toBe('');
    expect(f.componentInstance.value()).toBeNull();
    expect(errorOf(f)).toBeNull();
  });

  it('focuses the text that stands first', async () => {
    const f = await render(Host);
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;
    field.focus();
    expect(document.activeElement).toBe(dayText(f));
    f.componentInstance.locale.set('vi-VN');
    await settle(f);
    field.focus();
    expect(document.activeElement).toBe(timeText(f));
  });
});

describe('PctDatetime — inside the chrome', () => {
  it('takes the chrome’s label for both texts with a word each, and its description', async () => {
    const f = await render(InField);
    const label = part(f, 'field-label') as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(dayText(f).id);
    expect(dayText(f).getAttribute('aria-labelledby')?.split(' ')[0]).toBe(
      label.id,
    );
    expect(timeText(f).getAttribute('aria-labelledby')?.split(' ')[0]).toBe(
      label.id,
    );
    const hint = part(f, 'field-hint') as HTMLElement;
    for (const control of textsOf(f))
      expect(control.getAttribute('aria-describedby')).toBe(hint.id);
    expect(part(f, 'label')).toBeNull();
    expect(hostOf(f).hasAttribute('data-pct-in-field')).toBe(true);
  });

  it('hands the chrome its own sentence for the message line', async () => {
    const f = await render(InField);
    await type(f, dayText(f), 'soon');
    await leave(f, dayText(f), timeText(f));
    expect(part(f, 'field-error')?.textContent?.trim()).toBe('Not a date');
  });
});

describe('PctDatetime — the review’s cases', () => {
  it('says nothing about a half emptied mid-edit, after a whole pair was left — only on the next leaving', async () => {
    const f = await render(Host);
    await leave(f, timeText(f), null);
    expect(errorOf(f)).toBeNull();
    // Back in the field, the time emptied: the pair is half filled, and nobody has left yet.
    await type(f, timeText(f), '');
    expect(errorOf(f)).toBeNull();
    expect(timeText(f).hasAttribute('aria-invalid')).toBe(false);
    await leave(f, timeText(f), null);
    expect(errorOf(f)).toBe('Enter both a date and a time');
  });

  it('does not speak up again when a pair made whole is emptied by half once more', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    await leave(f, dayText(f), null);
    expect(errorOf(f)).toBe('Enter both a date and a time');
    // The panel completes the pair, and the sentence goes with it ...
    await open(f);
    await key(f, columnIn('hour'), 'Enter');
    expect(f.componentInstance.value()).not.toBeNull();
    expect(errorOf(f)).toBeNull();
    // ... and a half emptied afterwards waits for the next leaving.
    await type(f, timeText(f), '');
    expect(errorOf(f)).toBeNull();
  });

  it('takes the time’s report back on the first keystroke in the time', async () => {
    const f = await render(Host);
    await type(f, timeText(f), '25:99');
    await leave(f, timeText(f), dayText(f));
    expect(errorOf(f)).toBe('Not a time');
    await type(f, timeText(f), '25:9');
    expect(errorOf(f)).toBeNull();
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });

  it('opens on the month the junk names in a language that writes the month first', async () => {
    const f = await render(Host);
    f.componentInstance.locale.set('en-US');
    await settle(f);
    await type(f, dayText(f), '02/31/2026');
    await leave(f, dayText(f), timeText(f));
    await open(f);
    expect(captionIn()).toBe('February 2026');
  });

  it('lists the one time a window of one on-step time holds — not a crossing', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(900);
    f.componentInstance.min.set('2026-12-02T09:00');
    f.componentInstance.max.set('2026-12-02T09:00');
    f.componentInstance.value.set('2026-12-02T09:00');
    await settle(f);
    await open(f);
    expect(takeable(columnIn('hour'))).toEqual(['09']);
    expect(takeable(columnIn('minute'))).toEqual(['00']);
  });

  it('reads min equal to max as a window, with no warning', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render(Host);
    f.componentInstance.min.set('2026-12-02T12:00');
    f.componentInstance.max.set('2026-12-02T12:00:00');
    f.componentInstance.value.set('2026-12-02T12:00');
    await settle(f);
    await open(f);
    expect(warn).not.toHaveBeenCalled();
    expect(dayIn('1 December 2026')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(dayIn('3 December 2026')?.getAttribute('aria-disabled')).toBe(
      'true',
    );
    expect(takeable(columnIn('hour'))).toEqual(['12']);
    warn.mockRestore();
  });

  it('refuses a step of a whole day, and says so in dev mode — one time a day is a date field', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render(Host);
    f.componentInstance.step.set(86_400);
    await settle(f);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '[pct-datetime] step=86400 is not a step this field lists',
      ),
    );
    await open(f);
    expect(columnIn('minute').querySelectorAll('[role="option"]')).toHaveLength(
      60,
    );
    // Half a day is still a step it lists.
    warn.mockClear();
    f.componentInstance.step.set(43_200);
    await settle(f);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('settles a half still being typed before the panel opens over it, and keeps focus in the grid', async () => {
    const f = await render(Host);
    dayText(f).focus();
    await type(f, dayText(f), '31/02/2026');
    // The button's press keeps focus in the text; the click opens the panel.
    toggleOf(f).dispatchEvent(
      new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
    );
    await open(f);
    expect(captionIn()).toBe('February 2026');
    expect(document.activeElement).toBe(cursorIn());
    expect(errorOf(f)).toBe('Not a date');
    // The same with a half typed and not junk: the panel opens on the day typed.
    await key(f, gridIn(), 'Escape');
    dayText(f).focus();
    await type(f, dayText(f), '15/03/2027');
    await open(f);
    expect(captionIn()).toBe('March 2027');
    expect(document.activeElement).toBe(cursorIn());
  });

  it('keeps focus where it is on a press of the button — Safari focuses no button', async () => {
    const f = await render(Host);
    const press = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    toggleOf(f).dispatchEvent(press);
    expect(press.defaultPrevented).toBe(true);
  });

  it('submits nothing from a disabled field, and nothing for a value that is not a datetime', async () => {
    @Component({
      imports: [PctDatetime],
      template: `<pct-datetime
        name="startsAt"
        [(value)]="value"
        [disabled]="disabled()"
      />`,
    })
    class Named {
      readonly value = signal<PctDateTime | null>('2026-12-01T13:05');
      readonly disabled = signal(false);
    }

    const f = await render(Named);
    const hidden = () =>
      f.nativeElement.querySelector('input[type="hidden"]') as HTMLInputElement;
    expect(hidden().disabled).toBe(false);
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(hidden().disabled).toBe(true);
    f.componentInstance.disabled.set(false);
    f.componentInstance.value.set('2026-12-01T13:05+01:00');
    await settle(f);
    expect(hidden().value).toBe('');
  });

  it('takes back a half being typed on reset, and shows the pair the field holds', async () => {
    const f = await render(Host);
    // A two-digit year is a day already, so the pair moved with it; the text is not that day
    // written out yet.
    await type(f, dayText(f), '2/1/20');
    expect(f.componentInstance.value()).toBe('2020-01-02T13:05');
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;
    field.reset();
    await settle(f);
    // The value is the form's, and the texts are the field's: the reset rewrites the ones from
    // the other instead of emptying all three.
    expect(f.componentInstance.value()).toBe('2020-01-02T13:05');
    expect(shown(dayText(f))).toBe('02/01/2020');
    expect(shown(timeText(f))).toBe('13:05');
  });

  it('takes back a time being typed on reset, and shows the time the field holds', async () => {
    const f = await render(Host);
    // `13:0` is most of the way to a time and is none yet, so the pair stands.
    await type(f, timeText(f), '13:0');
    expect(f.componentInstance.value()).toBe('2026-12-01T13:05');
    expect(timeText(f).value).toBe('13:0');
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;

    field.reset();
    await settle(f);

    expect(f.componentInstance.value()).toBe('2026-12-01T13:05');
    expect(shown(timeText(f))).toBe('13:05');
  });

  it('keeps a half-filled field under a null from outside — the model held null already — and reset takes it back', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    await type(f, dayText(f), '24/12/2026');
    await leave(f, dayText(f), null);
    f.componentInstance.value.set(null);
    await settle(f);
    expect(shown(dayText(f))).toBe('24/12/2026');
    const field = f.debugElement.query((node) => node.name === 'pct-datetime')
      .componentInstance as PctDatetime;
    field.reset();
    await settle(f);
    expect(dayText(f).value).toBe('');
    expect(errorOf(f)).toBeNull();
  });
});

/**
 * Forms, each from a NON-EMPTY value: a field that only ever started empty is a field whose
 * first write nobody watched (`lesson-26`).
 */
describe('PctDatetime — the forms that bind it', () => {
  it('works with [formField], from the model’s value and back into it', async () => {
    @Component({
      imports: [PctDatetime, FormField],
      template: `<pct-datetime [formField]="f.startsAt" locale="en-GB" />`,
    })
    class Signal {
      readonly model = signal<{ startsAt: PctDateTime | null }>({
        startsAt: '2026-12-01T09:30',
      });
      readonly f = form(this.model, (p) => {
        required(p.startsAt);
      });
    }

    const f = await render(Signal);
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(shown(timeText(f))).toBe('09:30');
    expect(dayText(f).required).toBe(true);

    await type(f, timeText(f), '14:15');
    await leave(f, timeText(f), null);
    expect(f.componentInstance.model().startsAt).toBe('2026-12-01T14:15');
    expect(f.componentInstance.f.startsAt().touched()).toBe(true);

    // A half emptied is `null` to the form, and the field says what is missing.
    await type(f, timeText(f), '');
    await leave(f, timeText(f), null);
    expect(f.componentInstance.model().startsAt).toBeNull();
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(errorOf(f)).toBe('Enter both a date and a time');

    // The form's own reset reaches the control's: a half-filled field the model's `null` could
    // not clear is taken back by it.
    f.componentInstance.f.startsAt().reset(null);
    await settle(f);
    expect(dayText(f).value).toBe('');
    expect(errorOf(f)).toBeNull();
  });

  it("a form's reset keeps the pair the form holds, and one given a pair shows it", async () => {
    @Component({
      imports: [PctDatetime, FormField],
      template: `<pct-datetime [formField]="f.startsAt" locale="en-GB" />`,
    })
    class Signal {
      readonly model = signal<{ startsAt: PctDateTime | null }>({
        startsAt: '2026-12-01T09:30',
      });
      readonly f = form(this.model);
    }

    const f = await render(Signal);
    await type(f, timeText(f), '14:15');
    await leave(f, timeText(f), null);
    expect(f.componentInstance.f.startsAt().dirty()).toBe(true);

    // Angular's reset does not change the model; the control's own reset emptied it, and was
    // counted as an edit.
    f.componentInstance.f().reset();
    await settle(f);
    expect(f.componentInstance.model().startsAt).toBe('2026-12-01T14:15');
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(shown(timeText(f))).toBe('14:15');
    expect(f.componentInstance.f.startsAt().dirty()).toBe(false);

    // The form sets the pair and then calls the control's reset, which wrote `null` after it.
    f.componentInstance.f().reset({ startsAt: '2026-01-02T07:15' });
    await settle(f);
    expect(f.componentInstance.model().startsAt).toBe('2026-01-02T07:15');
    expect(shown(dayText(f))).toBe('02/01/2026');
    expect(shown(timeText(f))).toBe('07:15');
    expect(f.componentInstance.f.startsAt().dirty()).toBe(false);
  });

  it('works with [formControl]', async () => {
    @Component({
      imports: [PctDatetime, ReactiveFormsModule],
      template: `<pct-datetime [formControl]="ctrl" locale="en-GB" />`,
    })
    class Reactive {
      readonly ctrl = new FormControl<PctDateTime | null>('2026-12-01T09:30');
    }

    const f = await render(Reactive);
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(shown(timeText(f))).toBe('09:30');

    await type(f, dayText(f), '02/12/2026');
    await leave(f, dayText(f), null);
    expect(f.componentInstance.ctrl.value).toBe('2026-12-02T09:30');

    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(dayText(f).disabled).toBe(true);
  });

  it('works with [(ngModel)]', async () => {
    @Component({
      imports: [PctDatetime, FormsModule],
      template: `<pct-datetime [(ngModel)]="value" locale="en-GB" />`,
    })
    class Template {
      value: PctDateTime | null = '2026-12-01T09:30';
    }

    const f = await render(Template);
    await f.whenStable();
    expect(shown(dayText(f))).toBe('01/12/2026');
    expect(shown(timeText(f))).toBe('09:30');

    await type(f, timeText(f), '14:15');
    await leave(f, timeText(f), null);
    expect(f.componentInstance.value).toBe('2026-12-01T14:15');
  });

  it('shows nothing for a value that is not a datetime', async () => {
    const f = await render(Host);
    // `lesson-117`: the bridge writes what the model's type forbids, and no compiler, no gate
    // and no engine says a word about it.
    f.componentInstance.value.set('' as PctDateTime);
    await settle(f);
    expect(dayText(f).value).toBe('');
    expect(timeText(f).value).toBe('');
    f.componentInstance.value.set('2026-12-01T13:05+01:00');
    await settle(f);
    expect(dayText(f).value).toBe('');
  });
});
