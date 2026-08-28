import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { PctAutosize } from './autosize';
import { PctText } from './text';

/**
 * What a unit run can and cannot say about a height.
 *
 * jsdom has no layout: `scrollHeight` is 0 for every element in it, so the measured road's
 * arithmetic has nothing to be right or wrong about here. What this file proves is the
 * PLUMBING — that the floor and the ceiling reach the element as lengths the engine can
 * read, that the directive only matches where it is meant to, and that each of the three
 * ways a value can change ends in a call to `fit`. What the numbers are is
 * `apps/sandbox-e2e/src/textarea.spec.ts`'s question, and it is asked in three engines
 * because only a browser can answer it ([`lesson-82`](../../../../docs/lessons.md#lesson-82)
 * on the same split).
 */

const areaOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector('textarea') as HTMLTextAreaElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

@Component({
  imports: [PctText, PctAutosize],
  template: `<textarea
    pctText
    pctAutosize
    [rows]="rows()"
    [maxRows]="maxRows()"
    [(value)]="value"
  ></textarea>`,
})
class Host {
  rows = signal(2);
  maxRows = signal(0);
  value = signal('');
}

@Component({
  imports: [PctText, PctAutosize, ReactiveFormsModule],
  template: `<textarea
    pctText
    pctAutosize
    rows="2"
    [formControl]="control"
  ></textarea>`,
})
class ClassicHost {
  control = new FormControl('');
}

@Component({
  imports: [PctText],
  template: `<textarea pctText rows="2"></textarea>`,
})
class PlainHost {}

