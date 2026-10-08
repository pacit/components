import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { requiredError, ValidationError } from '@angular/forms/signals';
import { PctCheckbox } from '@pacit/components/checkbox';
import { PctDate } from '@pacit/components/date';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';
import { PctSelect, PctSelectOption } from '@pacit/components/select';
import { PctSlider } from '@pacit/components/slider';
import { PctSwitch } from '@pacit/components/switch';
import { allParts, part } from '../../testing/src/dom';
import { PctField } from './field';
import { PctNumber } from './number';
import { PctText } from './text';

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

const OPTIONS: readonly PctSelectOption[] = [
  { value: 'pl', label: 'Poland' },
  { value: 'de', label: 'Germany' },
];

@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Country" [hint]="hint()">
    <pct-select
      [options]="options"
      [invalid]="invalid()"
      [touched]="touched()"
      [errors]="errors()"
      [(value)]="value"
    />
  </pct-field>`,
})
class SelectInFieldHost {
  options = OPTIONS;
  hint = signal('');
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  value = signal('');
}

@Component({
  imports: [PctField, PctCheckbox],
  template: `<pct-field label="Consents" hint="Required">
    <pct-checkbox [(checked)]="checked" />
  </pct-field>`,
})
class CheckboxInFieldHost {
  checked = signal(false);
}

@Component({
  imports: [PctField, PctRadioGroup, PctRadio],
  template: `<pct-field label="Plan" hint="Pick one">
    <pct-radio-group [(value)]="value">
      <pct-radio value="free">Free</pct-radio>
      <pct-radio value="pro">Pro</pct-radio>
    </pct-radio-group>
  </pct-field>`,
})
class RadioInFieldHost {
  value = signal('');
}

@Component({
  imports: [PctField, PctSwitch],
  template: `<pct-field label="Notifications" hint="Two a week at most">
    <pct-switch [(checked)]="checked" />
  </pct-field>`,
})
class SwitchInFieldHost {
  checked = signal(false);
}

@Component({
  imports: [PctField, PctSlider],
  template: `<pct-field label="Volume" hint="Loud after seven">
    <pct-slider [(value)]="value" />
  </pct-field>`,
})
class SliderInFieldHost {
  value = signal(20);
}

/** The same control outside the wrapper — it has to draw its own label. */
@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox label="Standalone" hint="Its own hint" />`,
})
class CheckboxStandaloneHost {}

/** The error state, driven from the host — the three controls take the same three inputs. */
class MessageHost {
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
}

/**
 * The three controls that draw their own messages, standalone. One host per control rather
 * than a generic one: the inputs are typed per component, and a `hint` bound through a
 * common interface would compile without any of them declaring it.
 */
@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox
    label="Terms"
    hint="Read them first"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
  />`,
})
class CheckboxAloneHost extends MessageHost {}

@Component({
  imports: [PctSwitch],
  template: `<pct-switch
    label="Notifications"
    hint="Two a week at most"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
  />`,
})
class SwitchAloneHost extends MessageHost {}

@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group
    label="Plan"
    hint="Pick one"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
  >
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class GroupAloneHost extends MessageHost {}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    label="Country"
    hint="Pick from the list"
    [options]="options"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
  />`,
})
class SelectAloneHost extends MessageHost {
  options = OPTIONS;
}

