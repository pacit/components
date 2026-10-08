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
  type ValidationError,
} from '@angular/forms/signals';
import { providePctTexts } from '@pacit/components/core';
import { PctField } from '@pacit/components/field';

import { PctTimeOfDay } from './time';
import { PctTime } from './time-field';

const controlOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="control"]',
  ) as HTMLInputElement;

/**
 * What the field shows, with node's narrow no-break space before a day period read as the space
 * every browser writes there (0086, D4): the unit suite reads node's ICU, and the character is
 * node's choice, not the field's — the field writes what its formatter's parts say.
 */
const shown = (f: ComponentFixture<unknown>) =>
  controlOf(f).value.replace(/\u202f/g, ' ');

const hintOf = (f: ComponentFixture<unknown>) =>
  controlOf(f)
    .getAttribute('placeholder')
    ?.replace(/\u202f/g, ' ') ?? null;

const toggleOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="toggle"]',
  ) as HTMLButtonElement;

const hostOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('pct-time') as HTMLElement;

/** The panel renders in a CDK overlay — outside the component tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const columnIn = (field: string) =>
  document.querySelector(
    `[data-pct-part="panel"] [data-pct-part="column"][data-pct-field="${field}"]`,
  ) as HTMLElement;

const activeIn = (list: HTMLElement) =>
  list
    .querySelector(`#${list.getAttribute('aria-activedescendant')}`)
    ?.textContent?.trim();

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

async function type(f: ComponentFixture<unknown>, text: string) {
  const control = controlOf(f);
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  await settle(f);
}

async function blur(f: ComponentFixture<unknown>) {
  controlOf(f).dispatchEvent(new Event('blur', { bubbles: true }));
  await settle(f);
}

async function open(f: ComponentFixture<unknown>) {
  toggleOf(f).click();
  await settle(f);
}

@Component({
  imports: [PctTime],
  template: `<pct-time
    [(value)]="value"
    [label]="label()"
    [hint]="hint()"
    [locale]="locale()"
    [min]="min()"
    [max]="max()"
    [step]="step()"
    [disabled]="disabled()"
    [readonly]="readonly()"
    [required]="required()"
    [showFormat]="showFormat()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    (touch)="touched.set(true)"
  />`,
})
class Host {
  readonly value = signal<PctTimeOfDay | null>('13:05');
  readonly label = signal('Starts at');
  readonly hint = signal('');
  readonly locale = signal('en-US');
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly step = signal(60);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly showFormat = signal(true);
  readonly touched = signal(false);
  readonly invalid = signal(false);
  readonly errors = signal<readonly ValidationError.WithOptionalFieldTree[]>(
    [],
  );
}

@Component({
  imports: [PctTime, PctField],
  template: `<pct-field label="Starts at" hint="When it begins">
    <pct-time [(value)]="value" />
  </pct-field>`,
})
class InField {
  readonly value = signal<PctTimeOfDay | null>('13:05');
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

describe('PctTime — the text the field shows', () => {
  it('writes the value on the clock of the language the field is in', async () => {
    const f = await render(Host);
    expect(shown(f)).toBe('1:05 PM');

    f.componentInstance.locale.set('en-GB');
    await settle(f);
    expect(shown(f)).toBe('13:05');

    // A clock forced on a reader is a locale too — there is no `hourCycle` input (0086 §3).
    f.componentInstance.locale.set('en-US-u-hc-h23');
    await settle(f);
    expect(shown(f)).toBe('13:05');
  });

  it('is empty when the value is', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    await settle(f);
    expect(shown(f)).toBe('');
  });

  it('shows the FORMAT while it is empty, in the language’s own order and words', async () => {
    const f = await render(Host);
    expect(hintOf(f)).toBe('h:mm AM/PM');

    f.componentInstance.locale.set('ko-KR');
    await settle(f);
    expect(hintOf(f)).toBe('오전/오후 h:mm');

    f.componentInstance.locale.set('en-GB');
    await settle(f);
    expect(hintOf(f)).toBe('hh:mm');
  });

  it('shows the seconds in the hint where the step has them', async () => {
    const f = await render(Host);
    f.componentInstance.locale.set('en-GB');
    f.componentInstance.step.set(15);
    await settle(f);
    expect(hintOf(f)).toBe('hh:mm:ss');
  });

  it('writes the hint with the letters the texts channel gives it — the order stays the field’s', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({
          // Marks rather than letters, so that no dictionary reads the hint as a word of some
          // language — what is asserted is only where each one lands.
          timeHourLetter: '#',
          timeMinuteLetter: '%',
          timeSecondLetter: '&',
        }),
      ],
    });
    const f = await render(Host);
    expect(hintOf(f)).toBe('#:%% AM/PM');
    f.componentInstance.step.set(1);
    await settle(f);
    expect(hintOf(f)).toBe('#:%%:&& AM/PM');
  });

  it('can be told to show no format at all', async () => {
    const f = await render(Host);
    f.componentInstance.showFormat.set(false);
    await settle(f);
    expect(hintOf(f)).toBeNull();
  });

  it('does not rewrite what is being typed', async () => {
    const f = await render(Host);
    await type(f, '2 pm');
    expect(f.componentInstance.value()).toBe('14:00');
    expect(shown(f)).toBe('2 pm');
  });

  it('writes the canonical text back on commit', async () => {
    const f = await render(Host);
    await type(f, '1430');
    await blur(f);
    expect(f.componentInstance.value()).toBe('14:30');
    expect(shown(f)).toBe('2:30 PM');
  });

  it('writes the value in the field’s shape: seconds where the step has them', async () => {
    const f = await render(Host);
    f.componentInstance.step.set(30);
    await settle(f);
    await type(f, '14:30');
    await blur(f);
    expect(f.componentInstance.value()).toBe('14:30:00');
    expect(shown(f)).toBe('2:30:00 PM');
  });

  it('keeps seconds typed into a field of minutes — a time off its step, not junk', async () => {
    const f = await render(Host);
    await type(f, '14:30:15');
    await blur(f);
    expect(f.componentInstance.value()).toBe('14:30:15');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });
});

describe('PctTime — junk in the field', () => {
  it('keeps what was typed and says it is not a time', async () => {
    const f = await render(Host);
    await type(f, 'teatime');
    await blur(f);

    expect(shown(f)).toBe('teatime');
    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).getAttribute('aria-invalid')).toBe('true');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(true);
  });

  it('says it is not a time in the message line, ahead of the form', async () => {
    const f = await render(Host);
    f.componentInstance.invalid.set(true);
    f.componentInstance.errors.set([
      requiredError({ message: 'Start time is required' }),
    ]);
    await type(f, '25:00');
    await blur(f);

    const error = f.nativeElement.querySelector(
      '[data-pct-part="error"]',
    ) as HTMLElement | null;
    expect(error?.textContent?.trim()).toBe('Not a time');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(error?.id);

    await type(f, '9:30');
    await blur(f);
    expect(
      f.nativeElement
        .querySelector('[data-pct-part="error"]')
        ?.textContent?.trim(),
    ).toBe('Start time is required');
  });

  it('says it in the language the application gave it', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ timeMalformed: 'Pas une heure' }),
      ],
    });
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    expect(
      f.nativeElement
        .querySelector('[data-pct-part="error"]')
        ?.textContent?.trim(),
    ).toBe('Pas une heure');
  });

  it('says nothing about a time half-typed', async () => {
    const f = await render(Host);
    await type(f, '13:');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });

  it('takes the report back the moment a time is typed', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    await type(f, '9:30');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('takes the report back when a value arrives from outside', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(true);

    f.componentInstance.value.set('09:30');
    await settle(f);
    expect(shown(f)).toBe('9:30 AM');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('empties to null, with nothing reported', async () => {
    const f = await render(Host);
    await type(f, '   ');
    await blur(f);
    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('refuses a time the clock does not have rather than rolling it over', async () => {
    const f = await render(Host);
    await type(f, '24:00');
    await blur(f);
    expect(f.componentInstance.value()).toBeNull();
    expect(shown(f)).toBe('24:00');
  });

  it('reports nothing while disabled', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });

  it('marks the field touched when it is left', async () => {
    const f = await render(Host);
    await blur(f);
    expect(f.componentInstance.touched()).toBe(true);
  });

  it('empties the field, the text and the time alike, on reset', async () => {
    @Component({
      imports: [PctTime],
      template: `<pct-time #t [(value)]="value" />`,
    })
    class Resettable {
      readonly value = signal<PctTimeOfDay | null>('13:05');
    }
    const f = await render(Resettable);
    await type(f, 'junk');
    await blur(f);
    const time = f.debugElement.children[0].componentInstance as PctTime;
    time.reset();
    await settle(f);
    expect(f.componentInstance.value()).toBeNull();
    expect(shown(f)).toBe('');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(false);
  });
});

describe('PctTime — the bounds and the step', () => {
  it('does not rewrite a time outside the bounds, nor one off the step', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('09:00');
    f.componentInstance.max.set('17:00');
    f.componentInstance.step.set(900);
    await settle(f);

    await type(f, '18:05');
    await blur(f);
    // A bound clamps a MOVEMENT, and a time somebody wrote out is not one; the step decides
    // what the columns offer and nothing about typed text (0086 §5).
    expect(f.componentInstance.value()).toBe('18:05');
    expect(shown(f)).toBe('6:05 PM');
  });

  it('reads a bound that is not a time as no bound at all', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('nine');
    f.componentInstance.locale.set('en-GB');
    await settle(f);
    await open(f);
    expect(
      columnIn('hour').querySelectorAll('[aria-disabled="true"]'),
    ).toHaveLength(0);
  });

  it('reads a step it cannot list as 60, and says so in dev mode', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const f = await render(Host);
    f.componentInstance.step.set(420);
    await settle(f);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[pct-time] step=420'),
    );
    // The columns are handed the step read as 60, so the mistake is said once and not twice.
    await open(f);
    expect(
      warn.mock.calls.filter(([m]) => String(m).includes('pct-time-columns')),
    ).toHaveLength(0);
    expect(columnIn('minute').querySelectorAll('[role="option"]')).toHaveLength(
      60,
    );
    // And the hint has no seconds: 420 does not divide a minute, but it is not read as one.
    expect(hintOf(f)).toBe('h:mm AM/PM');
    warn.mockRestore();
  });
});

describe('PctTime — the panel', () => {
  it('opens from the button and says so on it', async () => {
    const f = await render(Host);
    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(toggleOf(f).getAttribute('aria-haspopup')).toBe('dialog');
    expect(toggleOf(f).hasAttribute('aria-controls')).toBe(false);

    await open(f);

    expect(panel()).not.toBeNull();
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('true');
    expect(toggleOf(f).getAttribute('aria-controls')).toBe(panel()?.id);
    expect(hostOf(f).hasAttribute('data-pct-open')).toBe(true);
  });

  it('names the button and the panel it opens with one string', async () => {
    const f = await render(Host);
    expect(toggleOf(f).getAttribute('aria-label')).toBe('Choose time');
    await open(f);
    expect(panel()?.getAttribute('aria-label')).toBe('Choose time');
  });

  it('takes the name from the texts channel when one is given', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ timeOpen: 'Choisir une heure' }),
      ],
    });
    const f = await render(Host);
    expect(toggleOf(f).getAttribute('aria-label')).toBe('Choisir une heure');
  });

  it('opens on the time the field holds, with focus on the hour', async () => {
    const f = await render(Host);
    await open(f);
    expect(activeIn(columnIn('hour'))).toBe('1');
    expect(activeIn(columnIn('minute'))).toBe('05');
    expect(activeIn(columnIn('dayPeriod'))).toBe('PM');
    expect(document.activeElement).toBe(columnIn('hour'));
  });

  it('hands the bounds, the step and the language on to the columns', async () => {
    const f = await render(Host);
    f.componentInstance.locale.set('en-GB');
    f.componentInstance.min.set('09:00');
    f.componentInstance.max.set('17:00');
    f.componentInstance.step.set(900);
    await settle(f);
    await open(f);
    const takeable = columnIn('hour').querySelectorAll(
      '[role="option"]:not([aria-disabled="true"])',
    );
    expect(takeable).toHaveLength(9);
    expect(columnIn('minute').querySelectorAll('[role="option"]')).toHaveLength(
      4,
    );
  });

  it('writes the time a column moves to, and keeps the panel open', async () => {
    const f = await render(Host);
    await open(f);
    columnIn('minute').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toBe('13:06');
    expect(shown(f)).toBe('1:06 PM');
    expect(panel()).not.toBeNull();
  });

  it('closes on the time it is given with Enter, and hands focus back', async () => {
    const f = await render(Host);
    await open(f);
    columnIn('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    await settle(f);
    columnIn('hour').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    await settle(f);
    expect(f.componentInstance.value()).toBe('14:05');
    expect(shown(f)).toBe('2:05 PM');
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(controlOf(f));
  });

  it('closes on Escape', async () => {
    const f = await render(Host);
    await open(f);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    columnIn('hour').dispatchEvent(escape);
    await settle(f);
    expect(panel()).toBeNull();
    expect(escape.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(controlOf(f));
  });

  /**
   * The panel is a child of `body`, so the DOM's own answer to Tab off its last stop is "the
   * end of the document". The trap is therefore not a loop but a WAY OUT.
   */
  describe('Tab leaves the panel rather than walking off the page', () => {
    const stopsIn = (root: HTMLElement) =>
      Array.from(
        root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [tabindex="0"]',
        ),
      );

    const tab = async (
      f: ComponentFixture<unknown>,
      from: HTMLElement,
      shiftKey: boolean,
    ) => {
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey,
        bubbles: true,
        cancelable: true,
      });
      from.dispatchEvent(event);
      await settle(f);
      return event;
    };

    it('has a stop per column', async () => {
      const f = await render(Host);
      await open(f);
      expect(stopsIn(panel() as HTMLElement)).toHaveLength(3);
    });

    it('forward off the last stop', async () => {
      const f = await render(Host);
      await open(f);
      const stops = stopsIn(panel() as HTMLElement);
      const event = await tab(f, stops[stops.length - 1], false);
      expect(panel()).toBeNull();
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(controlOf(f));
    });

    it('backward off the first, and off the panel itself', async () => {
      const f = await render(Host);
      await open(f);
      await tab(f, stopsIn(panel() as HTMLElement)[0], true);
      expect(panel()).toBeNull();

      await open(f);
      await tab(f, panel() as HTMLElement, true);
      expect(panel()).toBeNull();
    });

    it('and stays where the walk is still inside it', async () => {
      const f = await render(Host);
      await open(f);
      const stops = stopsIn(panel() as HTMLElement);
      const forward = await tab(f, stops[0], false);
      expect(panel()).not.toBeNull();
      expect(forward.defaultPrevented).toBe(false);
      await tab(f, stops[stops.length - 1], true);
      expect(panel()).not.toBeNull();
    });
  });

  it('closes on the button that opened it', async () => {
    const f = await render(Host);
    await open(f);
    await open(f);
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(controlOf(f));
  });

  it('closes on a press outside, and leaves focus where the press landed', async () => {
    const f = await render(Host);
    await open(f);
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await settle(f);
    expect(panel()).toBeNull();
    expect(document.activeElement).not.toBe(controlOf(f));
  });

  it('is not opened by a disabled or a read-only field', async () => {
    const f = await render(Host);
    f.componentInstance.disabled.set(true);
    await settle(f);
    expect(toggleOf(f).disabled).toBe(true);
    expect(controlOf(f).disabled).toBe(true);
    expect(hostOf(f).hasAttribute('data-pct-disabled')).toBe(true);

    f.componentInstance.disabled.set(false);
    f.componentInstance.readonly.set(true);
    await settle(f);
    expect(toggleOf(f).disabled).toBe(true);
    expect(controlOf(f).readOnly).toBe(true);
  });
});

