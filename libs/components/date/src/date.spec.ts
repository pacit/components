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
  minDate,
  required,
  requiredError,
  type SchemaPathTree,
  type ValidationError,
} from '@angular/forms/signals';
import { providePctTexts } from '@pacit/components/core';
import { PctField } from '@pacit/components/field';

import { PctDate, pctDayBounds } from './date';
import { PctDay } from './day';

const controlOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="control"]',
  ) as HTMLInputElement;

const toggleOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="toggle"]',
  ) as HTMLButtonElement;

/** The panel renders in a CDK overlay — outside the component tree. */
const panel = () =>
  document.querySelector('[data-pct-part="panel"]') as HTMLElement | null;

const daysInPanel = () =>
  Array.from(
    document.querySelectorAll('[data-pct-part="day"]'),
  ) as HTMLElement[];

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function type(f: ComponentFixture<unknown>, text: string) {
  const control = controlOf(f);
  control.value = text;
  control.dispatchEvent(new Event('input', { bubbles: true }));
  f.detectChanges();
  await f.whenStable();
}

async function blur(f: ComponentFixture<unknown>) {
  controlOf(f).dispatchEvent(new Event('blur', { bubbles: true }));
  f.detectChanges();
  await f.whenStable();
}

@Component({
  imports: [PctDate],
  template: `<pct-date
    [(value)]="value"
    [label]="label()"
    [hint]="hint()"
    [locale]="locale()"
    [min]="min()"
    [max]="max()"
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
  readonly value = signal<PctDay | null>('2026-08-27');
  readonly label = signal('Start date');
  readonly hint = signal('');
  // Spanish, for the same reason the calendar's cases use it: the assertions below name
  // month names out loud, and this repository measures itself for Polish words
  // (`req-project-language`). The ORDER a locale writes a date in is covered in
  // `locale.spec.ts`, where digits and separators are the whole of the assertion.
  readonly locale = signal('es-ES');
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly required = signal(false);
  readonly showFormat = signal(true);
  readonly touched = signal(false);
  invalid = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
}

@Component({
  imports: [PctDate, PctField],
  template: `<pct-field label="Start date" hint="When it begins">
    <pct-date [(value)]="value" />
  </pct-field>`,
})
class InField {
  readonly value = signal<PctDay | null>('2026-08-27');
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

describe('PctDate — the text the field shows', () => {
  it('writes the value in the language the field is in', async () => {
    const f = await render(Host);
    expect(controlOf(f).value).toBe('27/08/2026');

    f.componentInstance.locale.set('en-US');
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).value).toBe('08/27/2026');
  });

  it('is empty when the value is', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).value).toBe('');
  });

  it('shows the FORMAT while it is empty, in the language’s own order', async () => {
    const f = await render(Host);
    expect(controlOf(f).getAttribute('placeholder')).toBe('dd/mm/yyyy');

    f.componentInstance.locale.set('en-US');
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).getAttribute('placeholder')).toBe('mm/dd/yyyy');
  });

  it('writes the hint with the letters the texts channel gives it', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ dateYearLetter: 'r' }),
      ],
    });
    const f = await render(Host);
    expect(controlOf(f).getAttribute('placeholder')).toBe('dd/mm/rrrr');
  });

  it('can be told to show no format at all', async () => {
    const f = await render(Host);
    f.componentInstance.showFormat.set(false);
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).getAttribute('placeholder')).toBeNull();
  });

  it('does not rewrite what is being typed', async () => {
    const f = await render(Host);
    await type(f, '1/12/2026');
    // The value has been read, and the text is still exactly what the user has in front of
    // them — a rewrite here would send the caret to the end on every keystroke.
    expect(f.componentInstance.value()).toBe('2026-12-01');
    expect(controlOf(f).value).toBe('1/12/2026');
  });

  it('writes the canonical text back on commit', async () => {
    const f = await render(Host);
    await type(f, '1/12/2026');
    await blur(f);
    expect(controlOf(f).value).toBe('01/12/2026');
  });
});

describe('PctDate — junk in the field', () => {
  it('keeps what was typed and says it is not a date', async () => {
    const f = await render(Host);
    await type(f, 'not a date');
    await blur(f);

    // The opposite of what `<input type="date">` does: the text stays where the user left
    // it, the value is empty, and the control says so.
    expect(controlOf(f).value).toBe('not a date');
    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).getAttribute('aria-invalid')).toBe('true');
    expect(
      (f.nativeElement.firstElementChild as HTMLElement | null) &&
        f.nativeElement
          .querySelector('pct-date')
          ?.hasAttribute('data-pct-malformed'),
    ).toBe(true);
  });

  /**
   * The sentence, through the contract's second channel (0070): the form sees `null` and
   * calls a required field empty, so its message would stand beside three numbers the user
   * typed. The control's own goes first, in the default wording and in the application's.
   */
  it('says it is not a date in the message line, ahead of the form', async () => {
    const f = await render(Host);
    f.componentInstance.invalid.set(true);
    f.componentInstance.errors.set([
      requiredError({ message: 'Start date is required' }),
    ]);
    await type(f, 'not a date');
    await blur(f);

    const error = f.nativeElement.querySelector(
      '[data-pct-part="error"]',
    ) as HTMLElement | null;
    expect(error?.textContent?.trim()).toBe('Not a date');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(error?.id);

    // A date typed over it takes the sentence back, and the form's own stands again.
    await type(f, '01/12/2026');
    await blur(f);
    expect(
      f.nativeElement
        .querySelector('[data-pct-part="error"]')
        ?.textContent?.trim(),
    ).toBe('Start date is required');
  });

  it('says it in the language the application gave it', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ dateMalformed: 'Pas une date' }),
      ],
    });
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);

    expect(
      f.nativeElement
        .querySelector('[data-pct-part="error"]')
        ?.textContent?.trim(),
    ).toBe('Pas une date');
  });

  it('says nothing about a date half-typed', async () => {
    const f = await render(Host);
    await type(f, '27.0');
    // `27.0` is a third of the way in, not a mistake. Nothing is reported until the field is
    // left.
    expect(
      f.nativeElement
        .querySelector('pct-date')
        ?.hasAttribute('data-pct-malformed'),
    ).toBe(false);
  });

  it('takes the report back the moment a date is typed', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    await type(f, '01/12/2026');
    expect(
      f.nativeElement
        .querySelector('pct-date')
        ?.hasAttribute('data-pct-malformed'),
    ).toBe(false);
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('takes the report back when a value arrives from outside', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    expect(
      f.nativeElement
        .querySelector('pct-date')
        ?.hasAttribute('data-pct-malformed'),
    ).toBe(true);

    // The model is written by the application, not by the field — which is the one thing a
    // commit cannot see. Left to the commit alone, the field stayed red over a date it had
    // just been given.
    f.componentInstance.value.set('2026-12-01');
    f.detectChanges();
    await f.whenStable();

    expect(controlOf(f).value).toBe('01/12/2026');
    expect(
      f.nativeElement
        .querySelector('pct-date')
        ?.hasAttribute('data-pct-malformed'),
    ).toBe(false);
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('empties to null, with nothing reported', async () => {
    const f = await render(Host);
    await type(f, '');
    await blur(f);
    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
  });

  it('refuses a day the calendar does not have rather than rolling it over', async () => {
    const f = await render(Host);
    await type(f, '32/08/2026');
    await blur(f);
    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).value).toBe('32/08/2026');
  });

  it('marks the field touched when it is left', async () => {
    const f = await render(Host);
    await blur(f);
    expect(f.componentInstance.touched()).toBe(true);
  });

  it('takes junk back on reset, and the value it leaves is the one it held', async () => {
    const f = await render(Host);
    await type(f, 'junk');
    await blur(f);
    const date = f.debugElement.children[0].componentInstance as PctDate;

    // The value was `null` already, so the reset moves the rejection and nothing else — and a
    // field that heard only the value went on showing `junk` over an empty one, unreported.
    date.reset();
    f.detectChanges();
    await f.whenStable();

    expect(f.componentInstance.value()).toBeNull();
    expect(controlOf(f).value).toBe('');
    expect(
      f.nativeElement
        .querySelector('pct-date')
        ?.hasAttribute('data-pct-malformed'),
    ).toBe(false);
  });

  it('takes back a date half typed on reset, and shows the date the field holds', async () => {
    const f = await render(Host);
    // A two-digit year is a date already — the guess lands it in 2020 — and the text is not
    // the date written out yet.
    await type(f, '01/12/20');
    expect(f.componentInstance.value()).toBe('2020-12-01');
    const date = f.debugElement.children[0].componentInstance as PctDate;

    date.reset();
    f.detectChanges();
    await f.whenStable();

    // The value is the form's, and the text is the field's: the reset rewrites the one from
    // the other instead of emptying both.
    expect(f.componentInstance.value()).toBe('2020-12-01');
    expect(controlOf(f).value).toBe('01/12/2020');
  });
});

describe('PctDate — the bounds', () => {
  it('does not rewrite a date outside them', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-01-01');
    f.componentInstance.max.set('2026-06-30');
    f.detectChanges();
    await f.whenStable();

    await type(f, '31/12/2026');
    await blur(f);
    // A bound clamps a MOVEMENT, and a date somebody wrote out in full is not one — the
    // one place this control parts company with `[pctNumber]`.
    expect(f.componentInstance.value()).toBe('2026-12-31');
    expect(controlOf(f).value).toBe('31/12/2026');
  });
});

describe('PctDate — the panel', () => {
  it('opens from the button and says so on it', async () => {
    const f = await render(Host);
    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(toggleOf(f).getAttribute('aria-haspopup')).toBe('dialog');

    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();

    expect(panel()).not.toBeNull();
    expect(panel()?.getAttribute('role')).toBe('dialog');
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('true');
    expect(toggleOf(f).getAttribute('aria-controls')).toBe(panel()?.id);
  });

  it('is taken back by a reset, the date stays, and focus held in it comes back to the field', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(panel()?.contains(document.activeElement)).toBe(true);
    const date = f.debugElement.children[0].componentInstance as PctDate;

    // A form put back to its start has no calendar hanging off it — the select's reading. A
    // panel taken out under focus would drop it to `body`.
    date.reset();
    f.detectChanges();
    await f.whenStable();

    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(f.componentInstance.value()).toBe('2026-08-27');
    expect(document.activeElement).toBe(controlOf(f));
  });

  it('leaves focus where it is when a reset closes a panel that does not hold it', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    (document.activeElement as HTMLElement).blur();
    const date = f.debugElement.children[0].componentInstance as PctDate;

    date.reset();
    f.detectChanges();
    await f.whenStable();

    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(document.body);
  });

  it('closes a panel asked for in the same task as the reset, before it is drawn', async () => {
    const f = await render(Host);
    const date = f.debugElement.children[0].componentInstance as PctDate;
    // The press opens the panel and the reset arrives before a render has drawn it.
    toggleOf(f).click();
    date.reset();
    f.detectChanges();
    await f.whenStable();

    expect(panel()).toBeNull();
    expect(toggleOf(f).getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).not.toBe(controlOf(f));
  });

  it('names the button and the panel it opens with one string', async () => {
    const f = await render(Host);
    // The default, because a string the library writes is the library's until somebody
    // translates it — and the button says what it will show, so the panel is that thing.
    expect(toggleOf(f).getAttribute('aria-label')).toBe('Choose date');

    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(panel()?.getAttribute('aria-label')).toBe('Choose date');
  });

  it('takes the name from the texts channel when one is given', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({ dateOpen: 'Choisir une date' }),
      ],
    });
    const f = await render(Host);
    expect(toggleOf(f).getAttribute('aria-label')).toBe('Choisir une date');
  });

  it('opens on the month the value is in', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(
      document.querySelector('[data-pct-part="caption"]')?.textContent?.trim(),
    ).toBe('agosto de 2026');
  });

  it('writes the day it is given and closes', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();

    const first = daysInPanel().find(
      (d) => d.getAttribute('aria-label')?.includes('1 de septiembre') ?? false,
    );
    first?.click();
    f.detectChanges();
    await f.whenStable();

    expect(f.componentInstance.value()).toBe('2026-09-01');
    expect(controlOf(f).value).toBe('01/09/2026');
    expect(panel()).toBeNull();
  });

  it('closes on Escape', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    });
    panel()?.dispatchEvent(escape);
    f.detectChanges();
    await f.whenStable();
    expect(panel()).toBeNull();
    // The press is answered here and nowhere else: a dialog holding this field must not
    // take the same Escape as its own (0024), and a user agent must not act on it either.
    expect(escape.defaultPrevented).toBe(true);
  });

  /**
   * The panel is a child of `body`, so the DOM's own answer to Tab off its last stop is
   * "the end of the document". The trap is therefore not a loop but a WAY OUT: the panel
   * closes and the field keeps the tab order it always had.
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
      from.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey, bubbles: true }),
      );
      f.detectChanges();
      await f.whenStable();
    };

    const open = async () => {
      const f = await render(Host);
      toggleOf(f).click();
      f.detectChanges();
      await f.whenStable();
      return f;
    };

    it('forward off the last stop', async () => {
      const f = await open();
      const stops = stopsIn(panel() as HTMLElement);

      await tab(f, stops[stops.length - 1], false);

      expect(panel()).toBeNull();
    });

    it('backward off the first', async () => {
      const f = await open();
      const stops = stopsIn(panel() as HTMLElement);

      await tab(f, stops[0], true);

      expect(panel()).toBeNull();
    });

    it('and stays where the walk is still inside it', async () => {
      const f = await open();
      const stops = stopsIn(panel() as HTMLElement);

      await tab(f, stops[0], false);

      expect(panel()).not.toBeNull();
    });
  });

  it('closes on the button that opened it', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(panel()).toBeNull();
  });

  it('closes on a press outside, and leaves focus where the press landed', async () => {
    const f = await render(Host);
    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(panel()).not.toBeNull();

    // The CDK reads "outside the panel" as "outside the origin", and the origin is the row
    // the field and its button stand in — so this is a press on the page, not on the control.
    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    f.detectChanges();
    await f.whenStable();
    expect(panel()).toBeNull();
  });

  it('is not opened by a disabled or a read-only field', async () => {
    const f = await render(Host);
    f.componentInstance.disabled.set(true);
    f.detectChanges();
    await f.whenStable();
    expect(toggleOf(f).disabled).toBe(true);

    f.componentInstance.disabled.set(false);
    f.componentInstance.readonly.set(true);
    f.detectChanges();
    await f.whenStable();
    expect(toggleOf(f).disabled).toBe(true);
    expect(controlOf(f).readOnly).toBe(true);
  });

  it('hands the bounds and the language on to the grid', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-08-10');
    f.componentInstance.max.set('2026-08-20');
    f.detectChanges();
    await f.whenStable();

    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();

    const takeable = daysInPanel().filter(
      (d) => !d.hasAttribute('data-pct-disabled'),
    );
    expect(takeable).toHaveLength(11);
  });
});

describe('PctDate — the chrome it draws when there is none around it', () => {
  it('draws its own label, the required marker and the hint', async () => {
    const f = await render(Host);
    f.componentInstance.hint.set('Any day this year');
    f.componentInstance.required.set(true);
    f.detectChanges();
    await f.whenStable();

    const label = f.nativeElement.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLLabelElement;
    expect(label.getAttribute('for')).toBe(controlOf(f).id);
    expect(label.textContent).toContain('Start date');
    // The marker is `aria-hidden`: the fact is on the control as `required`, and a reader
    // that heard both would hear it twice.
    const marker = label.querySelector('span');
    expect(marker?.getAttribute('aria-hidden')).toBe('true');
    expect(controlOf(f).required).toBe(true);

    const hint = f.nativeElement.querySelector(
      '[data-pct-part="hint"]',
    ) as HTMLElement;
    expect(hint.textContent?.trim()).toBe('Any day this year');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('gives the one message line to the error, and announces it from there', async () => {
    @Component({
      imports: [PctDate],
      template: `<pct-date
        label="Start date"
        hint="Any day this year"
        [invalid]="true"
        [touched]="true"
        [errors]="errors"
      />`,
    })
    class Invalid {
      readonly errors = [{ kind: 'demo', message: 'Pick a day' }];
    }

    const f = await render(Invalid);
    const error = f.nativeElement.querySelector(
      '[data-pct-part="error"]',
    ) as HTMLElement;
    expect(error.textContent?.trim()).toBe('Pick a day');
    // One line, and the error takes it (`req-api-message`).
    expect(f.nativeElement.querySelector('[data-pct-part="hint"]')).toBeNull();
    expect(error.getAttribute('role')).toBe('alert');
    expect(controlOf(f).getAttribute('aria-describedby')).toBe(error.id);
    expect(controlOf(f).getAttribute('aria-invalid')).toBe('true');
  });

  it('draws no chrome of its own with no label and no hint', async () => {
    const f = await render(Host);
    f.componentInstance.label.set('');
    f.detectChanges();
    await f.whenStable();
    expect(f.nativeElement.querySelector('[data-pct-part="label"]')).toBeNull();
  });
});

describe('PctDate — inside the chrome', () => {
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
    // No `locale` on this one, so the field is written in the application's `LOCALE_ID` —
    // which is what makes the reading a default and not a per-instance override.
    expect(control.value).toBe('08/27/2026');
    // Standalone chrome is the field's, so the control draws none of its own.
    expect(f.nativeElement.querySelector('[data-pct-part="label"]')).toBeNull();
  });
});

/**
 * Forms, each from a NON-EMPTY value: a field that only ever started empty is a field whose
 * first write nobody watched (`lesson-26` — `FormField` brings an `NgControl` of its own, and a
 * control that took that for classic forms rendered an empty input over a filled model).
 */
describe('PctDate — the forms that bind it', () => {
  it('works with [formField], from the model’s value and back into it', async () => {
    @Component({
      imports: [PctDate, FormField],
      template: `<pct-date [formField]="f.startsOn" locale="es-ES" />`,
    })
    class Signal {
      readonly model = signal<{ startsOn: PctDay | null }>({
        startsOn: '2026-08-27',
      });
      readonly f = form(this.model, (p) => {
        required(p.startsOn);
      });
    }

    const f = await render(Signal);
    expect(controlOf(f).value).toBe('27/08/2026');

    await type(f, '01/12/2026');
    await blur(f);
    expect(f.componentInstance.model().startsOn).toBe('2026-12-01');
    expect(f.componentInstance.f.startsOn().touched()).toBe(true);

    // Angular's reset does not change the model, and one given a value shows that value; the
    // control's own reset emptied the model after either, and was counted as an edit.
    f.componentInstance.f().reset();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.model().startsOn).toBe('2026-12-01');
    expect(controlOf(f).value).toBe('01/12/2026');
    expect(f.componentInstance.f.startsOn().dirty()).toBe(false);
    expect(f.componentInstance.f.startsOn().touched()).toBe(false);

    await type(f, 'junk');
    await blur(f);
    f.componentInstance.f().reset({ startsOn: '2026-01-02' });
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.model().startsOn).toBe('2026-01-02');
    expect(controlOf(f).value).toBe('02/01/2026');
    expect(controlOf(f).getAttribute('aria-invalid')).toBeNull();
    expect(f.componentInstance.f.startsOn().dirty()).toBe(false);
  });

  it("a form's reset to a value shows that value over a date the field holds", async () => {
    @Component({
      imports: [PctDate, FormField],
      template: `<pct-date [formField]="f.startsOn" locale="es-ES" />`,
    })
    class Signal {
      readonly model = signal<{ startsOn: PctDay | null }>({
        startsOn: '2026-08-27',
      });
      readonly f = form(this.model);
    }

    const f = await render(Signal);
    await type(f, '01/12/2026');
    await blur(f);

    // The form sets the day and then calls the control's reset; a reset that wrote `null`
    // reached the form after that day and won.
    f.componentInstance.f().reset({ startsOn: '2026-01-02' });
    f.detectChanges();
    await f.whenStable();

    expect(f.componentInstance.model().startsOn).toBe('2026-01-02');
    expect(controlOf(f).value).toBe('02/01/2026');
    expect(f.componentInstance.f.startsOn().dirty()).toBe(false);
  });

  it('works with [formControl], in the language the field is in', async () => {
    @Component({
      imports: [PctDate, ReactiveFormsModule],
      template: `<pct-date [formControl]="ctrl" locale="es-ES" />`,
    })
    class Reactive {
      readonly ctrl = new FormControl<PctDay | null>('2026-08-27');
    }

    const f = await render(Reactive);
    expect(controlOf(f).value).toBe('27/08/2026');

    await type(f, '01/12/2026');
    await blur(f);
    expect(f.componentInstance.ctrl.value).toBe('2026-12-01');
    expect(f.componentInstance.ctrl.touched).toBe(true);
    expect(controlOf(f).value).toBe('01/12/2026');

    // A value from the form's side is written in the field's language as well.
    f.componentInstance.ctrl.setValue('2026-03-05');
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).value).toBe('05/03/2026');

    f.componentInstance.ctrl.disable();
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).disabled).toBe(true);
  });

  it('works with [(ngModel)], in the application’s language', async () => {
    @Component({
      imports: [PctDate, FormsModule],
      template: `<pct-date [(ngModel)]="value" />`,
    })
    class Template {
      value: PctDay | null = '2026-08-27';
    }

    const f = await render(Template);
    await f.whenStable();
    // The testing module's `LOCALE_ID` is `en-US`, month first.
    expect(controlOf(f).value).toBe('08/27/2026');

    await type(f, '12/01/2026');
    await blur(f);
    expect(f.componentInstance.value).toBe('2026-12-01');
    expect(controlOf(f).value).toBe('12/01/2026');
  });

  it('warns about none of them', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    @Component({
      imports: [PctDate, FormsModule, ReactiveFormsModule],
      template: `<pct-date [(ngModel)]="value" />
        <pct-date [formControl]="ctrl" />`,
    })
    class Classic {
      value: PctDay | null = '2026-08-27';
      readonly ctrl = new FormControl<PctDay | null>('2026-08-27');
    }

    await render(Classic);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('PctDate — the interop that writes what the type forbids', () => {
  it('shows nothing for a value that is not a day', async () => {
    const f = await render(Host);
    // `lesson-117`: the bridge writes what the model's type forbids, and no compiler, no
    // gate and no engine says a word about it.
    f.componentInstance.value.set('' as PctDay);
    f.detectChanges();
    await f.whenStable();
    expect(controlOf(f).value).toBe('');
  });
});

/**
 * `pctDayBounds` — the rule a signal form has for a `PctDay` bound, which Angular's `min()`
 * / `max()` cannot take, nor its `minDate()` / `maxDate()` (the last case says why), and the
 * compiler refuses as an attribute beside `[formField]` (`NG8022`). The platform's `MIN` /
 * `MAX` point at a key of the field's own type, and the directive reads the bound through
 * them into the field's inputs.
 */
describe('PctDate — bounds from a signal form (pctDayBounds)', () => {
  type Model = { startsOn: PctDay | null };

  async function bounded(
    startsOn: PctDay | null,
    rules: (p: SchemaPathTree<Model>) => void,
  ) {
    @Component({
      imports: [PctDate, FormField],
      template: `<pct-date [formField]="f.startsOn" locale="en-GB" />`,
    })
    class Signal {
      readonly model = signal<Model>({ startsOn });
      readonly f = form(this.model, rules);
    }
    const f = await render(Signal);
    const date = f.debugElement.children[0].componentInstance as PctDate;
    const field = () => f.componentInstance.f.startsOn();
    const set = async (value: PctDay | null) => {
      f.componentInstance.model.set({ startsOn: value });
      f.detectChanges();
      await f.whenStable();
    };
    return { f, date, field, set };
  }

  it('hands the bounds to the field, and the calendar walks inside them', async () => {
    const { f, date, field } = await bounded('2026-08-15', (p) => {
      pctDayBounds(p.startsOn, { min: '2026-08-10', max: '2026-08-20' });
    });
    expect([date.min(), date.max()]).toEqual(['2026-08-10', '2026-08-20']);
    expect([field().min?.(), field().max?.()]).toEqual([
      '2026-08-10',
      '2026-08-20',
    ]);

    toggleOf(f).click();
    f.detectChanges();
    await f.whenStable();
    const takeable = daysInPanel().filter(
      (d) => !d.hasAttribute('data-pct-disabled'),
    );
    expect(takeable.map((d) => d.textContent?.trim())).toEqual([
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
    ]);
  });

  it('grades a day outside, and none on a bound, nor an empty field', async () => {
    const { field, set } = await bounded('2026-08-09', (p) => {
      pctDayBounds(p.startsOn, { min: '2026-08-10', max: '2026-08-20' });
    });
    expect(field().errors()).toEqual([
      expect.objectContaining({ kind: 'minDay', minDay: '2026-08-10' }),
    ]);
    expect(field().errors()[0]).not.toHaveProperty('message');

    await set('2026-08-21');
    expect(field().errors()).toEqual([
      expect.objectContaining({ kind: 'maxDay', maxDay: '2026-08-20' }),
    ]);

    for (const inside of ['2026-08-10', '2026-08-20', null]) {
      await set(inside);
      expect(field().errors()).toEqual([]);
    }
  });

  it('has no window: a min later than its max leaves no day inside', async () => {
    const { field, set } = await bounded('2026-06-01', (p) => {
      pctDayBounds(p.startsOn, { min: '2026-12-01', max: '2026-01-01' });
    });
    expect(
      field()
        .errors()
        .map((e) => e.kind),
    ).toEqual(['minDay', 'maxDay']);
    await set('2027-01-01');
    expect(
      field()
        .errors()
        .map((e) => e.kind),
    ).toEqual(['maxDay']);
  });

  it('writes one message on every error, or one written from the error', async () => {
    const one = await bounded('2025-12-31', (p) => {
      pctDayBounds(p.startsOn, {
        min: '2026-01-01',
        message: 'From the new year',
      });
    });
    expect(one.field().errors()).toEqual([
      expect.objectContaining({
        kind: 'minDay',
        minDay: '2026-01-01',
        message: 'From the new year',
      }),
    ]);

    const each = await bounded('2027-01-01', (p) => {
      pctDayBounds(p.startsOn, {
        min: '2026-01-01',
        max: '2026-12-31',
        message: (e) =>
          e.kind === 'minDay' ? `From ${e.minDay}` : `Until ${e.maxDay}`,
      });
    });
    expect(each.field().errors()).toEqual([
      expect.objectContaining({ kind: 'maxDay', message: 'Until 2026-12-31' }),
    ]);
    // The message reaches the field's one message line once the field is touched.
    await blur(each.f);
    expect(
      each.f.nativeElement.querySelector('[data-pct-part="error"]')
        ?.textContent,
    ).toContain('Until 2026-12-31');
  });

  it('takes a bound from another field, and moves with it', async () => {
    @Component({
      imports: [PctDate, FormField],
      template: `<pct-date [formField]="f.endsOn" />`,
    })
    class Signal {
      readonly model = signal<{
        startsOn: PctDay | null;
        endsOn: PctDay | null;
      }>({ startsOn: '2026-08-10', endsOn: '2026-08-12' });
      readonly f = form(this.model, (p) => {
        pctDayBounds(p.endsOn, {
          min: ({ valueOf }) => valueOf(p.startsOn) ?? undefined,
        });
      });
    }
    const f = await render(Signal);
    const date = f.debugElement.children[0].componentInstance as PctDate;
    expect([date.min(), date.max()]).toEqual(['2026-08-10', undefined]);
    expect(f.componentInstance.f.endsOn().errors()).toEqual([]);

    f.componentInstance.model.update((m) => ({ ...m, startsOn: '2026-08-14' }));
    f.detectChanges();
    await f.whenStable();
    expect(date.min()).toBe('2026-08-14');
    expect(f.componentInstance.f.endsOn().errors()).toEqual([
      expect.objectContaining({ kind: 'minDay', minDay: '2026-08-14' }),
    ]);

    // An empty start is no bound.
    f.componentInstance.model.update((m) => ({ ...m, startsOn: null }));
    f.detectChanges();
    await f.whenStable();
    expect(date.min()).toBeUndefined();
    expect(f.componentInstance.f.endsOn().errors()).toEqual([]);
  });

  it('reads a bound that is not a day as no bound at all', async () => {
    const { date, field } = await bounded('2026-08-15', (p) => {
      pctDayBounds(p.startsOn, { min: 'soon', max: () => '2026-02-30' });
    });
    expect([date.min(), date.max()]).toEqual([undefined, undefined]);
    expect(field().errors()).toEqual([]);
  });

  it('with two rules the field walks their intersection, and each rule grades its own', async () => {
    const wide = (p: SchemaPathTree<Model>) =>
      pctDayBounds(p.startsOn, { min: '2026-01-01', max: '2026-12-31' });
    const narrow = (p: SchemaPathTree<Model>) =>
      pctDayBounds(p.startsOn, { min: '2026-06-01', max: '2026-06-30' });

    for (const order of [
      [wide, narrow],
      [narrow, wide],
    ]) {
      const { date, field, set } = await bounded('2027-01-01', (p) => {
        required(p.startsOn);
        for (const rule of order) rule(p);
      });
      expect([date.min(), date.max()]).toEqual(['2026-06-01', '2026-06-30']);
      expect(field().errors()).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'maxDay', maxDay: '2026-12-31' }),
          expect.objectContaining({ kind: 'maxDay', maxDay: '2026-06-30' }),
        ]),
      );
      expect(field().errors()).toHaveLength(2);

      await set('2026-03-01');
      expect(field().errors()).toEqual([
        expect.objectContaining({ kind: 'minDay', minDay: '2026-06-01' }),
      ]);

      // `required` beside them grades the empty field, which the bounds do not.
      await set(null);
      expect(
        field()
          .errors()
          .map((e) => e.kind),
      ).toEqual(['required']);
    }
  });

  it('takes each side from the rule that has one', async () => {
    const { date } = await bounded('2026-08-15', (p) => {
      pctDayBounds(p.startsOn, { min: () => undefined });
      pctDayBounds(p.startsOn, { min: '2026-08-01' });
      pctDayBounds(p.startsOn, { max: '2026-08-31' });
      pctDayBounds(p.startsOn, {
        min: () => undefined,
        max: () => undefined,
      });
    });
    expect([date.min(), date.max()]).toEqual(['2026-08-01', '2026-08-31']);
  });

  it('compares days as days past the year 9999, where the strings part company', async () => {
    const { date, field } = await bounded('10000-01-02', (p) => {
      pctDayBounds(p.startsOn, { min: '10000-01-01', max: '10000-01-01' });
      pctDayBounds(p.startsOn, { min: '9999-12-31', max: '10000-12-31' });
    });
    expect([date.min(), date.max()]).toEqual(['10000-01-01', '10000-01-01']);
    expect(field().errors()).toEqual([
      expect.objectContaining({ kind: 'maxDay', maxDay: '10000-01-01' }),
    ]);
  });

  it("Angular's own minDate cannot bound a PctDay: its path is a Date's, and it reads the value as one", () => {
    TestBed.runInInjectionContext(() => {
      const f = form(signal<Model>({ startsOn: '2026-08-15' }), (p) => {
        // @ts-expect-error — `minDate` takes a path whose value is a `Date`.
        minDate(p.startsOn, new Date(2026, 0, 1));
      });
      expect(() => f.startsOn().errors()).toThrow(TypeError);
    });
  });
});