describe('Controls inside the pct-field wrapper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  describe('PctSelect', () => {
    it('hands the label over to the wrapper and renders none of its own', async () => {
      const fixture = await render(SelectInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const trigger = part(fixture, 'trigger');

      // Exactly one label — it belongs to the wrapper and points at the trigger.
      expect(labels).toHaveLength(1);
      expect(labels[0].closest('pct-field')).toBeTruthy();
      expect(labels[0].getAttribute('for')).toBe(trigger.id);
    });

    it('the wrapper draws the border and the trigger gives it up', async () => {
      const fixture = await render(SelectInFieldHost);
      const host = fixture.nativeElement.querySelector('pct-select');
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(host.hasAttribute('data-pct-in-field')).toBe(true);
      // The border is the `boxed` appearance — the select needs it.
      expect(field.getAttribute('data-pct-appearance')).toBe('boxed');
    });

    it('the wrapper renders the hint and the error, not the control (one line)', async () => {
      const fixture = await render(SelectInFieldHost);
      const trigger = part(fixture, 'trigger');

      // The hint alone: the wrapper draws it and binds it to the trigger.
      fixture.componentInstance.hint.set('Pick from the list');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(part(fixture, 'field-hint').closest('pct-field')).toBeTruthy();
      expect(trigger.getAttribute('aria-describedby')).toContain(
        part(fixture, 'field-hint').id,
      );

      // The error takes over the only line below the field — the hint gives way.
      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'Country is required' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(allParts(fixture, 'field-hint')).toHaveLength(0);
      expect(allParts(fixture, 'field-error')).toHaveLength(1);
      expect(part(fixture, 'field-error').closest('pct-field')).toBeTruthy();
      expect(trigger.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-error').id,
      );
    });
  });

  describe('PctCheckbox', () => {
    it('the wrapper draws no border around a checkbox (the bare appearance)', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('hands the label to the wrapper but keeps it bound to the native input', async () => {
      const fixture = await render(CheckboxInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const input = fixture.nativeElement.querySelector(
        'input[type="checkbox"]',
      ) as HTMLInputElement;

      expect(labels).toHaveLength(1);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });

    it('outside the wrapper it draws its own label and hint', async () => {
      const fixture = await render(CheckboxStandaloneHost);

      expect(part(fixture, 'label').textContent).toContain('Standalone');
      expect(part(fixture, 'hint').textContent).toContain('Its own hint');
      expect(fixture.nativeElement.querySelector('pct-field')).toBeNull();
    });
  });

  describe('PctSwitch', () => {
    it('the wrapper draws no border around a switch (the bare appearance)', async () => {
      const fixture = await render(SwitchInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('hands the label to the wrapper but keeps it bound to the native input', async () => {
      const fixture = await render(SwitchInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const input = fixture.nativeElement.querySelector(
        'input[role="switch"]',
      ) as HTMLInputElement;

      expect(labels).toHaveLength(1);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });

    it('the description comes from the chrome, and the switch adds none of its own', async () => {
      const fixture = await render(SwitchInFieldHost);
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector('input[role="switch"]') as HTMLElement;

      // One line in the whole tree, drawn by the wrapper, and the control points at it —
      // which it can only do because the wrapper handed it the ids to point at.
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        'field-hint',
      ]);
      expect(input.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-hint').id,
      );
    });
  });

  describe('PctSlider', () => {
    it('the wrapper draws no border around a slider (the bare appearance)', async () => {
      const fixture = await render(SliderInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');

      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('hands the label to the wrapper but keeps it bound to the native input', async () => {
      const fixture = await render(SliderInFieldHost);
      const labels = allParts(fixture, 'field-label');
      const input = fixture.nativeElement.querySelector(
        'input[type="range"]',
      ) as HTMLInputElement;

      expect(labels).toHaveLength(1);
      expect(labels[0].getAttribute('for')).toBe(input.id);
    });

    it('the description comes from the chrome, and the slider adds none of its own', async () => {
      const fixture = await render(SliderInFieldHost);
      const root = fixture.nativeElement as HTMLElement;
      const input = root.querySelector('input[type="range"]') as HTMLElement;

      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        'field-hint',
      ]);
      expect(input.getAttribute('aria-describedby')).toBe(
        part(fixture, 'field-hint').id,
      );
    });
  });

  describe('PctRadioGroup', () => {
    it('names the group through aria-labelledby pointing at the wrapper label', async () => {
      const fixture = await render(RadioInFieldHost);
      const group = fixture.nativeElement.querySelector('pct-radio-group');
      const label = part(fixture, 'field-label');

      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
      expect(label.closest('pct-field')).toBeTruthy();
    });

    it('renders no group label of its own inside the wrapper', async () => {
      const fixture = await render(RadioInFieldHost);
      expect(allParts(fixture, 'group-label')).toHaveLength(0);
      expect(allParts(fixture, 'group-hint')).toHaveLength(0);
    });

    it('the wrapper draws no border around a group (the bare appearance)', async () => {
      const fixture = await render(RadioInFieldHost);
      const field = fixture.nativeElement.querySelector('pct-field');
      expect(field.getAttribute('data-pct-appearance')).toBe('bare');
    });

    it('picking an option still works inside the wrapper', async () => {
      const fixture = await render(RadioInFieldHost);
      const radios = Array.from(
        fixture.nativeElement.querySelectorAll('input[type="radio"]'),
      ) as HTMLInputElement[];

      radios[1].click();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe('pro');
    });
  });
});

/** Whatever the component prefixes them with: `hint` / `error`, `group-hint` / `group-error`. */
const messagesIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[data-pct-part]')).filter(
    (el) => /(^|-)(hint|error|warning)$/.test(el.dataset['pctPart'] ?? ''),
  );

/** Every `aria-describedby` in the tree, resolved to the parts it points at. */
const describedParts = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>('[aria-describedby]')).flatMap(
    (el) =>
      (el.getAttribute('aria-describedby') ?? '')
        .split(/\s+/)
        .filter(Boolean)
        .map(
          (id) =>
            root.querySelector<HTMLElement>(`[id="${id}"]`)?.dataset[
              'pctPart'
            ] ?? `${id} (no element)`,
        ),
  );

/**
 * `req-api-message` — the rule holds for the control's own footer as it does for the
 * chrome's, and the three controls are read by one loop: a fourth that draws its own
 * messages is one row here, and `check-aria` (point 6) is what notices a component that
 * never got the row.
 */
describe('Controls outside the wrapper: one message line', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  const controls: [string, Type<MessageHost>][] = [
    ['pct-checkbox', CheckboxAloneHost],
    ['pct-radio-group', GroupAloneHost],
    ['pct-select', SelectAloneHost],
    ['pct-switch', SwitchAloneHost],
  ];

  for (const [name, host] of controls) {
    it(`${name}: the error takes the line and the hint gives way`, async () => {
      const fixture = await render(host);
      const root = fixture.nativeElement as HTMLElement;

      // The hint alone: one line, and the description points at it.
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        expect.stringMatching(/hint$/),
      ]);
      expect(describedParts(root)).toEqual([expect.stringMatching(/hint$/)]);

      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'This one is required' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      // The error: still one line, and the hint is out of the DOM rather than hidden —
      // `aria-describedby` names what is on the screen and nothing else.
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        expect.stringMatching(/error$/),
      ]);
      expect(describedParts(root)).toEqual([expect.stringMatching(/error$/)]);
    });
  }
});

