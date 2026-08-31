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
import { PctSwitch } from './switch';

const boxOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

const partOf = (f: ComponentFixture<unknown>, part: string) =>
  f.nativeElement.querySelector(`[data-pct-part="${part}"]`) as HTMLElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctSwitch],
  template: `<pct-switch
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [(checked)]="checked"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('Wi-Fi');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  checked = signal(false);
  touchCount = 0;
}

@Component({
  imports: [PctSwitch, FormField],
  template: `<pct-switch label="Notifications" [formField]="f.notify" />`,
})
class SignalFormHost {
  model = signal({ notify: false });
  f = form(this.model, (p) => {
    required(p.notify, { message: 'Notifications have to be on' });
  });
}

@Component({
  imports: [PctSwitch, ReactiveFormsModule],
  template: `<pct-switch [formControl]="ctrl" />`,
})
class ReactiveHost {
  ctrl = new FormControl(true);
}

@Component({
  imports: [PctSwitch, FormsModule],
  template: `<pct-switch [(ngModel)]="enabled" />`,
})
class NgModelHost {
  enabled = true;
}

/**
 * A switch named from outside — no `label` of its own, which is the case the name has to
 * cover: the role sits on the `<input>` inside and the host carries none.
 */
@Component({
  imports: [PctSwitch],
  template: `<span id="wifi-heading">Wi-Fi</span>
    <pct-switch
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

/**
 * A switch with NOTHING bound. Every other host in this file binds every input it has, so
 * the values the API promises when nobody writes one are the single thing none of them can
 * answer for — a default is exercised only where it is left alone.
 */
@Component({
  imports: [PctSwitch],
  template: `<pct-switch />`,
})
class BareHost {}

/** `invalid` set, `touched` left to its default — and the other way round. */
@Component({
  imports: [PctSwitch],
  template: `<pct-switch label="Wi-Fi" invalid />`,
})
class InvalidOnlyHost {}

@Component({
  imports: [PctSwitch],
  template: `<pct-switch label="Wi-Fi" touched />`,
})
class TouchedOnlyHost {}

