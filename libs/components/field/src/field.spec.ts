import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { email, form, FormField, required } from '@angular/forms/signals';
import { providePctConfig } from '@pacit/components/core';
import { allParts, part, query } from '../../testing/src/dom';
import { PctPrefix, PctSuffix } from './affix';
import { PctLabelAux, PctMessageAux } from './aux';
import { PctField } from './field';
import { PctFieldSize } from './field.types';
import { PctText } from './text';

const inputOf = (f: ComponentFixture<unknown>) =>
  query<HTMLInputElement>(f, 'input');

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctField, PctText],
  template: `<pct-field [label]="label()" [hint]="hint()">
    <input
      pctText
      type="email"
      [required]="req()"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [disabled]="disabled()"
      [(value)]="value"
    />
  </pct-field>`,
})
class Host {
  label = signal('E-mail');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly { kind: string; message?: string }[]>([]);
  disabled = signal(false);
  value = signal('');
}

@Component({
  imports: [PctField, PctText, PctPrefix, PctSuffix],
  template: `<pct-field label="Price">
    <span pctPrefix aria-hidden="true">PLN</span>
    <input pctText [(value)]="value" />
    <button pctSuffix type="button" aria-label="Clear">×</button>
  </pct-field>`,
})
class AffixHost {
  value = signal('100');
}

/** The same field, but both affixes fill their slots (`fill`). */
@Component({
  imports: [PctField, PctText, PctPrefix, PctSuffix],
  template: `<pct-field label="Price">
    <span pctPrefix="fill" aria-hidden="true">PLN</span>
    <input pctText [(value)]="value" />
    <button pctSuffix="fill" type="button" aria-label="Search">→</button>
  </pct-field>`,
})
class FillAffixHost {
  value = signal('100');
}

/** A field with a hint and two aux slots (the label aux and the message aux). */
@Component({
  imports: [PctField, PctText, PctLabelAux, PctMessageAux],
  template: `<pct-field label="Description" [hint]="hint()">
    <button pctLabelAux type="button" aria-label="Help">ⓘ</button>
    <input
      pctText
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [(value)]="value"
    />
    <span pctMessageAux>{{ value().length }}/120</span>
  </pct-field>`,
})
class AuxHost {
  hint = signal('A few words about you');
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly { kind: string; message?: string }[]>([]);
  value = signal('');
}

@Component({
  imports: [PctField, PctText, FormField],
  template: `<pct-field label="E-mail" hint="Work address">
    <input pctText type="email" [formField]="f.email" />
  </pct-field>`,
})
class SignalFormHost {
  model = signal({ email: 'start@example.com' });
  f = form(this.model, (p) => {
    required(p.email, { message: 'The address is required' });
    email(p.email, { message: 'Invalid address' });
  });
}

@Component({
  imports: [PctField, PctText, ReactiveFormsModule],
  template: `<pct-field label="E-mail">
    <input pctText [formControl]="ctrl" />
  </pct-field>`,
})
class ReactiveHost {
  ctrl = new FormControl('start');
}

@Component({
  imports: [PctField, PctText, FormsModule],
  template: `<pct-field label="E-mail">
    <input pctText [(ngModel)]="text" />
  </pct-field>`,
})
class NgModelHost {
  text = 'start';
}

/** The control with no wrapper — it has to work, only without a label or messages. */
@Component({
  imports: [PctText],
  template: `<input pctText [(value)]="value" />`,
})
class BareHost {
  value = signal('no wrapper');
}

@Component({
  imports: [PctField, PctText],
  template: `<pct-field label="E-mail" [size]="size()">
    <input pctText />
  </pct-field>`,
})
class SizeHost {
  size = signal<PctFieldSize>('lg');
}

/** A wrapper with no explicit size — it takes one from the global config. */
@Component({
  imports: [PctField, PctText],
  template: `<pct-field label="E-mail"><input pctText /></pct-field>`,
})
class DefaultSizeHost {}