/**
 * A verdict without a veto ([0087](../../../../docs/decisions/0087-a-warning-is-a-verdict-without-a-veto.md)):
 * every control takes `warnings`, and the line under it — the chrome's inside `pct-field`, its
 * own outside — draws the warning after the error and before the hint, once touched, with
 * `aria-invalid` untouched. Eight controls, two modes, one loop each; a ninth control is a
 * row in each table.
 */
class WarningHost {
  touched = signal(false);
  invalid = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  warnings = signal<readonly ValidationError.WithOptionalFieldTree[]>([
    { kind: 'big', message: 'Unusually large' },
  ]);
}

const WARNING_BINDINGS = `[touched]="touched()"
    [invalid]="invalid()"
    [errors]="errors()"
    [warnings]="warnings()"`;

@Component({
  imports: [PctField, PctText],
  template: `<pct-field label="Amount" hint="Gross">
    <input pctText ${WARNING_BINDINGS} />
  </pct-field>`,
})
class TextWarnsInField extends WarningHost {}

@Component({
  imports: [PctText],
  template: `<input pctText ${WARNING_BINDINGS} />`,
})
class TextWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctNumber],
  template: `<pct-field label="Amount" hint="Gross">
    <input pctNumber ${WARNING_BINDINGS} />
  </pct-field>`,
})
class NumberWarnsInField extends WarningHost {}

