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
  max,
  min,
  ValidationError,
} from '@angular/forms/signals';
import { PctSlider } from './slider';

const boxOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('input') as HTMLInputElement;

const partOf = (f: ComponentFixture<unknown>, part: string) =>
  f.nativeElement.querySelector(`[data-pct-part="${part}"]`) as HTMLElement;

const partsOf = (f: ComponentFixture<unknown>, part: string) =>
  [
    ...f.nativeElement.querySelectorAll(`[data-pct-part="${part}"]`),
  ] as HTMLElement[];

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

/** The value a drag would produce, delivered the way a browser delivers it. */
async function move(fixture: ComponentFixture<unknown>, to: number) {
  const box = boxOf(fixture);
  box.value = String(to);
  box.dispatchEvent(new Event('input', { bubbles: true }));
  await fixture.whenStable();
}

@Component({
  imports: [PctSlider],
  template: `<pct-slider
    [label]="label()"
    [hint]="hint()"
    [required]="req()"
    [invalid]="invalid()"
    [touched]="touched()"
    [errors]="errors()"
    [disabled]="disabled()"
    [readonly]="ro()"
    [min]="lo()"
    [max]="hi()"
    [step]="step()"
    [marks]="marks()"
    [format]="format()"
    [labels]="labels()"
    [orientation]="orientation()"
    [(value)]="value"
    (touch)="touchCount = touchCount + 1"
  />`,
})
class Host {
  label = signal('Volume');
  hint = signal('');
  req = signal(false);
  invalid = signal(false);
  touched = signal(false);
  errors = signal<readonly ValidationError.WithOptionalFieldTree[]>([]);
  disabled = signal(false);
  ro = signal(false);
  lo = signal<number | undefined>(undefined);
  hi = signal<number | undefined>(undefined);
  step = signal(1);
  marks = signal(false);
  format = signal<Intl.NumberFormatOptions | null>(null);
  labels = signal<readonly string[]>([]);
  orientation = signal<'horizontal' | 'vertical'>('horizontal');
  value = signal(0);
  touchCount = 0;
}

@Component({
  imports: [PctSlider, FormField],
  template: `<pct-slider label="Budget" [formField]="f.budget" />`,
})
class SignalFormHost {
  model = signal({ budget: 40 });
  f = form(this.model, (p) => {
    min(p.budget, 20, { message: 'Too low' });
    max(p.budget, 80, { message: 'Too high' });
  });
}

@Component({
  imports: [PctSlider, ReactiveFormsModule],
  template: `<pct-slider [formControl]="ctrl" />`,
})
class ReactiveHost {
  ctrl = new FormControl(25);
}

@Component({
  imports: [PctSlider, FormsModule],
  template: `<pct-slider [(ngModel)]="level" />`,
})
class NgModelHost {
  level = 70;
}

/**
 * A slider named from outside — no `label` of its own, which is the case the name has to
 * cover: the role sits on the `<input>` inside and the host carries none.
 */
@Component({
  imports: [PctSlider],
  template: `<span id="gain-heading">Gain</span>
    <pct-slider
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

/** A slider with NOTHING bound — where the defaults of the contract are what answers. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider />`,
})
class BareHost {}

/** `invalid` set, `touched` left to its default — and the other way round. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider label="Volume" invalid />`,
})
class InvalidOnlyHost {}

@Component({
  imports: [PctSlider],
  template: `<pct-slider label="Volume" touched />`,
})
class TouchedOnlyHost {}

/** Marks asked for over a step that divides nothing. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider
    label="Volume"
    marks
    [min]="0"
    [max]="100"
    [step]="0"
  />`,
})
class ZeroStepMarksHost {}

/**
 * The bounds as ATTRIBUTES, which is how they arrive from a template that does not compute
 * them. `optionalNumber` reads all three of these; a `number` binding exercises none.
 */
@Component({
  imports: [PctSlider],
  template: `<pct-slider label="Empty" max="" />
    <pct-slider label="Junk" max="abc" />
    <pct-slider label="Text" max="60" />`,
})
class AttributeBoundsHost {}

/** Marks asked for at CREATION — the warning is a one-shot in the constructor. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider
    label="Volume"
    marks
    [min]="0"
    [max]="100"
    [step]="0.5"
  />`,
})
class TooManyMarksHost {}

/** The same count, with `marks` never asked for. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider label="Volume" [min]="0" [max]="100" [step]="0.5" />`,
})
class NoMarksAskedHost {}

/** Exactly as many intervals as are still legible — the boundary itself. */
@Component({
  imports: [PctSlider],
  template: `<pct-slider
    label="Volume"
    marks
    [min]="0"
    [max]="100"
    [step]="2"
  />`,
})
class BoundaryMarksHost {}