describe('PctField + PctText', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders a native input and binds the wrapper label through for/id', async () => {
    const fixture = await render(Host);
    const input = inputOf(fixture);
    const label = part(fixture, 'field-label') as HTMLLabelElement;

    expect(input.tagName).toBe('INPUT');
    expect(input.type).toBe('email');
    expect(label.getAttribute('for')).toBe(input.id);
    expect(input.id).toBeTruthy();
  });

  it('typing updates the two-way bound value', async () => {
    const fixture = await render(Host);
    const input = inputOf(fixture);

    input.value = 'ala@example.com';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('ala@example.com');
  });

  it('a value changed from outside reaches the native input', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('z-modelu@example.com');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).value).toBe('z-modelu@example.com');
  });

  it('the wrapper hands the control an aria-describedby for the hint', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('Work address');
    fixture.detectChanges();
    await fixture.whenStable();

    const hint = part(fixture, 'field-hint');
    expect(inputOf(fixture).getAttribute('aria-describedby')).toBe(hint.id);
  });

  it('a required flag raised by the control shows the marker on the wrapper', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).hasAttribute('required')).toBe(true);
    expect(part(fixture, 'field-label').textContent).toContain('*');
  });

  it('the error appears only after a touch and is bound to the control', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      { kind: 'required', message: 'The address is required' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    // untouched -> no error
    expect(allParts(fixture, 'field-error')).toHaveLength(0);
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBeNull();

    fixture.componentInstance.touched.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const error = part(fixture, 'field-error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent?.trim()).toBe('The address is required');
    expect(inputOf(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(inputOf(fixture).getAttribute('aria-describedby')).toContain(
      error.id,
    );
  });

  it('disabling the control marks the wrapper as disabled', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(inputOf(fixture).disabled).toBe(true);
    const host = fixture.nativeElement.querySelector('pct-field');
    expect(host.hasAttribute('data-pct-disabled')).toBe(true);
  });

  describe('no dead zone inside the field border', () => {
    it('a click on the border padding focuses the control', async () => {
      const fixture = await render(Host);
      const row = part(fixture, 'field-row');

      // The event target is the row itself, that is the padding area — not the control.
      row.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('a click on the prefix affix focuses the control as well', async () => {
      const fixture = await render(AffixHost);
      const prefix = part(fixture, 'field-prefix');

      prefix.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      expect(document.activeElement).toBe(inputOf(fixture));
    });

    it('a click on a slot button does NOT hijack focus to the control', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix').querySelector(
        'button',
      ) as HTMLButtonElement;

      btn.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
      );
      await fixture.whenStable();

      // Focus was not moved to the input — the button serves itself.
      expect(document.activeElement).not.toBe(inputOf(fixture));
    });

    it("the row inside carries the spacing, not the row itself (no no-man's land)", async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row');

      // jsdom has no real layout, so we check the declared mechanism: the row has
      // no padding and no `gap` of its own, and the columns stretch to its height —
      // otherwise most of the border area belongs to none of them and cannot be
      // given a cursor that matches what a click there does.
      const rowStyle = getComputedStyle(row);
      expect(rowStyle.alignItems).toBe('stretch');
      expect(rowStyle.padding).toBe('');
      expect(rowStyle.gap).toBe('');

      // That the columns really tile the inside of the border is checked by an e2e
      // test — here only their presence is, because jsdom computes no layout.
      for (const name of ['field-prefix', 'field-control', 'field-suffix']) {
        expect(row.contains(part(fixture, name))).toBe(true);
      }
    });
  });

  describe('the prefix/suffix slots', () => {
    it('they render inside the field row, in the order prefix → field → suffix', async () => {
      const fixture = await render(AffixHost);
      const row = part(fixture, 'field-row');
      const order = Array.from(row.children).map((c) =>
        c.getAttribute('data-pct-part'),
      );

      expect(order).toEqual(['field-prefix', 'field-control', 'field-suffix']);
      expect(part(fixture, 'field-prefix').textContent).toContain('PLN');
      expect(
        part(fixture, 'field-suffix').querySelector('button'),
      ).toBeTruthy();
    });

    it('a button in the suffix slot is reachable and has an accessible name', async () => {
      const fixture = await render(AffixHost);
      const btn = part(fixture, 'field-suffix').querySelector(
        'button',
      ) as HTMLButtonElement;

      expect(btn.getAttribute('aria-label')).toBe('Clear');
      btn.focus();
      expect(document.activeElement).toBe(btn);
    });

    describe('fitting the slot (fit)', () => {
      it('the bare attribute, with no value, means `inset`', async () => {
        const fixture = await render(AffixHost);

        for (const name of ['field-prefix-item', 'field-suffix-item']) {
          expect(part(fixture, name).getAttribute('data-pct-fit')).toBe(
            'inset',
          );
        }
      });

      it('`fill` announces itself with a state attribute, on a passive affix too', async () => {
        const fixture = await render(FillAffixHost);

        for (const name of ['field-prefix-item', 'field-suffix-item']) {
          expect(part(fixture, name).getAttribute('data-pct-fit')).toBe('fill');
        }
      });

      it('a `fill` affix takes its height from the slot, not from itself', async () => {
        // Without it a button in the slot brings its own min-height and pushes the
        // row past the height of a field of the same size (req-api-size).
        const fill = await render(FillAffixHost);
        const inset = await render(AffixHost);

        expect(part(fill, 'field-suffix-item').style.minHeight).toBe('0');
        expect(part(inset, 'field-suffix-item').style.minHeight).toBe('');
      });

      it('a click on a `fill` affix does NOT move focus to the control', async () => {
        // A `fill` affix is a surface of its own: it shows its own cursor, so a
        // click on it cannot quietly do something else. That holds for a passive
        // affix too — here the „PLN" tile, not the button.
        const fixture = await render(FillAffixHost);
        const unit = part(fixture, 'field-prefix-item');

        unit.dispatchEvent(
          new MouseEvent('mousedown', { bubbles: true, cancelable: true }),
        );
        await fixture.whenStable();

        expect(document.activeElement).not.toBe(inputOf(fixture));
      });
    });
  });

  describe('signal forms', () => {
    it('shows the initial value of the model', async () => {
      const fixture = await render(SignalFormHost);

      // A regression: the FormField directive supplies NgControl (CVA interop), so
      // the heuristic „NgControl => somebody else writes to the DOM" ruled out signal
      // forms as well — and those, with a control of their own, only set `value` and
      // write nothing to the DOM. The field started empty (lesson-26).
      expect(inputOf(fixture).value).toBe('start@example.com');
    });

    it('syncs the value and shows the validation error after a touch', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);

      input.value = 'not-an-email';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(host.model().email).toBe('not-an-email');
      expect(host.f.email().valid()).toBe(false);
      expect(part(fixture, 'field-error')?.textContent?.trim()).toBe(
        'Invalid address',
      );
    });
  });

  describe('compatibility with classic forms (no CVA)', () => {
    it('reactive forms: [formControl] syncs both ways', async () => {
      const fixture = await render(ReactiveHost);
      const input = inputOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(input.value).toBe('start');

      input.value = 'z-widoku';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(ctrl.value).toBe('z-widoku');

      ctrl.setValue('z-kontrolki');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(input.value).toBe('z-kontrolki');
    });

    it('template-driven: [(ngModel)] syncs both ways', async () => {
      const fixture = await render(NgModelHost);
      await fixture.whenStable();
      const input = inputOf(fixture);

      expect(input.value).toBe('start');
      input.value = 'z-widoku';
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(fixture.componentInstance.text).toBe('z-widoku');
    });
  });

  describe('the size of the field', () => {
    const fieldOf = (f: ComponentFixture<unknown>) =>
      query(f, 'pct-field') as HTMLElement;

    it('reflects the size as a state attribute, the same as the button', async () => {
      const fixture = await render(SizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('lg');

      fixture.componentInstance.size.set('sm');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('sm');
    });

    it('with no explicit size it takes the default from the config', async () => {
      const fixture = await render(DefaultSizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('md');
    });

    it('respects the default size from providePctConfig (req-api-config)', async () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          providePctConfig({ defaultSize: 'sm' }),
        ],
      });
      const fixture = await render(DefaultSizeHost);
      expect(fieldOf(fixture).getAttribute('data-pct-size')).toBe('sm');
    });

    it('the row height comes from the size token, not from padding', async () => {
      // jsdom computes no layout, so we check the declared mechanism: the vertical
      // axis carries the row `min-height` and the columns no longer have vertical
      // padding. That this comes out exactly the height of a button of the same size
      // is checked by an e2e test (size.spec.ts).
      const fixture = await render(SizeHost);
      const row = part(fixture, 'field-row');
      expect(getComputedStyle(row).minHeight).toBe('var(--pct-field-height)');

      for (const name of ['field-prefix', 'field-control', 'field-suffix']) {
        expect(getComputedStyle(part(fixture, name)).paddingBlock).toBe('');
      }
    });
  });

  describe('one line below the field: the hint or the error', () => {
    it('the error replaces the hint, it does not join it', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;

      // With no error the hint is visible.
      expect(part(fixture, 'field-hint').textContent?.trim()).toBe(
        'A few words about you',
      );
      expect(allParts(fixture, 'field-error')).toHaveLength(0);

      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Description too short' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      // The error alone is lit — the hint disappears (one line).
      expect(part(fixture, 'field-error').textContent?.trim()).toBe(
        'Description too short',
      );
      expect(allParts(fixture, 'field-hint')).toHaveLength(0);
    });

    it('aria-describedby points only at the visible message', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;
      const input = inputOf(fixture);

      // The hint alone -> describedby is its id.
      expect(input.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-hint').id,
      );

      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Description too short' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      // The error takes the line -> describedby is the error id, with no dangling hint id.
      const errorId = part(fixture, 'field-error').id;
      expect(input.getAttribute('aria-describedby')).toBe(errorId);
    });
  });

  describe('the aux slots: the label aux and the message aux', () => {
    it('the label aux renders in the label row', async () => {
      const fixture = await render(AuxHost);
      const header = part(fixture, 'field-header');
      const aux = part(fixture, 'field-label-aux');

      expect(header.contains(aux)).toBe(true);
      expect(header.contains(part(fixture, 'field-label'))).toBe(true);
      expect(aux.querySelector('button')?.getAttribute('aria-label')).toBe(
        'Help',
      );
    });

    it('the message aux shares the row with the hint, and then with the error', async () => {
      const fixture = await render(AuxHost);
      const host = fixture.componentInstance;

      host.value.set('abc');
      fixture.detectChanges();
      await fixture.whenStable();

      const footer = part(fixture, 'field-footer');
      const aux = part(fixture, 'field-message-aux');
      expect(footer.contains(aux)).toBe(true);
      expect(footer.contains(part(fixture, 'field-hint'))).toBe(true);
      expect(aux.textContent?.trim()).toBe('3/120');

      // When the hint gives way to the error, the aux stays in the same row.
      host.invalid.set(true);
      host.touched.set(true);
      host.errors.set([{ kind: 'custom', message: 'Description too short' }]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(footer.contains(part(fixture, 'field-error'))).toBe(true);
      expect(footer.contains(part(fixture, 'field-message-aux'))).toBe(true);
    });
  });

  it('the control works with no wrapper (the wrapper is optional)', async () => {
    const fixture = await render(BareHost);
    const input = inputOf(fixture);

    expect(input.value).toBe('no wrapper');
    input.value = 'zmienione';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('zmienione');
  });
});