@Component({
  imports: [PctNumber],
  template: `<input pctNumber ${WARNING_BINDINGS} />`,
})
class NumberWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctDate],
  template: `<pct-field label="Due" hint="Any day">
    <pct-date ${WARNING_BINDINGS} />
  </pct-field>`,
})
class DateWarnsInField extends WarningHost {}

@Component({
  imports: [PctDate],
  template: `<pct-date label="Due" hint="Any day" ${WARNING_BINDINGS} />`,
})
class DateWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctSelect],
  template: `<pct-field label="Country" hint="Pick one">
    <pct-select [options]="options" ${WARNING_BINDINGS} />
  </pct-field>`,
})
class SelectWarnsInField extends WarningHost {
  options = OPTIONS;
}

@Component({
  imports: [PctSelect],
  template: `<pct-select
    label="Country"
    hint="Pick one"
    [options]="options"
    ${WARNING_BINDINGS}
  />`,
})
class SelectWarnsAlone extends WarningHost {
  options = OPTIONS;
}

@Component({
  imports: [PctField, PctCheckbox],
  template: `<pct-field label="Terms" hint="Read them first">
    <pct-checkbox ${WARNING_BINDINGS} />
  </pct-field>`,
})
class CheckboxWarnsInField extends WarningHost {}