describe('PctSwitch', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders a native checkbox carrying role="switch", labelled through for/id', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);
    const label = partOf(fixture, 'label') as HTMLLabelElement;

    expect(box.type).toBe('checkbox');
    expect(box.getAttribute('role')).toBe('switch');
    expect(box.id).not.toBe('');
    expect(label.getAttribute('for')).toBe(box.id);
    expect(label.textContent?.trim()).toContain('Wi-Fi');
  });

  /**
   * The whole of 0039 in one case. `role="switch"` over a native checkbox takes the state
   * from the element's own checkedness — so writing `aria-checked` beside it would be a
   * second source of truth that no engine reads and no audit compares
   * (`lesson-112`). What is asserted is the ABSENCE of the attribute in both states,
   * because that absence is the promise.
   */
  it('never writes aria-checked — the native checkedness is the state', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);

    expect(box.checked).toBe(false);
    expect(box.getAttribute('aria-checked')).toBeNull();

    box.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.checked()).toBe(true);
    expect(box.checked).toBe(true);
    expect(box.getAttribute('aria-checked')).toBeNull();
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

  it('the thumb is drawn and hidden from the reader — the state is aria-checked, not a shape', async () => {
    const fixture = await render(Host);
    expect(partOf(fixture, 'thumb').getAttribute('aria-hidden')).toBe('true');
    expect(partOf(fixture, 'track')).not.toBeNull();
  });

  it('readonly blocks the state change but the control stays focusable', async () => {
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
      requiredError({ message: 'Has to be on' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(partOf(fixture, 'error')).toBeNull();
    expect(boxOf(fixture).getAttribute('aria-invalid')).toBeNull();
  });

  it('once touched it shows the error with role alert and binds it through aria-describedby', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Has to be on' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    const box = boxOf(fixture);
    const error = partOf(fixture, 'error');
    expect(box.getAttribute('aria-invalid')).toBe('true');
    expect(error.getAttribute('role')).toBe('alert');
    expect(box.getAttribute('aria-describedby')).toContain(error.id);
  });

  it('the hint takes the message line while no error is lit, and gives it back', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('Turns off when you leave the house');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(partOf(fixture, 'hint').id).not.toBe('');
    expect(boxOf(fixture).getAttribute('aria-describedby')).toBe(
      partOf(fixture, 'hint').id,
    );

    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      requiredError({ message: 'Has to be on' }),
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(partOf(fixture, 'hint')).toBeNull();
    expect(partOf(fixture, 'error').id).not.toBe('');
    expect(boxOf(fixture).getAttribute('aria-describedby')).toBe(
      partOf(fixture, 'error').id,
    );
  });

  it('required marks the native control and draws the star outside the reader', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(boxOf(fixture).required).toBe(true);
    expect(
      partOf(fixture, 'label').querySelector('[aria-hidden="true"]')
        ?.textContent,
    ).toBe('*');
  });

  it('blur emits touch', async () => {
    const fixture = await render(Host);
    boxOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();
    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('disabled blocks the native control', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(boxOf(fixture).disabled).toBe(true);
  });

  it('exposes the focus() and reset() methods from the contract', async () => {
    const fixture = await render(Host);
    const instance = fixture.debugElement.children[0]
      .componentInstance as PctSwitch;

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

      expect(host.f.notify().valid()).toBe(false);

      box.click();
      await fixture.whenStable();
      expect(host.model().notify).toBe(true);
      expect(host.f.notify().valid()).toBe(true);
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

    it('reactive forms: disable() and enable() reach the native input', async () => {
      const fixture = await render(ReactiveHost);
      const ctrl = fixture.componentInstance.ctrl;

      ctrl.disable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(boxOf(fixture).disabled).toBe(true);

      ctrl.enable();
      fixture.detectChanges();
      await fixture.whenStable();
      expect(boxOf(fixture).disabled).toBe(false);
    });

    it('template-driven: [(ngModel)] syncs both ways', async () => {
      const fixture = await render(NgModelHost);
      const box = boxOf(fixture);
      await fixture.whenStable();

      expect(box.checked).toBe(true);

      box.click();
      await fixture.whenStable();
      expect(fixture.componentInstance.enabled).toBe(false);
    });
  });

  // The name the host cannot carry: a consumer's `aria-label` on `<pct-switch>` lands on an
  // element with no role and is ignored, so it comes in as an input (req-a11y-built-in).
  describe('the accessible name comes in through an input', () => {
    it('ariaLabel names the control, and never the host', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabel.set('Wi-Fi');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(boxOf(fixture).getAttribute('aria-label')).toBe('Wi-Fi');
      expect(
        (
          fixture.nativeElement.querySelector('pct-switch') as HTMLElement
        ).getAttribute('aria-label'),
      ).toBeNull();
    });

    it('ariaLabelledby points the control at an element of the page', async () => {
      const fixture = await render(NamedHost);
      fixture.componentInstance.ariaLabelledby.set('wifi-heading');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(boxOf(fixture).getAttribute('aria-labelledby')).toBe(
        'wifi-heading',
      );
    });

    it('with neither input it leaves no dangling ARIA attribute', async () => {
      const fixture = await render(NamedHost);
      const box = boxOf(fixture);

      expect(box.getAttribute('aria-label')).toBeNull();
      expect(box.getAttribute('aria-labelledby')).toBeNull();
    });
  });
  describe('the defaults, which every other host here binds over', () => {
    it('a switch with nothing bound is off, enabled, unnamed and draws no text of its own', async () => {
      const fixture = await render(BareHost);
      const box = boxOf(fixture);

      expect(box.checked).toBe(false);
      expect(box.disabled).toBe(false);
      expect(box.required).toBe(false);
      expect(box.getAttribute('name')).toBeNull();
      expect(box.getAttribute('aria-readonly')).toBeNull();
      expect(box.getAttribute('aria-label')).toBeNull();
      expect(box.getAttribute('aria-labelledby')).toBeNull();
      expect(box.getAttribute('aria-describedby')).toBeNull();
      expect(partOf(fixture, 'label')).toBeNull();
      expect(partOf(fixture, 'hint')).toBeNull();
      expect(partOf(fixture, 'error')).toBeNull();
    });

    it('the control keeps an id even where no label points at it', async () => {
      // The `for`/`id` pair reads as correct when BOTH halves are empty, so the
      // relation has to be asserted against something that is not the other half.
      expect(boxOf(await render(BareHost)).id).not.toBe('');
    });

    it('`invalid` with no touch is not a state the user is shown', async () => {
      const fixture = await render(InvalidOnlyHost);

      expect(boxOf(fixture).getAttribute('aria-invalid')).toBeNull();
      expect(partOf(fixture, 'error')).toBeNull();
    });

    it('a touch with nothing wrong is not a state either', async () => {
      const fixture = await render(TouchedOnlyHost);

      expect(boxOf(fixture).getAttribute('aria-invalid')).toBeNull();
      expect(partOf(fixture, 'error')).toBeNull();
    });
  });

  describe('readonly, which two guards block at once', () => {
    /**
     * `onClick` prevents the default and `onChange` ignores the event, and either one
     * alone keeps the MODEL where it was — so an assertion on the model passes with the
     * other gone. What separates them is the native checkedness: without the prevented
     * default the box flips under the click and the DOM starts saying something the model
     * does not.
     */
    it('the native box does not flip under the click', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ro.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const box = boxOf(fixture);
      box.click();
      await fixture.whenStable();

      expect(box.checked).toBe(false);
      expect(fixture.componentInstance.checked()).toBe(false);
    });

    it('and a change that never came from a click is ignored as well', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.ro.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      const box = boxOf(fixture);
      box.checked = true;
      box.dispatchEvent(new Event('change'));
      await fixture.whenStable();

      expect(fixture.componentInstance.checked()).toBe(false);
    });
  });
});
