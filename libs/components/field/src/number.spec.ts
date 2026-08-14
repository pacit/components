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

/** Typing text the way a user does: the DOM first, then the event. */
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
  template: `<pct-field label="Price" hint="Gross">
    <input pctNumber [maxFractionDigits]="2" [(value)]="value" />
  </pct-field>`,
})
class NumberInFieldHost {
  value = signal<number | null>(null);
}

@Component({
  imports: [PctField, PctNumber, FormField],
  template: `<pct-field label="Number of seats">
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

/** Classic forms — the use the directive warns about. */
@Component({
  imports: [PctNumber, ReactiveFormsModule],
  template: `<input pctNumber [formControl]="ctrl" />`,
})
class ClassicFormHost {
  ctrl = new FormControl<number | null>(null);
}

/** `type="number"` — the second such use. */
@Component({
  imports: [PctNumber],
  template: `<input type="number" pctNumber [(value)]="value" />`,
})
class NumberTypeHost {
  value = signal<number | null>(null);
}

/** A field with NOT ONE binding — it measures the input defaults. */
@Component({
  imports: [PctNumber],
  template: `<input pctNumber />`,
})
class BareHost {}

/** The error state given directly, with no form — the gating on `touched`. */
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
  describe('formatting by locale', () => {
    it('groups thousands and uses the local decimal separator', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(1234567.5);
      await fixture.whenStable();

      // pl-PL: a non-breaking space as the group separator, a comma for the decimals.
      expect(inputOf(fixture).value).toBe('1\u00a0234\u00a0567,5');
    });

    it('pads the decimal places up to minFractionDigits', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.minFrac.set(2);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(12.5);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('12,50');
    });

    it('an empty field is null, not zero', async () => {
      const fixture = await render(Host);
      expect(inputOf(fixture).value).toBe('');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('respects a different locale', async () => {
      const fixture = await render(Host, 'en-US');
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.value.set(1234.5);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('1,234.5');
    });

    it('grouping can be turned off', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.grouping.set(false);
      fixture.componentInstance.value.set(1234567);
      await fixture.whenStable();

      expect(inputOf(fixture).value).toBe('1234567');
    });
  });

  describe('parsing', () => {
    it('accepts the local decimal separator', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '12,34');

      expect(fixture.componentInstance.value()).toBe(12.34);
    });

    it('accepts a dot, because that is what the numeric keypad gives', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '12.34');

      expect(fixture.componentInstance.value()).toBe(12.34);
    });

    it('strips group separators, the non-breaking space among them', async () => {
      const fixture = await render(Host);
      await type(fixture, '1\u00a0234\u00a0567');

      expect(fixture.componentInstance.value()).toBe(1234567);
    });

    it('does not confuse the group separator with the decimal one in en-US', async () => {
      const fixture = await render(Host, 'en-US');
      fixture.componentInstance.maxFrac.set(2);

      // The comma separates no thousands here (no three digits), so it is a fraction.
      await type(fixture, '1,5');
      expect(fixture.componentInstance.value()).toBe(1.5);

      await type(fixture, '1,500');
      expect(fixture.componentInstance.value()).toBe(1500);
    });

    it('trims the surrounding whitespace — a paste from a spreadsheet carries spaces', async () => {
      const fixture = await render(Host);

      await type(fixture, '  42  ');
      expect(fixture.componentInstance.value()).toBe(42);
    });

    it('whitespace alone is an empty field, not zero', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(7);
      await fixture.whenStable();

      await type(fixture, '   ');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('clearing the field sets null', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(42);
      await fixture.whenStable();

      await type(fixture, '');
      expect(fixture.componentInstance.value()).toBeNull();
    });

    it('an intermediate state does not wipe the value', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      // A lone minus is not a number yet — the value waits for the commit.
      await type(fixture, '-');
      expect(fixture.componentInstance.value()).toBe(5);
    });

    it('does not rewrite the text while it is being typed', async () => {
      const fixture = await render(Host);
      await type(fixture, '1234');

      // Had the effect rewritten the value, the caret would jump to the end of „1 234".
      expect(inputOf(fixture).value).toBe('1234');
      expect(fixture.componentInstance.value()).toBe(1234);
    });

    it('a commit formats the text', async () => {
      const fixture = await render(Host);
      await type(fixture, '1234');
      await blur(fixture);

      expect(inputOf(fixture).value).toBe('1\u00a0234');
    });

    it('a commit rejects content that cannot be parsed', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(7);
      await fixture.whenStable();

      await type(fixture, 'abc');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBeNull();
      expect(inputOf(fixture).value).toBe('');
    });
  });

  describe('rounding and bounds', () => {
    it('the field is integer by default', async () => {
      const fixture = await render(Host);
      await type(fixture, '3,7');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBe(4);
    });

    it('rounds to maxFractionDigits on commit', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      await type(fixture, '3,456');
      await blur(fixture);

      expect(fixture.componentInstance.value()).toBe(3.46);
    });

    it('clamps the value to min and max only on commit', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      fixture.componentInstance.max.set(20);
      await fixture.whenStable();

      // We do not clamp while typing — otherwise „15" cannot be reached at all,
      // because it goes through „1".
      await type(fixture, '1');
      expect(fixture.componentInstance.value()).toBe(1);

      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(10);

      await type(fixture, '99');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(20);
    });

    // A bound given on one side has to work from that one side — a shared test for
    // min and max does not tell that apart from „clamps always".
    it('a lower bound alone does not clamp from above', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      await fixture.whenStable();

      await type(fixture, '1000');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(1000);
    });

    it('an upper bound alone does not clamp from below', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.max.set(20);
      await fixture.whenStable();

      await type(fixture, '-1000');
      await blur(fixture);
      expect(fixture.componentInstance.value()).toBe(-1000);
    });
  });

  describe('the keyboard', () => {
    it('the arrows change the value by step', async () => {
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
     * A regression: a step counted from the text in the DOM lost keypresses. The
     * text is written by an effect, that is asynchronously — two events in one run
     * saw the same starting value. The test deliberately does NOT stabilise between
     * the presses; with an `await` after each of them the defect is invisible.
     */
    it('a fast repeat of an arrow loses no step', async () => {
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

    it('PageUp/PageDown jumps tenfold', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(100);
      fixture.componentInstance.step.set(5);
      await fixture.whenStable();

      await key(fixture, 'PageUp');
      expect(fixture.componentInstance.value()).toBe(150);

      // PageDown was in this test's name and not in its body until 2026-08-06: the
      // mutation run showed the whole branch as uncovered (`lesson-57`).
      await key(fixture, 'PageDown');
      expect(fixture.componentInstance.value()).toBe(100);
    });

    it('a key outside the handled ones moves neither the value nor the event', async () => {
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
      // The `default` branch has to hand the key back to the browser — otherwise the
      // field stops taking digits, because `preventDefault` eats every press.
      expect(event.defaultPrevented).toBe(false);
    });

    // An empty field: the step needs something to start from, and the order of the
    // references (min, then max, then zero) is a promise here — the first arrow is to
    // land IN the range, not start at zero and be clamped back to it.
    it('a step with no value starts from min', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(10);
      await fixture.whenStable();

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(11);
    });

    it('a step with no value and no min starts from max', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.max.set(50);
      await fixture.whenStable();

      await key(fixture, 'ArrowDown');
      expect(fixture.componentInstance.value()).toBe(49);
    });

    it('a step with no value and no bounds starts from zero', async () => {
      const fixture = await render(Host);

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(1);
    });

    it('Home and End jump to the bounds', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.min.set(1);
      fixture.componentInstance.max.set(99);
      await fixture.whenStable();

      await key(fixture, 'End');
      expect(fixture.componentInstance.value()).toBe(99);

      await key(fixture, 'Home');
      expect(fixture.componentInstance.value()).toBe(1);
    });

    it('Home and End with no bounds do nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      // With no `min`/`max` there is nowhere to jump — the key is to be handed back
      // to the browser (in a text field it moves the caret), not eaten.
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

    it('a step starts from what the user typed, not from the committed value', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(1);
      await fixture.whenStable();

      await type(fixture, '50');
      await key(fixture, 'ArrowUp');

      expect(fixture.componentInstance.value()).toBe(51);
      expect(inputOf(fixture).value).toBe('51');
    });

    it('readonly blocks stepping', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.value.set(5);
      await fixture.whenStable();

      fixture.componentInstance.readonly.set(true);
      await fixture.whenStable();

      await key(fixture, 'ArrowUp');
      expect(fixture.componentInstance.value()).toBe(5);
    });
  });

  describe('accessibility', () => {
    it('is a spinbutton with a described value', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.maxFrac.set(2);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(1000);
      fixture.componentInstance.value.set(1234.5);
      await fixture.whenStable();

      const el = inputOf(fixture);
      expect(el.getAttribute('role')).toBe('spinbutton');
      // The raw value for the technology, the formatted one for the reader.
      expect(el.getAttribute('aria-valuenow')).toBe('1234.5');
      expect(el.getAttribute('aria-valuetext')).toBe('1\u00a0234,5');
      expect(el.getAttribute('aria-valuemin')).toBe('0');
      expect(el.getAttribute('aria-valuemax')).toBe('1000');
    });

    it('with not one binding it is an empty, working field', async () => {
      // The input defaults are a contract just as much as the inputs are, and every
      // test that passes them explicitly measures its own binding, not the default.
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

      // The default step is one, with no fractions by default.
      await key(fixture, 'ArrowUp');
      expect(el.value).toBe('1');
    });

    it('the error state lights up only after a touch', async () => {
      const fixture = await render(InvalidHost);
      const el = inputOf(fixture);

      fixture.componentInstance.invalid.set(true);
      await fixture.whenStable();
      expect(el.getAttribute('aria-invalid')).toBeNull();

      fixture.componentInstance.touched.set(true);
      await fixture.whenStable();
      expect(el.getAttribute('aria-invalid')).toBe('true');
    });

    it('an empty field has no aria-valuenow', async () => {
      const fixture = await render(Host);
      const el = inputOf(fixture);

      expect(el.hasAttribute('aria-valuenow')).toBe(false);
      expect(el.hasAttribute('aria-valuetext')).toBe(false);
    });

    it('the keyboard mode follows the fractions allowed', async () => {
      const fixture = await render(Host);
      expect(inputOf(fixture).getAttribute('inputmode')).toBe('numeric');

      fixture.componentInstance.maxFrac.set(2);
      await fixture.whenStable();
      expect(inputOf(fixture).getAttribute('inputmode')).toBe('decimal');
    });
  });

  describe('inside the pct-field wrapper', () => {
    it('the wrapper label points at the field and the hint describes it', async () => {
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

    it('gets the field border (the boxed appearance)', async () => {
      const fixture = await render(NumberInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('boxed');
    });
  });

  describe('signal forms', () => {
    it('shows the formatted initial value of the model', async () => {
      const fixture = await render(SignalFormHost);

      // A regression: `FormField` supplies NgControl (CVA interop), so the heuristic
      // „NgControl => somebody else writes to the DOM" ruled out signal forms as well,
      // though those, with a control of their own, only set `value`
      // (lesson-26).
      expect(inputOf(fixture).value).toBe('12\u00a0345');
    });

    it('takes the bounds from the schema validators, not from the template', async () => {
      const fixture = await render(SignalFormHost);
      const el = inputOf(fixture);

      // There is no [min]/[max] in the template — they belong to the FormUiControl
      // contract, so the directive fills them from min()/max() in the schema.
      expect(el.getAttribute('aria-valuemin')).toBe('1');
      expect(el.getAttribute('aria-valuemax')).toBe('500');

      await type(fixture, '9999');
      await blur(fixture);
      expect(fixture.componentInstance.model().seats).toBe(500);
    });

    it('focus() and reset() are what signal forms reach for', async () => {
      const fixture = await render(SignalFormHost);
      const directive = fixture.debugElement
        .query((d) => d.nativeElement.tagName === 'INPUT')
        .injector.get(PctNumber);

      directive.focus();
      expect(document.activeElement).toBe(inputOf(fixture));

      directive.reset();
      await fixture.whenStable();
      expect(fixture.componentInstance.model().seats).toBe(null);
      expect(inputOf(fixture).value).toBe('');
    });
  });

  describe('developer warnings', () => {
    it('classic forms take over writing to the DOM — the directive says so out loud', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        await render(ClassicFormHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // The message has to name the defect AND point at the way out — a bare „do
        // not do this" leaves the reader where it found them.
        expect(String(warn.mock.calls[0][0])).toContain(
          'Classic forms ([formControl], [(ngModel)]) take over writing ' +
            'the value and break locale formatting. Use signal forms ' +
            '([formField]) or [(value)] instead.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('type="number" loses the local separator — the directive says so out loud', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);
      try {
        await render(NumberTypeHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // The message has to NAME the type it found, because otherwise it does not
        // tell `type="number"` from `type="email"` and does not say what to fix.
        expect(String(warn.mock.calls[0][0])).toBe(
          '[pctNumber] Expected type="text" (the control parses numbers per ' +
            'locale itself), but got type="number".',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('correct use stays silent', async () => {
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