describe('PctTime — the chrome it draws when there is none around it', () => {
  it('draws its own label, the required marker and the hint', async () => {
    const f = await render(Host);
    f.componentInstance.hint.set('Any time today');
    f.componentInstance.required.set(true);
    await settle(f);

    const label = f.nativeElement.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(controlOf(f).id);
    expect(label.textContent).toContain('Starts at');
    expect(label.querySelector('span')?.getAttribute('aria-hidden')).toBe(
      'true',
    );
    expect(controlOf(f).required).toBe(true);

    const hint = f.nativeElement.querySelector(
      '[data-pct-part="hint"]',
    ) as HTMLElement;
    expect(hint.textContent?.trim()).toBe('Any time today');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('gives the one message line to the error, and announces it from there', async () => {
    @Component({
      imports: [PctTime],
      template: `<pct-time
        label="Starts at"
        hint="Any time today"
        [invalid]="true"
        [touched]="true"
        [errors]="errors"
      />`,
    })
    class Invalid {
      readonly errors = [{ kind: 'demo', message: 'Pick a time' }];
    }

    const f = await render(Invalid);
    const error = f.nativeElement.querySelector(
      '[data-pct-part="error"]',
    ) as HTMLElement;
    expect(error.textContent?.trim()).toBe('Pick a time');
    expect(f.nativeElement.querySelector('[data-pct-part="hint"]')).toBeNull();
    expect(error.getAttribute('role')).toBe('alert');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(error.id);
    expect(controlOf(f).getAttribute('aria-invalid')).toBe('true');
    expect(hostOf(f).hasAttribute('data-pct-invalid')).toBe(true);
  });

  it('draws the warning line in the warning tone, after an error and before a hint (0087)', async () => {
    @Component({
      imports: [PctTime],
      template: `<pct-time
        label="Starts at"
        hint="Any time today"
        [touched]="true"
        [warnings]="warnings"
      />`,
    })
    class Warned {
      readonly warnings = [{ kind: 'early', message: 'Rather early' }];
    }

    const f = await render(Warned);
    const warning = f.nativeElement.querySelector(
      '[data-pct-part="warning"]',
    ) as HTMLElement;
    expect(warning.textContent).toContain('Rather early');
    expect(warning.getAttribute('role')).toBe('status');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(warning.id);
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
    expect(hostOf(f).hasAttribute('data-pct-warning')).toBe(true);
  });

  it('names itself through an aria input when it draws no label', async () => {
    @Component({
      imports: [PctTime],
      template: `<span id="slot">Slot</span>
        <pct-time ariaLabel="Start" />
        <pct-time ariaLabelledby="slot" />`,
    })
    class Named {}

    const f = await render(Named);
    const [first, second] = Array.from(
      f.nativeElement.querySelectorAll('[data-pct-part="control"]'),
    ) as HTMLInputElement[];
    expect(first.getAttribute('aria-label')).toBe('Start');
    expect(first.hasAttribute('aria-labelledby')).toBe(false);
    expect(second.getAttribute('aria-labelledby')).toBe('slot');
    expect(second.hasAttribute('aria-label')).toBe(false);
    expect(f.nativeElement.querySelector('[data-pct-part="label"]')).toBeNull();
  });

  it('carries the native name for a form submission, and none by default', async () => {
    @Component({
      imports: [PctTime],
      template: `<pct-time name="startsAt" /><pct-time />`,
    })
    class Named {}

    const f = await render(Named);
    const [first, second] = Array.from(
      f.nativeElement.querySelectorAll('[data-pct-part="control"]'),
    ) as HTMLInputElement[];
    expect(first.getAttribute('name')).toBe('startsAt');
    expect(second.hasAttribute('name')).toBe(false);
  });

  it('is a plain textbox for a numeric keypad, with nothing the browser fills in', async () => {
    const f = await render(Host);
    const control = controlOf(f);
    expect(control.type).toBe('text');
    expect(control.getAttribute('inputmode')).toBe('numeric');
    expect(control.getAttribute('autocomplete')).toBe('off');
    expect(control.hasAttribute('role')).toBe(false);
    expect(control.hasAttribute('aria-expanded')).toBe(false);
  });
});

describe('PctTime — inside the chrome', () => {
  it('hands the label and the description over and keeps the value', async () => {
    const f = await render(InField);
    const control = controlOf(f);
    const label = f.nativeElement.querySelector(
      '[data-pct-part="field-label"]',
    ) as HTMLLabelElement;

    expect(label.getAttribute('for')).toBe(control.id);
    expect(control.getAttribute('aria-describedby')).toBe(
      f.nativeElement.querySelector('[data-pct-part="field-hint"]')?.id,
    );
    // No `locale` on this one, so the field is written in the application's `LOCALE_ID`.
    expect(shown(f)).toBe('1:05 PM');
    expect(f.nativeElement.querySelector('[data-pct-part="label"]')).toBeNull();
    expect(hostOf(f).hasAttribute('data-pct-in-field')).toBe(true);
  });
});

/**
 * Forms, each from a NON-EMPTY value: a field that only ever started empty is a field whose
 * first write nobody watched (`lesson-26` — `FormField` brings an `NgControl` of its own, and a
 * control that took that for classic forms rendered an empty input over a filled model).
 */
describe('PctTime — the forms that bind it', () => {
  it('works with [formField], from the model’s value and back into it', async () => {
    @Component({
      imports: [PctTime, FormField],
      template: `<pct-time [formField]="f.startsAt" />`,
    })
    class Signal {
      readonly model = signal<{ startsAt: PctTimeOfDay | null }>({
        startsAt: '09:30',
      });
      readonly f = form(this.model, (p) => {
        required(p.startsAt);
      });
    }

    const f = await render(Signal);
    expect(shown(f)).toBe('9:30 AM');
    expect(controlOf(f).required).toBe(true);

    await type(f, '14:15');
    await blur(f);
    expect(f.componentInstance.model().startsAt).toBe('14:15');
    expect(f.componentInstance.f.startsAt().touched()).toBe(true);

    // Junk is `null` to the form, and the field says what it is.
    await type(f, 'junk');
    await blur(f);
    expect(f.componentInstance.model().startsAt).toBeNull();
    expect(shown(f)).toBe('junk');
    expect(hostOf(f).hasAttribute('data-pct-malformed')).toBe(true);
  });

  it('works with [formControl]', async () => {
    @Component({
      imports: [PctTime, ReactiveFormsModule],
      template: `<pct-time [formControl]="ctrl" />`,
    })
    class Reactive {
      readonly ctrl = new FormControl<PctTimeOfDay | null>('09:30');
    }

    const f = await render(Reactive);
    expect(shown(f)).toBe('9:30 AM');

    await type(f, '14:15');
    await blur(f);
    expect(f.componentInstance.ctrl.value).toBe('14:15');

    f.componentInstance.ctrl.disable();
    await settle(f);
    expect(controlOf(f).disabled).toBe(true);
  });

  it('works with [(ngModel)]', async () => {
    @Component({
      imports: [PctTime, FormsModule],
      template: `<pct-time [(ngModel)]="value" />`,
    })
    class Template {
      value: PctTimeOfDay | null = '09:30';
    }

    const f = await render(Template);
    await f.whenStable();
    expect(shown(f)).toBe('9:30 AM');

    await type(f, '14:15');
    await blur(f);
    expect(f.componentInstance.value).toBe('14:15');
  });

  it('shows nothing for a value that is not a time', async () => {
    const f = await render(Host);
    // `lesson-117`: the bridge writes what the model's type forbids, and no compiler, no gate
    // and no engine says a word about it.
    f.componentInstance.value.set('' as PctTimeOfDay);
    await settle(f);
    expect(shown(f)).toBe('');
  });
});