describe('PctAutosize — a height that follows the text', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
  });

  it('marks the element for the stylesheet that carries the feature', async () => {
    const fixture = await render(Host);

    // The directive has no stylesheet of its own — two components cannot share an element,
    // so `PctText` is the component here and this is a directive. The rules live in
    // `text.scss` behind exactly this attribute.
    expect(areaOf(fixture).hasAttribute('data-pct-autosize')).toBe(true);
  });

  it('does not touch a textarea that did not ask for it', async () => {
    const fixture = await render(PlainHost);

    expect(areaOf(fixture).hasAttribute('data-pct-autosize')).toBe(false);
    expect(areaOf(fixture).style.getPropertyValue('--_pct-text-rows')).toBe('');
  });

  /**
   * The floor is the platform's `rows`, and it has to reach BOTH roads: the custom property
   * for the sheet, which gives `field-sizing: content` back the attribute it discards, and
   * the attribute itself for the measured road, which takes its floor from the element's own
   * sizing. A directive input named `rows` swallows a bound `[rows]`, so it is written back.
   */
  it('publishes the floor as a length for the sheet and as the attribute for the engine', async () => {
    const fixture = await render(Host);
    const area = areaOf(fixture);

    expect(area.style.getPropertyValue('--_pct-text-rows')).toBe('2');
    expect(area.getAttribute('rows')).toBe('2');

    fixture.componentInstance.rows.set(5);
    await fixture.whenStable();

    expect(area.style.getPropertyValue('--_pct-text-rows')).toBe('5');
    expect(area.getAttribute('rows')).toBe('5');
  });

  /**
   * The ceiling has no native spelling, so it is an input — and it travels as `lh`, which
   * leaves the arithmetic to the engine's own line box in both roads.
   */
  it('writes the ceiling in line units, and writes none when there is no ceiling', async () => {
    const fixture = await render(Host);
    const area = areaOf(fixture);

    expect(area.style.maxBlockSize).toBe('');
    expect(area.hasAttribute('data-pct-capped')).toBe(false);

    fixture.componentInstance.maxRows.set(4);
    await fixture.whenStable();

    expect(area.style.maxBlockSize).toBe('4lh');
    // The scrollbar is switched on by the attribute, not by the length: an uncapped box has
    // `overflow-y: hidden`, or the measured road's reset would flash a scrollbar and read a
    // narrower line than the one on the screen.
    expect(area.hasAttribute('data-pct-capped')).toBe(true);

    fixture.componentInstance.maxRows.set(0);
    await fixture.whenStable();

    expect(area.style.maxBlockSize).toBe('');
    expect(area.hasAttribute('data-pct-capped')).toBe(false);
  });

  it('warns when the ceiling is put below the floor, where CSS would keep the floor and say nothing', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);

    fixture.componentInstance.rows.set(6);
    fixture.componentInstance.maxRows.set(3);
    await fixture.whenStable();

    expect(warn).toHaveBeenCalledTimes(1);
    // The whole sentence, and not its first clause: what a warning is FOR is the two
    // halves that follow — what the platform will do instead, and what to change.
    const said = String(warn.mock.calls[0][0]);
    expect(said).toContain('maxRows (3) is below rows (6)');
    expect(said).toContain('the ceiling stands under the floor');
    expect(said).toContain('Raise maxRows or lower rows');
    warn.mockRestore();
  });

  it('says nothing about a ceiling standing exactly ON its floor', async () => {
    // The boundary the comparison is written at: `maxRows === rows` is a ceiling of one
    // line's room, not a contradiction, and CSS keeps it.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);

    fixture.componentInstance.rows.set(4);
    fixture.componentInstance.maxRows.set(4);
    await fixture.whenStable();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('says nothing about a ceiling that stands above its floor', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fixture = await render(Host);

    fixture.componentInstance.maxRows.set(8);
    await fixture.whenStable();

    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  /**
   * The three ways a value can change, counted where a unit run can see them. `fit` writes
   * `style.height` on every call in the measured road and never in the platform one, so what
   * this asserts is which road the run is on — and jsdom, having no `CSS.supports`, is on
   * the measured one, which is the branch worth exercising.
   */
  it('follows a value the control owns', async () => {
    const fixture = await render(Host);
    const area = areaOf(fixture);
    const height = vi.spyOn(area.style, 'height', 'set');

    fixture.componentInstance.value.set('one\ntwo\nthree');
    await fixture.whenStable();

    // No layout in jsdom, so the height cannot be RIGHT here — only written, which is what
    // says the effect is wired to the value at all. Two writes: the reset and the reading.
    expect(height).toHaveBeenCalledTimes(2);
    expect(height.mock.calls[0][0]).toBe('auto');
    // jsdom lays nothing out, so `scrollHeight` is 0 and what is left is the border it does
    // report — the arithmetic, with no geometry under it.
    expect(height.mock.calls[1][0]).toBe('2px');
    height.mockRestore();
  });

  /**
   * The other road, forced. An engine that sizes a field to its content is handed the whole
   * feature by CSS, so the directive installs nothing and writes no height — and this is the
   * only place that branch can be walked at all, jsdom having no `CSS` object to answer with.
   */
  it('writes no height where the engine sizes the field itself', async () => {
    const globals = globalThis as { CSS?: unknown };
    globals.CSS = { supports: () => true };
    try {
      const fixture = await render(Host);
      const area = areaOf(fixture);

      fixture.componentInstance.value.set('one\ntwo\nthree');
      await fixture.whenStable();

      expect(area.style.height).toBe('');
      // The floor and the ceiling are still published: on that road they ARE the feature's
      // two halves the property does not cover.
      expect(area.style.getPropertyValue('--_pct-text-rows')).toBe('2');
    } finally {
      delete globals.CSS;
    }
  });

  /**
   * The loop guard, which is the whole reason the observer reads a width at all: our own
   * `fit` changes the height and wakes the observer again
   * ([`lesson-110`](../../../../docs/lessons.md#lesson-110)). jsdom has no `ResizeObserver`,
   * so one is lent to it — what is under test is the guard, not the browser's dispatching.
   */
  it('measures again for a width that changed and not for a height it changed itself', async () => {
    const globals = globalThis as { ResizeObserver?: unknown };
    let wake = () => undefined as void;
    globals.ResizeObserver = class {
      constructor(callback: () => void) {
        wake = callback;
      }
      // Nothing to record: the directive is what is under test, and it only ever calls
      // these two.
      observe() {
        return undefined;
      }
      disconnect() {
        return undefined;
      }
    };
    try {
      const fixture = await render(Host);
      const area = areaOf(fixture);
      const height = vi.spyOn(area.style, 'height', 'set');

      // The width jsdom reports never changes, so this is the wake that follows our own
      // write — and it must lead to nothing.
      wake();
      expect(height).not.toHaveBeenCalled();

      Object.defineProperty(area, 'clientWidth', {
        value: 123,
        configurable: true,
      });
      wake();

      expect(height).toHaveBeenCalledTimes(2);
      height.mockRestore();
    } finally {
      delete globals.ResizeObserver;
    }
  });

  /**
   * The one a browser had to teach us: `patchValue` writes the DOM through
   * `DefaultValueAccessor` and dispatches nothing, and `NgControl.valueChanges` is `null`
   * for the whole of a sibling directive's constructor
   * ([`lesson-114`](../../../../docs/lessons.md#lesson-114)). Subscribed there, this test
   * passes and the feature does not work.
   */
  it('subscribes to a classic form late enough that the control is bound', async () => {
    const fixture = await render(ClassicHost);
    const area = areaOf(fixture);
    const height = vi.spyOn(area.style, 'height', 'set');

    fixture.componentInstance.control.patchValue('one\ntwo\nthree');
    await fixture.whenStable();

    // Two writes per fit: the reset to `auto` and the measured height after it.
    expect(height).toHaveBeenCalledTimes(2);
    expect(height.mock.calls[0][0]).toBe('auto');
    height.mockRestore();
  });
});
