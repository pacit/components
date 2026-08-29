import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSize, providePctConfig } from '@pacit/components/core';
import { PctProgress } from './progress';

/**
 * Four arrangements, and only the first is the obvious one.
 *
 * **bound** has every input bound and is what most cases ask questions of. **bare** binds
 * nothing at all: it is the only place the defaults of `value`, `max`, `ariaLabel`,
 * `ariaLabelledby` and `size` are ever observed, because a host that binds an input is a host
 * that cannot see what happens without it — the shape the accordion's mutation run found six
 * times and the pagination's three more. **written** passes its numbers as ATTRIBUTES, which
 * is the string path through both transforms: `value="40"` reaches `progressValue` as text
 * and a `[value]="40"` would hand it a number that needed no turning. **captioned** is named
 * by the sentence beside it rather than by a string of its own, which is the other branch of
 * every `ariaLabel() || ariaLabelledby()` in the class.
 */
@Component({
  imports: [PctProgress],
  template: `
    <pct-progress
      data-testid="bound"
      [value]="value()"
      [max]="max()"
      [ariaLabel]="ariaLabel()"
      [ariaLabelledby]="ariaLabelledby()"
      [size]="size()"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(40);
  readonly max = signal(100);
  readonly ariaLabel = signal('Uploading');
  readonly ariaLabelledby = signal('');
  readonly size = signal<PctSize>('md');
}

@Component({
  imports: [PctProgress],
  template: `<pct-progress data-testid="bare" />`,
})
class BareHost {}

@Component({
  imports: [PctProgress],
  template: `
    <pct-progress
      data-testid="written"
      value="40"
      max="200"
      ariaLabel="Written"
    />
  `,
})
class AttributeHost {}

@Component({
  imports: [PctProgress],
  template: `
    <p id="caption">Copying files</p>
    <pct-progress
      data-testid="captioned"
      [value]="7"
      ariaLabelledby="caption"
    />
  `,
})
class CaptionHost {}

async function render<T>(
  type: Type<T>,
  providers: unknown[] = [],
): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
}

const bar = (testid: string) =>
  document.querySelector(
    `pct-progress[data-testid="${testid}"]`,
  ) as HTMLElement;

const bound = () => bar('bound');

const part = (name: string, host: HTMLElement = bound()) =>
  host.querySelector<HTMLElement>(`[data-pct-part="${name}"]`) as HTMLElement;

/** The `<progress>` itself — the element that carries every promise a reader hears. */
const track = (host: HTMLElement = bound()) =>
  part('track', host) as HTMLProgressElement;

const fill = (host: HTMLElement = bound()) => part('fill', host);

/** What the fill's inline style says, which is the only thing bound about it. */
const width = (host: HTMLElement = bound()) => fill(host).style.inlineSize;

/** The same as a number, for the fractions that do not divide evenly. */
const widthValue = (host: HTMLElement = bound()) => parseFloat(width(host));

/** A spy that keeps the dev-mode sentences out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

/**
 * The restore is not tidiness — without it the three "says nothing" cases below fail, and
 * they fail on calls no bar in them ever made.
 *
 * `vi.spyOn` over a method that is ALREADY spied hands back the same spy, history and all
 * (measured: a second `spyOn(console, 'warn')` in one case is `===` the first). So a spy
 * created per case and never restored is ONE spy for the whole file, and
 * `expect(warn).not.toHaveBeenCalled()` then answers about every earlier case as well — here,
 * the three that render the nameless bar on purpose
 * ([`lesson-135`](../../../../docs/lessons.md#lesson-135)).
 */
afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctProgress — the value, and what the element carries', () => {
  it('writes the value and the scale onto the <progress>, and the width onto the fill', async () => {
    await render(Host);

    expect(track().getAttribute('value')).toBe('40');
    expect(track().getAttribute('max')).toBe('100');
    expect(width()).toBe('40%');
  });

  it('is indeterminate when there is no value — the attribute is absent, not zero', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(null);
    await settle(fixture);

    // The absence is the whole point: an element with no `value` reaches the accessibility
    // tree with no value either, which is what "indeterminate" IS. A `value="0"` would say
    // the task has not started, which is a different claim (0049).
    expect(track().hasAttribute('value')).toBe(false);
    expect(bound().getAttribute('data-pct-indeterminate')).toBe('');
  });

  it('drops the indeterminate marker as soon as a number arrives', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(null);
    await settle(fixture);
    fixture.componentInstance.value.set(10);
    await settle(fixture);

    expect(bound().getAttribute('data-pct-indeterminate')).toBeNull();
    expect(track().getAttribute('value')).toBe('10');
  });

  it('binds no width at all while indeterminate, so the band in the sheet answers', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(null);
    await settle(fixture);

    // An inline `0%` would beat the stylesheet's band width and draw nothing.
    expect(width()).toBe('');
  });

  it('clamps a value above the scale, and the element carries the clamped number', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(150);
    await settle(fixture);

    expect(width()).toBe('100%');
    expect(track().getAttribute('value')).toBe('100');
  });

  it('clamps a negative value to nothing done', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(-5);
    await settle(fixture);

    expect(width()).toBe('0%');
    expect(track().getAttribute('value')).toBe('0');
  });

  it('reports the fraction of the scale, not of a hundred', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.max.set(200);
    fixture.componentInstance.value.set(50);
    await settle(fixture);

    expect(width()).toBe('25%');
    expect(track().getAttribute('value')).toBe('50');
    expect(track().getAttribute('max')).toBe('200');
  });

  it('keeps the fraction of a scale that does not divide evenly', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.max.set(3);
    fixture.componentInstance.value.set(1);
    await settle(fixture);

    expect(widthValue()).toBeCloseTo(33.33, 1);
    // The element keeps the consumer's own number, not the fraction it was turned into.
    expect(track().getAttribute('value')).toBe('1');
  });

  it('a full bar is a full bar and not an indeterminate one', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(100);
    await settle(fixture);

    expect(width()).toBe('100%');
    expect(bound().getAttribute('data-pct-indeterminate')).toBeNull();
  });

  it('zero is a value, not the absence of one', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(0);
    await settle(fixture);

    expect(track().getAttribute('value')).toBe('0');
    expect(bound().getAttribute('data-pct-indeterminate')).toBeNull();
    expect(width()).toBe('0%');
  });
});

describe('PctProgress — what a consumer can write, and what it turns into', () => {
  it('reads a value and a scale written as attributes', async () => {
    await render(AttributeHost);
    const host = bar('written');

    expect(track(host).getAttribute('value')).toBe('40');
    expect(track(host).getAttribute('max')).toBe('200');
    expect(width(host)).toBe('20%');
  });

  it('treats text that is not a number as no number at all', async () => {
    const fixture = await render(Host);
    // Through the input's own transform: `numberAttribute` would answer NaN here, and a NaN
    // travels through every comparison as `false` — the element would end up with an
    // attribute the browser ignores while every branch in the class thought it had a value.
    fixture.componentInstance.value.set('not a number' as unknown as number);
    await settle(fixture);

    expect(track().hasAttribute('value')).toBe(false);
    expect(bound().getAttribute('data-pct-indeterminate')).toBe('');
  });

  it('treats an empty string as no number at all', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('' as unknown as number);
    await settle(fixture);

    expect(track().hasAttribute('value')).toBe(false);
  });

  it('treats an undefined value as no number at all', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set(undefined as unknown as number);
    await settle(fixture);

    expect(track().hasAttribute('value')).toBe(false);
  });

  it('reads a numeric string as the number it spells', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.value.set('25' as unknown as number);
    await settle(fixture);

    expect(track().getAttribute('value')).toBe('25');
    expect(width()).toBe('25%');
  });

  it('falls back to the default scale when max is zero', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.max.set(0);
    await settle(fixture);

    // Not a scale, so the default stands in for it — 40 of 100 rather than a division by
    // zero, which would put `Infinity%` in the style attribute.
    expect(width()).toBe('40%');
    expect(track().getAttribute('max')).toBe('100');
  });

  it('falls back to the default scale when max is negative', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.max.set(-10);
    await settle(fixture);

    expect(width()).toBe('40%');
    expect(track().getAttribute('max')).toBe('100');
  });

  it('falls back to the default scale when max is not a number', async () => {
    const fixture = await render(Host);
    fixture.componentInstance.max.set(NaN);
    await settle(fixture);

    expect(width()).toBe('40%');
    expect(track().getAttribute('max')).toBe('100');
  });

  it('the bare bar is indeterminate, medium and scaled to a hundred', async () => {
    warnings();
    await render(BareHost);
    const host = bar('bare');

    expect(track(host).hasAttribute('value')).toBe(false);
    expect(track(host).getAttribute('max')).toBe('100');
    expect(host.getAttribute('data-pct-indeterminate')).toBe('');
    expect(host.getAttribute('data-pct-size')).toBe('md');
  });
});

describe('PctProgress — the name, and where it lands', () => {
  it('writes the name on the element that has the role, not on the tag', async () => {
    await render(Host);

    expect(track().getAttribute('aria-label')).toBe('Uploading');
    // On the host it would sit on an element ARIA gives no role to, where a screen reader
    // ignores it — the defect `check-aria` exists for (`req-a11y-built-in`).
    expect(bound().hasAttribute('aria-label')).toBe(false);
  });

  it('points at a caption instead, when that is what names it', async () => {
    await render(CaptionHost);
    const host = bar('captioned');

    expect(track(host).getAttribute('aria-labelledby')).toBe('caption');
    expect(track(host).hasAttribute('aria-label')).toBe(false);
  });

  it('writes neither attribute when there is no name to write', async () => {
    warnings();
    await render(BareHost);
    const host = bar('bare');

    // Absent rather than empty: an `aria-label=""` is a name of no characters, which readers
    // treat as a name — a different thing from having none.
    expect(track(host).hasAttribute('aria-label')).toBe(false);
    expect(track(host).hasAttribute('aria-labelledby')).toBe(false);
  });

  it('writes no ARIA of its own anywhere — the element publishes all of it', async () => {
    await render(Host);

    // The control for 0039 and `lesson-112`: everything a reader is told about a progress
    // bar's value comes from the `<progress>`, so an attribute of ours beside it would be an
    // echo nothing reads and nothing can contradict.
    for (const attribute of [
      'role',
      'aria-valuenow',
      'aria-valuemin',
      'aria-valuemax',
      'aria-valuetext',
      'aria-busy',
    ]) {
      expect(track().hasAttribute(attribute)).toBe(false);
      expect(bound().hasAttribute(attribute)).toBe(false);
    }
  });
});

describe('PctProgress — the dev-mode warning about a bar nobody can name', () => {
  it('warns about a bar with no name at all', async () => {
    const warn = warnings();
    await render(BareHost);

    // Four readings rather than one, and the reason is that this sentence IS the gate: the
    // library invents no name, so what stands between a consumer and an unnamed
    // `progressbar` is whether the console tells them which two inputs to reach for and why
    // there is no default. A message whose second half went missing would still match
    // "no accessible name" and would have stopped being any of that — measured, four
    // mutants blanking exactly those clauses survived the first run of this spec.
    for (const fragment of [
      '[pct-progress] A progress bar with no accessible name',
      '`ariaLabelledby` pointing at the caption',
      'supplies no default',
      'screen-reader user nothing',
    ]) {
      expect(warn).toHaveBeenCalledWith(expect.stringContaining(fragment));
    }
  });

  it('says nothing about a bar named by a string of its own', async () => {
    const warn = warnings();
    await render(AttributeHost);

    expect(warn).not.toHaveBeenCalled();
  });

  it('says nothing about a bar named by the caption beside it', async () => {
    const warn = warnings();
    await render(CaptionHost);

    expect(warn).not.toHaveBeenCalled();
  });

  it('speaks the moment the name is taken away', async () => {
    const warn = warnings();
    const fixture = await render(Host);
    expect(warn).not.toHaveBeenCalled();

    fixture.componentInstance.ariaLabel.set('');
    await settle(fixture);

    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('[pct-progress]'),
    );
  });
});

describe('PctProgress — the size axis', () => {
  it('takes its size from the configuration, and a binding overrides it', async () => {
    const fixture = await render(Host, [
      providePctConfig({ defaultSize: 'lg' }),
    ]);

    // Bound to `md` by the host, so the configuration is overridden here and observed by the
    // bare bar in its own case.
    expect(bound().getAttribute('data-pct-size')).toBe('md');

    fixture.componentInstance.size.set('sm');
    await settle(fixture);
    expect(bound().getAttribute('data-pct-size')).toBe('sm');
  });

  it('a bar that binds no size takes the configured default', async () => {
    warnings();
    await render(BareHost, [providePctConfig({ defaultSize: 'lg' })]);

    expect(bar('bare').getAttribute('data-pct-size')).toBe('lg');
  });
});

describe('PctProgress — the parts a consumer may style', () => {
  it('draws exactly two: the groove and the fill', async () => {
    await render(Host);

    expect(track().tagName).toBe('PROGRESS');
    expect(fill().tagName).toBe('DIV');
    expect(bound().querySelectorAll('[data-pct-part]')).toHaveLength(2);
  });

  it('draws the fill outside the element, because a <progress> renders no children', async () => {
    await render(Host);

    // Measured in three engines before it was written this way: the content of a `<progress>`
    // is fallback for browsers that predate it, and no engine here paints it.
    expect(track().children).toHaveLength(0);
    expect(fill().parentElement).toBe(bound());
  });
});
