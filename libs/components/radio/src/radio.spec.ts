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
import { PctRadio } from './radio';
import { PctRadioGroup } from './radio-group';

const radiosOf = (f: ComponentFixture<unknown>) =>
  Array.from(
    f.nativeElement.querySelectorAll('input[type="radio"]'),
  ) as HTMLInputElement[];

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  >
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
    <pct-radio value="enterprise" disabled>Enterprise</pct-radio>
  </pct-radio-group>`,
})
class Host {
  label = signal('Plan');
  hint = signal('');
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
  imports: [PctRadioGroup, PctRadio, FormField],
  template: `<pct-radio-group label="Plan" [formField]="f.plan">
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class SignalFormHost {
  model = signal({ plan: '' });
  f = form(this.model, (p) => {
    required(p.plan, { message: 'Pick a plan' });
  });
}

@Component({
  imports: [PctRadioGroup, PctRadio, ReactiveFormsModule],
  template: `<pct-radio-group [formControl]="ctrl">
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class ReactiveHost {
  ctrl = new FormControl('pro');
}

@Component({
  imports: [PctRadioGroup, PctRadio, FormsModule],
  template: `<pct-radio-group [(ngModel)]="plan">
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro</pct-radio>
  </pct-radio-group>`,
})
class NgModelHost {
  plan = 'pro';
}

interface City {
  readonly id: number;
  readonly name: string;
}

const LONDON: City = { id: 1, name: 'London' };
const PARIS: City = { id: 2, name: 'Paris' };

@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group
    [compareWith]="byId"
    [emptyValue]="emptyValue"
    [(value)]="value"
  >
    <pct-radio [value]="london">London</pct-radio>
    <pct-radio [value]="paris">Paris</pct-radio>
  </pct-radio-group>`,
})
class EntityHost {
  readonly london = LONDON;
  readonly paris = PARIS;
  emptyValue: City | null = null;
  /** A different instance than the option on the list — the same identity. */
  value = signal<City | null>({ id: 2, name: 'Paris' });
  byId = (a: City, b: City) => a.id === b.id;
}

// Two independent groups — checks that the names do not collide.
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `
    <pct-radio-group [(value)]="a">
      <pct-radio value="1">A1</pct-radio>
      <pct-radio value="2">A2</pct-radio>
    </pct-radio-group>
    <pct-radio-group [(value)]="b">
      <pct-radio value="1">B1</pct-radio>
      <pct-radio value="2">B2</pct-radio>
    </pct-radio-group>
  `,
})
class TwoGroupsHost {
  a = signal<string | null>('');
  b = signal<string | null>('');
}

