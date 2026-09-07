import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSize, PctTone, providePctConfig } from '@pacit/components/core';
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
      [tone]="tone()"
    />
  `,
})
class Host {
  readonly value = signal<number | null>(40);
  readonly max = signal(100);
  readonly ariaLabel = signal('Uploading');
  readonly ariaLabelledby = signal('');
  readonly size = signal<PctSize>('md');
  readonly tone = signal<PctTone | null>(null);
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
  it('draws three with no tone: the bar, the groove and the fill', async () => {
    const fixture = await render(Host);

    expect(track().tagName).toBe('PROGRESS');
    expect(fill().tagName).toBe('DIV');
    expect(part('bar').tagName).toBe('DIV');
    expect(bound().querySelectorAll('[data-pct-part]')).toHaveLength(3);

    // The mark is the fourth, and it exists only when there is something for it to mean: a
    // bar with no tone is the bar this component drew before tones existed (plan 4.14).
    fixture.componentInstance.tone.set('danger');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bound().querySelectorAll('[data-pct-part]')).toHaveLength(4);
    expect(part('icon').getAttribute('name')).toBe('danger');
  });

  it('writes the tone as a state attribute, and nothing when there is none', async () => {
    const fixture = await render(Host);
    expect(bound().hasAttribute('data-pct-tone')).toBe(false);
    expect(part('icon')).toBeNull();

    for (const tone of ['success', 'warning', 'danger', 'info'] as const) {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();
      await fixture.whenStable();
      expect(bound().getAttribute('data-pct-tone')).toBe(tone);
      // The drawing is the half a colour cannot carry, so each tone has its own name and
      // each name its own path — a set that all resolved to one icon would be a colour again.
      expect(part('icon').getAttribute('name')).toBe(tone);
      expect(part('icon').querySelectorAll('svg')).toHaveLength(1);
    }

    fixture.componentInstance.tone.set(null);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(bound().hasAttribute('data-pct-tone')).toBe(false);
    expect(part('icon')).toBeNull();
  });

  it('draws the fill outside the element, because a <progress> renders no children', async () => {
    await render(Host);

    // Measured in three engines before it was written this way: the content of a `<progress>`
    // is fallback for browsers that predate it, and no engine here paints it.
    expect(track().children).toHaveLength(0);
    // The bar and not the host, since tones arrived: the clip moved down one element so a
    // mark could stand beside the groove rather than be cut to its height.
    expect(fill().parentElement).toBe(part('bar'));
    expect(part('bar').parentElement).toBe(bound());
  });
});

/**
 * The component's own compiled stylesheet, found by a rule nothing else in the document can
 * carry. Its rules are read one by one rather than through `getComputedStyle`, and both halves
 * of that are measured rather than preferred:
 *
 * the host's own rule never reaches `getComputedStyle` here at all. Sass prints
 * `@charset "UTF-8";` at the top of this sheet — the comments in it are not ASCII — and
 * jsdom's CSS parser folds that line into the FIRST selector, so the rule matches nothing.
 * Measured: with the clip in place `getComputedStyle(host).overflow` is `''` while the rule's
 * own `style` carries `hidden`;
 *
 * and no media query of forced-colors mode matches in this environment, so the block at the
 * bottom of the sheet has no other reading than this one.
 *
 * What this cannot do is see the picture — jsdom computes no layout, so no case here watches a
 * band leave a groove. The declarations are the mechanism; the pixels are owed to a browser
 * (`apps/sandbox-e2e`).
 */
function sheet(): CSSStyleSheet {
  const found = (Array.from(document.styleSheets) as CSSStyleSheet[]).find(
    (candidate) =>
      Array.from(candidate.cssRules).some((rule) =>
        rule.cssText.includes('pct-progress__fill'),
      ),
  );
  if (!found)
    throw new Error(
      'progress.scss is not in the document: the cases below would read nothing',
    );
  return found;
}

const styleRules = (rules: CSSRuleList): CSSStyleRule[] =>
  Array.from(rules).filter(
    (rule): rule is CSSStyleRule => 'selectorText' in rule,
  );

/**
 * The one rule of the host box itself. `:host` compiles to an `_nghost-…` attribute, which the
 * size rules and the indeterminate rule also carry — hence the second half of the filter. A
 * count other than one is thrown rather than picked from, because a silent `[0]` is how a
 * selector that stopped matching becomes a case that stopped asking.
 */
function only(rules: CSSStyleRule[], what: string): CSSStyleRule {
  if (rules.length !== 1)
    throw new Error(`expected exactly one ${what} rule, found ${rules.length}`);
  return rules[0];
}

/** The clipping box's own rule — the host's until tones moved the pipe down one element. */
const barRule = (rules: CSSRuleList) =>
  only(
    styleRules(rules).filter((rule) =>
      rule.selectorText.includes('pct-progress__bar'),
    ),
    'bar',
  );

const hostRule = (rules: CSSRuleList) =>
  only(
    styleRules(rules).filter(
      (rule) =>
        rule.selectorText.includes('_nghost') &&
        !rule.selectorText.includes('data-pct'),
    ),
    'host',
  );

/** The `<progress>` itself, without the three engine pseudo-elements written beside it. */
const trackRule = (rules: CSSRuleList) =>
  only(
    styleRules(rules).filter(
      (rule) =>
        rule.selectorText.includes('pct-progress__track') &&
        !rule.selectorText.includes('::'),
    ),
    'track',
  );

/** The band's travel, as `{ from, to }` of the property it moves by. */
function travel(rules: CSSRuleList): Record<string, string> {
  const frames = Array.from(rules).find(
    (rule): rule is CSSKeyframesRule =>
      rule.constructor.name === 'CSSKeyframesRule',
  );
  if (!frames) throw new Error('the band has no keyframes in this sheet');
  return Object.fromEntries(
    (Array.from(frames.cssRules) as CSSKeyframeRule[]).map((frame) => [
      frame.keyText,
      frame.style.getPropertyValue('inset-inline-start'),
    ]),
  );
}

/** The rules of `@media (forced-colors: active)`, which nothing in jsdom matches. */
function forcedColours(rules: CSSRuleList): CSSRuleList {
  const block = Array.from(rules).find(
    (rule): rule is CSSMediaRule =>
      rule.constructor.name === 'CSSMediaRule' &&
      (rule as CSSMediaRule).media.mediaText.includes('forced-colors'),
  );
  if (!block) throw new Error('the sheet has no forced-colors block');
  return block.cssRules;
}

describe('PctProgress — the pipe the indeterminate band travels inside', () => {
  it('reads the component’s own sheet, and says so when there is nothing to read', async () => {
    await render(Host);
    const rules = sheet().cssRules;

    // The denominator of the two cases below (`lesson-48`): they ask three rules three
    // questions, and a sheet that arrived without any of them would let them pass by having
    // nothing to contradict. Here the finders run for their own sake — each throws by name.
    expect(hostRule(rules).style.cssText).not.toBe('');
    expect(trackRule(rules).style.cssText).not.toBe('');
    expect(Object.keys(travel(rules)).sort()).toEqual(['from', 'to']);
    expect(styleRules(forcedColours(rules)).length).toBeGreaterThan(0);
  });

  it('clips the band, because the band’s own travel takes it outside the groove', async () => {
    await render(Host);
    const rules = sheet().cssRules;

    // The escape first, since it is the reason the clip exists: the band starts a whole
    // band-width BEFORE the groove and ends a whole groove-width past it, so for most of every
    // loop it is drawn outside the bar — over whatever the consumer put beside it.
    expect(travel(rules)).toEqual({
      from: 'calc(-1 * var(--pct-progress-fill-size))',
      to: '100%',
    });

    // What stops it is the box it is positioned against, which is the BAR: the fill is
    // absolute and the bar is the containing block, so the bar's overflow is the boundary of
    // its painting. That box was the host until a tone needed a mark beside the groove — and
    // the mark could not stand inside a box that clips to the height of a groove.
    expect(getComputedStyle(fill()).position).toBe('absolute');
    const host = barRule(rules);
    expect(host.style.getPropertyValue('position')).toBe('relative');
    expect(host.style.getPropertyValue('overflow')).toBe('hidden');

    // And the clip is as round as the groove. Measured in chromium: a square clip over a
    // pill-shaped groove cuts the band's ends straight and leaves the groove's own corners
    // showing beside them — the same defect one radius smaller.
    expect(host.style.getPropertyValue('border-radius')).toBe(
      'var(--pct-progress-track-radius)',
    );
  });

  it('draws the groove’s forced-colors ring on the box that clips, not on the box it clips', async () => {
    await render(Host);
    const forced = forcedColours(sheet().cssRules);

    // The price of the clip above, and the reason this case exists. An outline is painted
    // OUTSIDE the box that draws it, so the clip decides where the ring may be written.
    // Measured in chromium, both halves: a clipping box erases a DESCENDANT's outline outright
    // — a 30px ring on a child that fills the box paints nothing at all, and widening the ring
    // changes nothing, so it is a clip and not a bleed — while the ring the clipping box draws
    // ITSELF is untouched by its own `overflow`. Moved back onto the `<progress>`, the ring
    // would be a groove with no visible extent in the one mode it exists for, and no screenshot
    // in ordinary colours would show it: the two boxes are one rectangle, so the drawing is
    // identical everywhere else.
    expect(barRule(forced).style.getPropertyValue('outline')).toBe(
      '1px solid CanvasText',
    );
    expect(trackRule(forced).style.getPropertyValue('outline')).toBe('');

    // The groove keeps its surface where it always was: the ring says where it ends, `Field`
    // says the middle of it is a groove and not the page.
    expect(trackRule(forced).style.getPropertyValue('background')).toBe(
      'Field',
    );
  });
});