describe('PctSlider', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('renders a native range labelled through for/id, with the platform’s own bounds', async () => {
    const fixture = await render(Host);
    const box = boxOf(fixture);
    const label = partOf(fixture, 'label') as HTMLLabelElement;

    expect(box.type).toBe('range');
    expect(label.getAttribute('for')).toBe(box.id);
    expect(label.textContent?.trim()).toContain('Volume');
    // Absent bounds are the platform's defaults, not "no limit" — a slider without bounds
    // is not a slider.
    expect(box.getAttribute('min')).toBe('0');
    expect(box.getAttribute('max')).toBe('100');
  });

  /**
   * There is no `role="slider"` in the template and there is not meant to be: the native
   * range carries the role, the value and both bounds, so the whole of `req-a11y-built-in`
   * here is a matter of NOT writing it (0042).
   */
  it('writes no role of its own — the element is the slider', async () => {
    const fixture = await render(Host);
    expect(boxOf(fixture).hasAttribute('role')).toBe(false);
  });

  /**
   * The same reading as the switch's `aria-checked` (0039), arriving twice at once. The
   * engine derives the orientation from the writing mode and ignores an `aria-orientation`
   * that disagrees; `aria-required` does not reach a range's accessibility node at all.
   * Both are therefore attributes the component could only get wrong, so it writes neither
   * — in both orientations, which is what makes this an absence rather than a default.
   */
  it('never writes aria-orientation or aria-required, in either orientation', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.req.set(true);
    await fixture.whenStable();

    expect(boxOf(fixture).hasAttribute('aria-orientation')).toBe(false);
    expect(boxOf(fixture).hasAttribute('aria-required')).toBe(false);

    fixture.componentInstance.orientation.set('vertical');
    await fixture.whenStable();

    expect(boxOf(fixture).hasAttribute('aria-orientation')).toBe(false);
    expect(boxOf(fixture).hasAttribute('aria-required')).toBe(false);
    // The orientation is on the host, where the stylesheet reads it — and nowhere else.
    expect(
      fixture.nativeElement
        .querySelector('pct-slider')
        .getAttribute('data-pct-orientation'),
    ).toBe('vertical');
  });

  it('takes the value the platform reports and hands it back through the model', async () => {
    const fixture = await render(Host);

    await move(fixture, 42);

    expect(fixture.componentInstance.value()).toBe(42);
    expect(boxOf(fixture).value).toBe('42');
  });

  /**
   * `readonly` has no native attribute on a range and must not cost the control its focus,
   * so the change is UNDONE rather than prevented: the platform has already written the
   * element's value by the time `input` fires.
   */
  it('undoes a move while readonly, and keeps the control focusable', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(30);
    fixture.componentInstance.ro.set(true);
    await fixture.whenStable();

    await move(fixture, 90);

    expect(fixture.componentInstance.value()).toBe(30);
    expect(boxOf(fixture).value).toBe('30');
    expect(boxOf(fixture).disabled).toBe(false);
    expect(boxOf(fixture).getAttribute('aria-readonly')).toBe('true');
  });

  it('drops out of the tab order when disabled, which is the platform’s own doing', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.disabled.set(true);
    await fixture.whenStable();

    expect(boxOf(fixture).disabled).toBe(true);
    expect(
      fixture.nativeElement
        .querySelector('pct-slider')
        .hasAttribute('data-pct-disabled'),
    ).toBe(true);
  });

  // --- the value the platform cannot pronounce ---

  /**
   * The default is silence. A plain 0–100 slider says its number through `aria-valuenow`,
   * which a reader speaks in the user's own language — an `aria-valuetext` mirroring it
   * would be the inert attribute of 0039 worn a second time.
   */
  it('writes no aria-valuetext and draws no bubble while nothing is formatted', async () => {
    const fixture = await render(Host);

    expect(boxOf(fixture).hasAttribute('aria-valuetext')).toBe(false);
    expect(partOf(fixture, 'bubble')).toBeNull();
  });

  it('formats the value once and puts the SAME string in both places', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hi.set(1);
    fixture.componentInstance.step.set(0.05);
    fixture.componentInstance.format.set({ style: 'percent' });
    fixture.componentInstance.value.set(0.15);
    await fixture.whenStable();

    const said = boxOf(fixture).getAttribute('aria-valuetext');
    expect(said).toMatch(/15\s*%/);
    expect(partOf(fixture, 'bubble').textContent?.trim()).toBe(said);
    // The eye gets it from the bubble, the reader from the control. Neither gets it twice.
    expect(partOf(fixture, 'bubble').getAttribute('aria-hidden')).toBe('true');
  });

  it('lets a name beat a formatting, and falls back to the format off the list', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hi.set(2);
    fixture.componentInstance.labels.set(['Small', 'Medium', 'Large']);
    fixture.componentInstance.format.set({ style: 'percent' });
    fixture.componentInstance.value.set(1);
    await fixture.whenStable();

    expect(boxOf(fixture).getAttribute('aria-valuetext')).toBe('Medium');

    // Past the end of the list there is no name, so the formatting takes over again.
    fixture.componentInstance.hi.set(5);
    fixture.componentInstance.value.set(4);
    await fixture.whenStable();

    expect(boxOf(fixture).getAttribute('aria-valuetext')).not.toBe('Medium');
    expect(boxOf(fixture).getAttribute('aria-valuetext')).toMatch(/%/);
  });

  it('counts the named steps from min, not from zero', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.lo.set(10);
    fixture.componentInstance.hi.set(12);
    fixture.componentInstance.labels.set(['Small', 'Medium', 'Large']);
    fixture.componentInstance.value.set(10);
    await fixture.whenStable();

    expect(boxOf(fixture).getAttribute('aria-valuetext')).toBe('Small');
  });

  // --- the geometry the stylesheet runs on ---

  /**
   * The one number the component computes for the drawing. jsdom lays nothing out, so what
   * is provable here is the ARITHMETIC; where the thumb actually lands is a browser's
   * question and the e2e asks it (`lesson-82`'s split).
   */
  it('writes the fraction the drawing runs on, clamped to the bounds', async () => {
    const fixture = await render(Host);
    const host = fixture.nativeElement.querySelector(
      'pct-slider',
    ) as HTMLElement;
    const read = () => host.style.getPropertyValue('--_pct-slider-fraction');

    fixture.componentInstance.lo.set(20);
    fixture.componentInstance.hi.set(70);
    fixture.componentInstance.value.set(45);
    await fixture.whenStable();
    expect(read()).toBe('0.5');

    // A value outside the bounds is a form's business, not the drawing's: the thumb has
    // nowhere past the end to stand.
    fixture.componentInstance.value.set(200);
    await fixture.whenStable();
    expect(read()).toBe('1');

    fixture.componentInstance.value.set(-5);
    await fixture.whenStable();
    expect(read()).toBe('0');
  });

  it('survives a span of zero rather than dividing by it', async () => {
    const fixture = await render(Host);
    const host = fixture.nativeElement.querySelector(
      'pct-slider',
    ) as HTMLElement;

    fixture.componentInstance.lo.set(5);
    fixture.componentInstance.hi.set(5);
    fixture.componentInstance.value.set(5);
    await fixture.whenStable();

    expect(host.style.getPropertyValue('--_pct-slider-fraction')).toBe('0');
  });

  it('draws a mark per step, ends included, each carrying its own place', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.lo.set(20);
    fixture.componentInstance.hi.set(80);
    fixture.componentInstance.step.set(10);
    fixture.componentInstance.marks.set(true);
    await fixture.whenStable();

    const marks = partsOf(fixture, 'mark');
    expect(marks.length).toBe(7);
    expect(marks[0].style.getPropertyValue('--_pct-slider-mark-at')).toBe('0');
    expect(marks[6].style.getPropertyValue('--_pct-slider-mark-at')).toBe('1');
  });

  /**
   * A mark is an element, so a step that cuts the track into two hundred parts is two
   * hundred nodes drawing one grey band. They are refused rather than drawn illegibly, and
   * the dev-mode warning says which numbers produced it.
   */
  it('refuses marks it could not draw legibly', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.step.set(0.1);
    fixture.componentInstance.marks.set(true);
    await fixture.whenStable();

    expect(partsOf(fixture, 'mark').length).toBe(0);
  });

  it('draws no marks unless asked', async () => {
    const fixture = await render(Host);
    expect(partsOf(fixture, 'mark').length).toBe(0);
  });

  // --- the chrome ---

  it('shows the hint, and lets the error take the one message line', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.hint.set('Between 20 and 80');
    await fixture.whenStable();

    expect(partOf(fixture, 'hint').textContent?.trim()).toBe(
      'Between 20 and 80',
    );
    expect(boxOf(fixture).getAttribute('aria-describedby')).toBe(
      partOf(fixture, 'hint').id,
    );

    fixture.componentInstance.invalid.set(true);
    fixture.componentInstance.touched.set(true);
    fixture.componentInstance.errors.set([
      { kind: 'demo', message: 'Too low' },
    ]);
    await fixture.whenStable();

    expect(partOf(fixture, 'hint')).toBeNull();
    expect(partOf(fixture, 'error').textContent?.trim()).toBe('Too low');
    expect(partOf(fixture, 'error').getAttribute('role')).toBe('alert');
    expect(boxOf(fixture).getAttribute('aria-invalid')).toBe('true');
    expect(boxOf(fixture).getAttribute('aria-describedby')).toBe(
      partOf(fixture, 'error').id,
    );
  });

  it('emits touch on blur', async () => {
    const fixture = await render(Host);
    boxOf(fixture).dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.touchCount).toBe(1);
  });

  it('takes an accessible name from outside, and the label loses to it', async () => {
    const fixture = await render(NamedHost);
    const host = fixture.componentInstance;

    host.ariaLabel.set('Gain');
    await fixture.whenStable();
    expect(boxOf(fixture).getAttribute('aria-label')).toBe('Gain');

    host.ariaLabel.set('');
    host.ariaLabelledby.set('gain-heading');
    await fixture.whenStable();
    expect(boxOf(fixture).getAttribute('aria-labelledby')).toBe('gain-heading');
  });

  // --- forms ---

  it('works with signal forms, taking its bounds from the schema’s validators', async () => {
    const fixture = await render(SignalFormHost);
    const box = boxOf(fixture);

    expect(box.getAttribute('min')).toBe('20');
    expect(box.getAttribute('max')).toBe('80');
    expect(box.value).toBe('40');

    await move(fixture, 55);
    expect(fixture.componentInstance.model().budget).toBe(55);
  });

  it('works with [formControl]', async () => {
    const fixture = await render(ReactiveHost);

    expect(boxOf(fixture).value).toBe('25');

    await move(fixture, 60);
    expect(fixture.componentInstance.ctrl.value).toBe(60);
  });

  it('disable() and enable() through [formControl] reach the native input', async () => {
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

  /**
   * The interop that makes `ControlValueAccessor` unnecessary
   * ([`lesson-9`](../../../../docs/lessons.md#lesson-9)) sets the control up before the
   * binding's own value has resolved, and the first thing it writes into a model typed
   * `number` is `null`. The stable state is what is asserted, and the state one tick
   * earlier is what the case below is for.
   */
  it('works with [(ngModel)]', async () => {
    const fixture = await render(NgModelHost);
    await fixture.whenStable();

    expect(boxOf(fixture).value).toBe('70');
  });

  it('reads a value the interop has not written yet as the lower bound', async () => {
    const fixture = await render(Host);
    const host = fixture.nativeElement.querySelector(
      'pct-slider',
    ) as HTMLElement;
    fixture.componentInstance.lo.set(20);
    fixture.componentInstance.hi.set(80);
    // What `[(ngModel)]` writes first, and what no type here can refuse.
    (
      fixture.componentInstance.value as unknown as { set(v: unknown): void }
    ).set(null);
    await fixture.whenStable();

    expect(boxOf(fixture).value).toBe('20');
    expect(host.style.getPropertyValue('--_pct-slider-fraction')).toBe('0');
  });

  /**
   * A slider has no empty value — the thumb is always somewhere — so a reset is the middle
   * of the range rather than a clearing.
   */
  it('resets to the midpoint of its own bounds', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.lo.set(20);
    fixture.componentInstance.hi.set(80);
    fixture.componentInstance.value.set(75);
    await fixture.whenStable();

    const slider = fixture.debugElement.children[0]
      .componentInstance as PctSlider;
    slider.reset();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe(50);
  });

  it('focuses the native control when the form asks it to', async () => {
    const fixture = await render(Host);
    const slider = fixture.debugElement.children[0]
      .componentInstance as PctSlider;

    slider.focus();

    expect(document.activeElement).toBe(boxOf(fixture));
  });
  describe('the defaults, which the host above binds over', () => {
    it('a slider with nothing bound is enabled, unnamed and says nothing about itself', async () => {
      const fixture = await render(BareHost);
      const box = boxOf(fixture);

      expect(box.disabled).toBe(false);
      expect(box.getAttribute('name')).toBeNull();
      expect(box.getAttribute('aria-readonly')).toBeNull();
      expect(box.getAttribute('aria-invalid')).toBeNull();
      expect(box.getAttribute('aria-label')).toBeNull();
      expect(box.getAttribute('aria-labelledby')).toBeNull();
      // No `format` and no `labels`: the platform's own `aria-valuenow` is the whole
      // announcement, and a `valuetext` beside it would be a second one.
      expect(box.getAttribute('aria-valuetext')).toBeNull();
      expect(partsOf(fixture, 'label')).toEqual([]);
      expect(partsOf(fixture, 'hint')).toEqual([]);
      expect(partsOf(fixture, 'error')).toEqual([]);
      expect(partsOf(fixture, 'mark')).toEqual([]);
      expect(partsOf(fixture, 'bubble')).toEqual([]);
    });

    it('and it runs along the inline axis until told otherwise', async () => {
      const host = (await render(BareHost)).nativeElement.querySelector(
        'pct-slider',
      ) as HTMLElement;

      expect(host.getAttribute('data-pct-orientation')).toBe('horizontal');
    });

    it('`invalid` with no touch is not a state the user is shown', async () => {
      expect(
        boxOf(await render(InvalidOnlyHost)).getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('a touch with nothing wrong is not a state either', async () => {
      expect(
        boxOf(await render(TouchedOnlyHost)).getAttribute('aria-invalid'),
      ).toBeNull();
    });

    it('a bound written as an attribute is read, and an unusable one is not a bound', async () => {
      // `numberAttribute` would answer `NaN` here, and `NaN` in a `calc()` is a track
      // nobody can see. The three cases are the three the reader was written for.
      const fixture = await render(AttributeBoundsHost);
      const [empty, junk, text] = [
        ...(fixture.nativeElement as HTMLElement).querySelectorAll('input'),
      ];

      expect(empty.max).toBe('100');
      expect(junk.max).toBe('100');
      expect(text.max).toBe('60');
    });
  });

  describe('marks the slider will not draw', () => {
    it('says which numbers produced a band instead of ticks', async () => {
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = await render(TooManyMarksHost);
      await fixture.whenStable();

      expect(warn).toHaveBeenCalledTimes(1);
      const said = String(warn.mock.calls[0]?.[0] ?? '');
      expect(said).toContain('would be a grey band');
      expect(said).toContain('min=0');
      expect(said).toContain('max=100');
      expect(said).toContain('step=0.5');
      expect(said).toContain('Raise "step"');
      expect(partsOf(fixture, 'mark')).toEqual([]);

      warn.mockRestore();
    });

    it('and says nothing at all where no marks were asked for', async () => {
      // The same two hundred intervals: what makes the sentence worth printing is that
      // somebody asked for ticks and will not get them.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = await render(NoMarksAskedHost);
      await fixture.whenStable();

      expect(warn).not.toHaveBeenCalled();

      warn.mockRestore();
    });

    it('the boundary count is still drawn, and still silent', async () => {
      // 50 intervals is the last legible number rather than the first illegible one, and
      // a comparison written one step off is exactly what nobody would notice.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = await render(BoundaryMarksHost);
      await fixture.whenStable();

      expect(partsOf(fixture, 'mark')).toHaveLength(51);
      expect(warn).not.toHaveBeenCalled();

      warn.mockRestore();
    });

    it('a step of zero divides nothing, and the count says zero rather than infinity', async () => {
      // `span / 0` is `Infinity`, and an interval count of `Infinity` is above the
      // legibility ceiling — so the marks disappear either way and only the WARNING can
      // tell the guarded division from the unguarded one.
      const warn = vi
        .spyOn(console, 'warn')
        .mockImplementation(() => undefined);

      const fixture = await render(ZeroStepMarksHost);
      await fixture.whenStable();

      expect(partsOf(fixture, 'mark')).toEqual([]);
      expect(warn).not.toHaveBeenCalled();

      warn.mockRestore();
    });

    it('a step of zero divides nothing and draws nothing', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.marks.set(true);
      fixture.componentInstance.step.set(0);
      await fixture.whenStable();

      expect(partsOf(fixture, 'mark')).toEqual([]);
    });

    it('a negative step is not a step either', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.marks.set(true);
      fixture.componentInstance.step.set(-10);
      await fixture.whenStable();

      expect(partsOf(fixture, 'mark')).toEqual([]);
    });

    it('and a span of zero leaves no interval to mark', async () => {
      const fixture = await render(Host);
      fixture.componentInstance.marks.set(true);
      fixture.componentInstance.lo.set(5);
      fixture.componentInstance.hi.set(5);
      await fixture.whenStable();

      expect(partsOf(fixture, 'mark')).toEqual([]);
    });
  });
});