/**
 * Options whose projected content is not text — the case `ariaLabel` exists for: the role sits
 * on the `<input>` inside `pct-radio` and the host carries none.
 */
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<span id="plan-heading">Plan</span>
    <pct-radio-group [(value)]="value">
      <pct-radio value="free" [ariaLabel]="ariaLabel()">★</pct-radio>
      <pct-radio value="pro" [ariaLabelledby]="ariaLabelledby()">✦</pct-radio>
    </pct-radio-group>`,
})
class NamedHost {
  value = signal('free');
  ariaLabel = signal('');
  ariaLabelledby = signal('');
}

describe('PctRadioGroup / PctRadio', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('the group host has role radiogroup and a label bound through aria-labelledby', async () => {
    const fixture = await render(Host);
    const group = fixture.nativeElement.querySelector('pct-radio-group');
    const label = group.querySelector('[data-pct-part="group-label"]');

    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    expect(label.textContent?.trim()).toContain('Plan');
  });

  it('every option shares one name attribute (a native group)', async () => {
    const fixture = await render(Host);
    const names = new Set(radiosOf(fixture).map((r) => r.name));

    expect(names.size).toBe(1);
    expect([...names][0]).toBeTruthy();
  });

  it('two groups on a page have different names and independent state', async () => {
    const fixture = await render(TwoGroupsHost);
    const [a1, a2, b1] = radiosOf(fixture);

    expect(a1.name).not.toBe(b1.name);

    a2.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.a()).toBe('2');
    expect(fixture.componentInstance.b()).toBe('');

    b1.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.a()).toBe('2');
    expect(fixture.componentInstance.b()).toBe('1');
  });

  it('picking an option updates the group value and unchecks the rest', async () => {
    const fixture = await render(Host);
    const [free, pro] = radiosOf(fixture);

    free.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('free');
    expect(free.checked).toBe(true);

    pro.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('pro');
    expect(pro.checked).toBe(true);
    expect(free.checked).toBe(false);
  });

  it('a value set from outside checks the right option', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('pro');
    fixture.detectChanges();
    await fixture.whenStable();

    const [free, pro] = radiosOf(fixture);
    expect(pro.checked).toBe(true);
    expect(free.checked).toBe(false);
  });

  it('a single option can be disabled independently of the group', async () => {
    const fixture = await render(Host);
    const [free, pro, enterprise] = radiosOf(fixture);

    expect(free.disabled).toBe(false);
    expect(pro.disabled).toBe(false);
    expect(enterprise.disabled).toBe(true);
  });

  it('disabling the group disables every option', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(radiosOf(fixture).every((r) => r.disabled)).toBe(true);
  });

  it('readonly blocks changing the choice but the options stay focusable', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const [free] = radiosOf(fixture);
    free.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
    expect(free.disabled).toBe(false);

    // The GROUP announces the "read only" state: the `radio` role does not support
    // `aria-readonly`, so on an option it would be an attribute the role disallows
    // (a critical violation in axe, `lesson-33`).
    const group = fixture.nativeElement.querySelector('pct-radio-group');
    expect(group.getAttribute('aria-readonly')).toBe('true');
    expect(free.hasAttribute('aria-readonly')).toBe(false);
  });

  it('blur on any option marks the group as touched', async () => {
    const fixture = await render(Host);
    radiosOf(fixture)[1].dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('shows no error until the group has been touched', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Pick a plan' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="group-error"]'),
    ).toBeNull();
    const group = fixture.nativeElement.querySelector('pct-radio-group');
    expect(group.getAttribute('aria-invalid')).toBeNull();
  });

  it('once touched it binds the error to the group through aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Pick a plan' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.nativeElement.querySelector('pct-radio-group');
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="group-error"]',
    );
    expect(group.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(group.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('focus() on the group lands on the checked option, or on the first with none', async () => {
    const fixture = await render(Host);
    const groupInstance = fixture.debugElement.children[0]
      .componentInstance as PctRadioGroup;
    const [free, pro] = radiosOf(fixture);

    groupInstance.focus();
    expect(document.activeElement).toBe(free);

    fixture.componentInstance.value.set('pro');
    fixture.detectChanges();
    await fixture.whenStable();

    groupInstance.focus();
    expect(document.activeElement).toBe(pro);
  });

  describe('signal forms', () => {
    it('syncs the choice with the model and propagates validation', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;

      expect(host.f.plan().valid()).toBe(false);

      radiosOf(fixture)[1].click();
      await fixture.whenStable();

      expect(host.model().plan).toBe('pro');
      expect(host.f.plan().valid()).toBe(true);
    });
  });

  describe('compatibility with classic forms (no CVA)', () => {
    it('reactive forms: [formControl] syncs both ways', async () => {
      const fixture = await render(ReactiveHost);
      const [free, pro] = radiosOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(pro.checked).toBe(true);

      free.click();
      await fixture.whenStable();
      expect(ctrl.value).toBe('free');

      ctrl.setValue('pro');
      fixture.detectChanges();
      await fixture.whenStable();
      expect(pro.checked).toBe(true);
    });

    it('template-driven: [(ngModel)] syncs both ways', async () => {
      const fixture = await render(NgModelHost);
      await fixture.whenStable();
      const [free, pro] = radiosOf(fixture);

      expect(pro.checked).toBe(true);

      free.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.plan).toBe('free');
    });
  });

  describe('non-string values', () => {
    it('compareWith matches an entity by key, not by reference', async () => {
      const fixture = await render(EntityHost);
      const [london, paris] = radiosOf(fixture);

      expect(paris.checked).toBe(true);
      expect(london.checked).toBe(false);
    });

    it('a choice hands the group the option object, not its text form', async () => {
      const fixture = await render(EntityHost);
      radiosOf(fixture)[0].click();
      await fixture.whenStable();

      expect(fixture.componentInstance.value()).toBe(LONDON);
    });

    it('the value attribute stays empty for non-primitive values', async () => {
      const fixture = await render(EntityHost);
      // `[object Object]` in the DOM would look like a value and identifies nothing.
      expect(radiosOf(fixture)[0].hasAttribute('value')).toBe(false);
    });

    it('the value attribute still describes primitive options', async () => {
      const fixture = await render(Host);
      expect(radiosOf(fixture)[0].getAttribute('value')).toBe('free');
    });

    it('reset() returns to the emptyValue the application declared', async () => {
      const fixture = await render(EntityHost);
      const group = fixture.debugElement.children[0]
        .componentInstance as PctRadioGroup<City>;

      group.reset();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBeNull();

      fixture.componentInstance.emptyValue = LONDON;
      fixture.componentInstance.value.set(PARIS);
      fixture.detectChanges();
      await fixture.whenStable();

      group.reset();
      await fixture.whenStable();
      expect(fixture.componentInstance.value()).toBe(LONDON);
    });
  });

  // The name the host cannot carry: a consumer's `aria-label` on `<pct-radio>` lands on an
  // element with no role and is ignored, so it comes in as an input (req-a11y-built-in).
  describe('an option names itself through an input', () => {
    it('ariaLabel names the control, and never the host', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabel.set('Free');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(radiosOf(fixture)[0].getAttribute('aria-label')).toBe('Free');
      expect(
        (
          fixture.nativeElement.querySelector('pct-radio') as HTMLElement
        ).getAttribute('aria-label'),
      ).toBeNull();
    });

    it('ariaLabelledby points the control at an element of the page', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabelledby.set('plan-heading');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(radiosOf(fixture)[1].getAttribute('aria-labelledby')).toBe(
        'plan-heading',
      );
    });

    it('with neither input it leaves no dangling ARIA attribute', async () => {
      const fixture = await render(NamedHost);

      for (const radio of radiosOf(fixture)) {
        expect(radio.getAttribute('aria-label')).toBeNull();
        expect(radio.getAttribute('aria-labelledby')).toBeNull();
      }
    });
  });
});
