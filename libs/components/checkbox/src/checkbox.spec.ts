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
import { PctIconTemplate, providePctIcons } from '@pacit/components/icon';
import { PctCheckbox } from './checkbox';

const boxOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctCheckbox],
  template: `<pct-checkbox
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [indeterminate]="indeterminate()"
    [(checked)]="checked"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('I accept the terms');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  indeterminate = signal(false);
  checked = signal(false);
  touchCount = 0;
}

@Component({
  imports: [PctCheckbox, FormField],
  template: `<pct-checkbox
    label="Terms and conditions"
    [formField]="f.terms"
  />`,
})
class SignalFormHost {
  model = signal({ terms: false });
  f = form(this.model, (p) => {
    required(p.terms, { message: 'Consent is required' });
  });
}

@Component({
  imports: [PctCheckbox, ReactiveFormsModule],
  template: `<pct-checkbox [formControl]="ctrl" />`,
})
class ReactiveHost {
  ctrl = new FormControl(true);
}

@Component({
  imports: [PctCheckbox, FormsModule],
  template: `<pct-checkbox [(ngModel)]="agreed" />`,
})
class NgModelHost {
  agreed = true;
}

/**
 * A checkbox named from outside — no `label` of its own, which is the case the name has to
 * cover: the role sits on the `<input>` inside and the host carries none.
 */
@Component({
  imports: [PctCheckbox],
  template: `<span id="terms-heading">Terms</span>
    <pct-checkbox
      [label]="label()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
    />`,
})
class NamedHost {
  label = signal('');
  ariaLabel = signal('');
  ariaLabelledby = signal('');
}

describe('PctCheckbox', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders a native checkbox with a label bound through for/id', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);
    const label = fixture.nativeElement.querySelector(
      '[data-pct-part="label"]',
    ) as HTMLLabelElement;

    expect(box.type).toBe('checkbox');
    expect(label.getAttribute('for')).toBe(box.id);
    expect(label.textContent?.trim()).toContain('I accept the terms');
  });

  it('a click toggles the two-way bound state', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(true);

    box.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  it('the indeterminate state sets aria-checked="mixed" and the native property', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.indeterminate.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('readonly blocks the state change but the field stays focusable', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.ro.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    box.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.checked()).toBe(false);
    expect(box.disabled).toBe(false); // unlike disabled
    expect(box.getAttribute('aria-readonly')).toBe('true');
  });

  it('shows no error until the field has been touched', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Consent required' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(
      fixture.nativeElement.querySelector('[data-pct-part="error"]'),
    ).toBeNull();
    expect(boxOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('once touched it shows the error with role alert and binds it through aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Consent required' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    const error = fixture.nativeElement.querySelector(
      '[data-pct-part="error"]',
    );
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(box.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('blur emits touch', async () => {
    const fixture = await render(Host);
    boxOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('disabled blocks the native checkbox', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(boxOf(fixture).disabled).toBe(true);
  });

  it('exposes the focus() and reset() methods from the contract', async () => {
    const fixture = await render(Host);
    const instance = fixture.debugElement.children[0]
      .componentInstance as PctCheckbox;

    instance.focus();
    expect(document.activeElement).toBe(boxOf(fixture));

    fixture.componentInstance.checked.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    instance.reset();
    await fixture.whenStable();
    expect(fixture.componentInstance.checked()).toBe(false);
  });

  describe('signal forms', () => {
    it('syncs the state with the model and propagates validation', async () => {
      const fixture = await render(SignalFormHost);
      const host = fixture.componentInstance;
      const box = boxOf(fixture);

      expect(host.f.terms().valid()).toBe(false);

      box.click();
      await fixture.whenStable();
      expect(host.model().terms).toBe(true);
      expect(host.f.terms().valid()).toBe(true);
    });
  });

  describe('compatibility with classic forms (no CVA)', () => {
    it('reactive forms: [formControl] syncs both ways', async () => {
      const fixture = await render(ReactiveHost);
      const box = boxOf(fixture);
      const ctrl = fixture.componentInstance.ctrl;

      expect(box.checked).toBe(true);

      box.click();
      await fixture.whenStable();
      expect(ctrl.value).toBe(false);

      ctrl.setValue(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(box.checked).toBe(true);
    });

    it('template-driven: [(ngModel)] syncs both ways', async () => {
      const fixture = await render(NgModelHost);
      const box = boxOf(fixture);
      await fixture.whenStable();

      expect(box.checked).toBe(true);

      box.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.agreed).toBe(false);
    });
  });

  // The name the host cannot carry: a consumer's `aria-label` on `<pct-checkbox>` lands on an
  // element with no role and is ignored, so it comes in as an input (req-a11y-built-in).
  describe('the accessible name comes in through an input', () => {
    it('ariaLabel names the control, and never the host', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabel.set('I accept the terms');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(boxOf(fixture).getAttribute('aria-label')).toBe(
        'I accept the terms',
      );
      expect(
        (
          fixture.nativeElement.querySelector('pct-checkbox') as HTMLElement
        ).getAttribute('aria-label'),
      ).toBeNull();
    });

    it('ariaLabelledby points the control at an element of the page', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabelledby.set('terms-heading');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(boxOf(fixture).getAttribute('aria-labelledby')).toBe(
        'terms-heading',
      );
    });

    it('with neither input it leaves no dangling ARIA attribute', async () => {
      const fixture = await render(NamedHost);
      const box = boxOf(fixture);

      expect(box.getAttribute('aria-label')).toBeNull();
      expect(box.getAttribute('aria-labelledby')).toBeNull();
    });
  });
  describe('the mark a consumer replaces (req-api-icons)', () => {
    /** A set that carries one of the two names the checkbox draws. */
    @Component({
      selector: 'pct-probe-ticks',
      imports: [PctIconTemplate],
      template: `<ng-template pctIcon="check"
        ><i data-testid="own-tick">ok</i></ng-template
      >`,
    })
    class Ticks {}

    const mark = (f: ComponentFixture<unknown>) =>
      f.nativeElement.querySelector('[data-pct-part="mark"]') as HTMLElement;

    it('the part is the icon element, and its name follows the state', async () => {
      const fixture = await render(Host);
      // The part a stylesheet names is the box, not the drawing: what a consumer swaps
      // stands inside it, so the contract survives the swap.
      expect(mark(fixture).tagName).toBe('PCT-ICON');
      expect(mark(fixture).firstElementChild?.tagName).toBe('svg');

      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(mark(fixture).querySelector('path')?.getAttribute('d')).toBe(
        'M4 8h8',
      );
    });

    it('a provided set draws the tick and leaves the dash to the component', async () => {
      TestBed.configureTestingModule({ providers: providePctIcons(Ticks) });
      const fixture = await render(Host);

      expect(mark(fixture).firstElementChild?.getAttribute('data-testid')).toBe(
        'own-tick',
      );

      fixture.componentInstance.indeterminate.set(true);
      fixture.detectChanges();
      await fixture.whenStable();
      // The set says nothing about `indeterminate`, so the component's own drawing stays.
      expect(mark(fixture).firstElementChild?.tagName).toBe('svg');
    });
  });
});
