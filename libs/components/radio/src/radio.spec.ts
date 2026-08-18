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
import type { PctCompareWith } from '@pacit/components/core';
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

/** A plan as an entity — two objects can stand for one plan. */
interface Plan {
  id: string;
  name: string;
}

/** Two options carry one value. What the group reports — and what it looks like meanwhile. */
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group label="Plan" [(value)]="value">
    <pct-radio value="free">Free</pct-radio>
    <pct-radio value="pro">Pro monthly</pct-radio>
    <pct-radio value="pro">Pro yearly</pct-radio>
  </pct-radio-group>`,
})
class DuplicateHost {
  value = signal<string | null>('pro');
}

/** The options written from data — the list that duplicates a value is usually the second one. */
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group label="Plan" [(value)]="value">
    @for (plan of plans(); track $index) {
      <pct-radio [value]="plan.id">{{ plan.name }}</pct-radio>
    }
  </pct-radio-group>`,
})
class ListHost {
  plans = signal([
    { id: 'free', name: 'Free' },
    { id: 'pro', name: 'Pro' },
  ]);
  value = signal<string | null>(null);
}

/** Two different objects standing for one plan; the comparator says they are one. */
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group
    label="Plan"
    [compareWith]="byId"
    [(value)]="value"
  >
    <pct-radio [value]="monthly">Pro monthly</pct-radio>
    <pct-radio [value]="yearly">Pro yearly</pct-radio>
  </pct-radio-group>`,
})
class EntityDuplicateHost {
  monthly: Plan = { id: 'pro', name: 'Pro monthly' };
  yearly: Plan = { id: 'pro', name: 'Pro yearly' };
  byId: PctCompareWith<Plan> = (a, b) => a.id === b.id;
  value = signal<Plan | null>(null);
}

/** The same two options with no comparator: two references, so two values. */
@Component({
  imports: [PctRadioGroup, PctRadio],
  template: `<pct-radio-group label="Plan" [(value)]="value">
    <pct-radio [value]="monthly">Pro monthly</pct-radio>
    <pct-radio [value]="yearly">Pro yearly</pct-radio>
  </pct-radio-group>`,
})
class EntityWithoutCompareHost {
  monthly: Plan = { id: 'pro', name: 'Pro monthly' };
  yearly: Plan = { id: 'pro', name: 'Pro yearly' };
  value = signal<Plan | null>(null);
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

  it('a standalone group renders its own hint and is described by it', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('One plan per account');
    fixture.detectChanges();
    await fixture.whenStable();

    const group = fixture.nativeElement.querySelector('pct-radio-group');
    const hint = fixture.nativeElement.querySelector(
      '[data-pct-part="group-hint"]',
    );
    expect(hint.textContent.trim()).toBe('One plan per account');
    expect(group.getAttribute('aria-describedby')).toContain(hint.id);
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

  /**
   * A value maps back to an option, so two options sharing one make the mapping ambiguous —
   * and the group cannot pick for the application. It says so in dev mode instead, permanently
   * in English and outside `PCT_TEXTS` (`req-api-texts`), as `pct-select` does one component
   * over (`req-api-generic`).
   */
  describe('two options with one value', () => {
    /** Every case here provokes a warning; a real one in the output would read as a failure. */
    const silenced = () =>
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    it('paints both options as chosen while the browser keeps one — the defect itself', async () => {
      const warn = silenced();
      try {
        const fixture = await render(DuplicateHost);
        const hosts = Array.from(
          fixture.nativeElement.querySelectorAll('pct-radio'),
        ) as HTMLElement[];

        // What the stylesheet paints: two dots filled, because `checked()` is computed from
        // the value and both options carry it.
        expect(hosts.map((h) => h.getAttribute('data-pct-checked'))).toEqual([
          null,
          '',
          '',
        ]);
        // What the browser holds: the natives share a `name`, so only the LAST write stands —
        // and that is what carries the role, so that is what a screen reader announces.
        expect(radiosOf(fixture).map((r) => r.checked)).toEqual([
          false,
          false,
          true,
        ]);
      } finally {
        warn.mockRestore();
      }
    });

    it('names both positions and both labels, once for the pair', async () => {
      const warn = silenced();
      try {
        await render(DuplicateHost);
        expect(warn).toHaveBeenCalledTimes(1);
        // The whole message, not a fragment of it: the positions because the labels are what
        // differ, and the way out because "do not do this" leaves the reader where it found
        // them.
        expect(String(warn.mock.calls[0][0])).toBe(
          '[pct-radio-group] Options with the same value: ' +
            '1 ("Pro monthly") and 2 ("Pro yearly"). ' +
            'A value maps back to an option through `compareWith`, and EVERY option it ' +
            'matches paints itself selected — while the native radios share a `name`, so ' +
            'the browser keeps only the LAST of them checked. The user sees two chosen ' +
            'options where a screen reader announces one. Give the options distinct ' +
            'values, or a `compareWith` that tells them apart.',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('a group with distinct values stays silent', async () => {
      const warn = silenced();
      try {
        await render(Host);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });

    it('follows the content rather than the first render, and reports every pair', async () => {
      const fixture = await render(ListHost);
      const warn = silenced();
      try {
        fixture.componentInstance.plans.set([
          { id: 'free', name: 'Free' },
          { id: 'pro', name: 'Pro' },
          { id: 'free', name: 'Free (again)' },
          { id: 'pro', name: 'Pro (again)' },
        ]);
        fixture.detectChanges();
        await fixture.whenStable();

        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0][0])).toContain(
          'same value: 0 ("Free") and 2 ("Free (again)"), ' +
            '1 ("Pro") and 3 ("Pro (again)").',
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
        expect(String(warn.mock.calls[0][0])).toContain(
          '0 ("Pro monthly") and 1 ("Pro yearly")',
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('the same two options without a comparator are two values', async () => {
      const warn = silenced();
      try {
        await render(EntityWithoutCompareHost);
        expect(warn).not.toHaveBeenCalled();
      } finally {
        warn.mockRestore();
      }
    });
  });
});