@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox
    label="Terms"
    hint="Read them first"
    ${WARNING_BINDINGS}
  />`,
})
class CheckboxWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctSwitch],
  template: `<pct-field label="Notifications" hint="Two a week">
    <pct-switch ${WARNING_BINDINGS} />
  </pct-field>`,
})
class SwitchWarnsInField extends WarningHost {}

@Component({
  imports: [PctSwitch],
  template: `<pct-switch
    label="Notifications"
    hint="Two a week"
    ${WARNING_BINDINGS}
  />`,
})
class SwitchWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctRadioGroup, PctRadio],
  template: `<pct-field label="Plan" hint="Pick one">
    <pct-radio-group ${WARNING_BINDINGS}>
      <pct-radio value="free">Free</pct-radio>
      <pct-radio value="pro">Pro</pct-radio>
    </pct-radio-group>
  </pct-field>`,
})
class GroupWarnsInField extends WarningHost {}

@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group label="Plan" hint="Pick one" ${WARNING_BINDINGS}>
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class GroupWarnsAlone extends WarningHost {}

@Component({
  imports: [PctField, PctSlider],
  template: `<pct-field label="Volume" hint="Loud after seven">
    <pct-slider ${WARNING_BINDINGS} />
  </pct-field>`,
})
class SliderWarnsInField extends WarningHost {}

@Component({
  imports: [PctSlider],
  template: `<pct-slider
    label="Volume"
    hint="Loud after seven"
    ${WARNING_BINDINGS}
  />`,
})
class SliderWarnsAlone extends WarningHost {}

/** The element that carries `aria-describedby` and `aria-invalid` — the control's own. */
const describedElement = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[aria-describedby], [role="radiogroup"]');

describe('Every control warns, in both modes (0087)', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  /** The eight controls inside the chrome: the chrome draws the warning. */
  const inField: [string, Type<WarningHost>][] = [
    ['input[pctText]', TextWarnsInField],
    ['input[pctNumber]', NumberWarnsInField],
    ['pct-date', DateWarnsInField],
    ['pct-select', SelectWarnsInField],
    ['pct-checkbox', CheckboxWarnsInField],
    ['pct-switch', SwitchWarnsInField],
    ['pct-radio-group', GroupWarnsInField],
    ['pct-slider', SliderWarnsInField],
  ];

  for (const [name, host] of inField) {
    it(`${name} inside pct-field: the chrome draws the warning once touched, after the error, before the hint`, async () => {
      const fixture = await render(host);
      const root = fixture.nativeElement as HTMLElement;
      const field = root.querySelector('pct-field') as HTMLElement;

      // Untouched: the hint alone, and no warning anywhere.
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        'field-hint',
      ]);

      fixture.componentInstance.touched.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      // Touched: the chrome's warning, and nobody else's — the control draws none of its own.
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        'field-warning',
      ]);
      expect(part(fixture, 'field-warning').textContent).toContain(
        'Unusually large',
      );
      expect(describedParts(root)).toEqual(['field-warning']);
      expect(field.hasAttribute('data-pct-warning')).toBe(true);
      expect(field.hasAttribute('data-pct-invalid')).toBe(false);
      expect(root.querySelectorAll('[aria-invalid="true"]').length).toBe(0);

      // The error outranks it.
      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'This one is required' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        'field-error',
      ]);
      expect(describedParts(root)).toEqual(['field-error']);
      expect(field.hasAttribute('data-pct-warning')).toBe(false);
    });
  }

  /** The six controls that draw their own footer, standing alone. */
  const footers: [string, Type<WarningHost>][] = [
    ['pct-date', DateWarnsAlone],
    ['pct-select', SelectWarnsAlone],
    ['pct-checkbox', CheckboxWarnsAlone],
    ['pct-switch', SwitchWarnsAlone],
    ['pct-radio-group', GroupWarnsAlone],
    ['pct-slider', SliderWarnsAlone],
  ];

  for (const [name, host] of footers) {
    it(`${name} alone: its own footer draws the same third branch`, async () => {
      const fixture = await render(host);
      const root = fixture.nativeElement as HTMLElement;
      const control = root.querySelector(name) as HTMLElement;

      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        expect.stringMatching(/hint$/),
      ]);

      fixture.componentInstance.touched.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const [warning] = messagesIn(root);
      expect(warning.dataset['pctPart']).toMatch(/warning$/);
      expect(messagesIn(root)).toHaveLength(1);
      expect(warning.getAttribute('role')).toBe('status');
      expect(warning.textContent).toContain('Unusually large');
      expect(warning.textContent).toContain('Warning:');
      expect(warning.querySelector('pct-icon svg')).not.toBeNull();
      expect(describedParts(root)).toEqual([expect.stringMatching(/warning$/)]);
      expect(control.hasAttribute('data-pct-warning')).toBe(true);
      expect(control.hasAttribute('data-pct-invalid')).toBe(false);
      expect(describedElement(root)?.getAttribute('aria-invalid')).toBeNull();

      fixture.componentInstance.invalid.set(true);
      fixture.componentInstance.errors.set([
        requiredError({ message: 'This one is required' }),
      ]);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(messagesIn(root).map((el) => el.dataset['pctPart'])).toEqual([
        expect.stringMatching(/error$/),
      ]);
      expect(control.hasAttribute('data-pct-warning')).toBe(false);
    });
  }

  /** The two controls that draw nothing of their own: alone, a warning is a fact and no line. */
  const bare: [string, Type<WarningHost>][] = [
    ['input[pctText]', TextWarnsAlone],
    ['input[pctNumber]', NumberWarnsAlone],
  ];

  for (const [name, host] of bare) {
    it(`${name} alone: no line to draw, and nothing described`, async () => {
      const fixture = await render(host);
      const root = fixture.nativeElement as HTMLElement;
      fixture.componentInstance.touched.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const input = root.querySelector('input') as HTMLInputElement;
      expect(messagesIn(root)).toHaveLength(0);
      expect(input.getAttribute('aria-describedby')).toBeNull();
      expect(input.getAttribute('aria-invalid')).toBeNull();
    });
  }
});
