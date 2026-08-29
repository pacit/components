import {
  ApplicationRef,
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PctSkeleton, PctSkeletonShape } from './skeleton';

/**
 * Five arrangements, and the second is the one that earns its place.
 *
 * **bound** binds both inputs and stands inside a region that says it is busy — the correct
 * arrangement, and what most cases ask their questions of. **bare** binds nothing and stands
 * inside nothing: it is the only place the defaults of `lines` and `shape` are ever observed,
 * and the only place the dev-mode sentence is ever produced, because a host that binds an
 * input cannot see what happens without it (the shape the accordion's mutation run found six
 * times, the pagination's three more and the progress bar's four). **written** passes its
 * number as an ATTRIBUTE, which is the string path through the transform. **block** is the
 * other drawing, with a `lines` that must not reach it. **quiet** is a skeleton whose region
 * never says anything, with inputs that change afterwards.
 */
@Component({
  imports: [PctSkeleton],
  template: `
    <div aria-busy="true">
      <pct-skeleton data-testid="bound" [lines]="lines()" [shape]="shape()" />
    </div>
  `,
})
class Host {
  readonly lines = signal(3);
  readonly shape = signal<PctSkeletonShape>('text');
}

@Component({
  imports: [PctSkeleton],
  template: `<pct-skeleton data-testid="bare" />`,
})
class BareHost {}

@Component({
  imports: [PctSkeleton],
  template: `
    <div aria-busy="true">
      <pct-skeleton data-testid="written" lines="4" shape="text" />
    </div>
  `,
})
class AttributeHost {}

@Component({
  imports: [PctSkeleton],
  template: `
    <div aria-busy="true">
      <pct-skeleton data-testid="block" shape="block" [lines]="3" />
    </div>
  `,
})
class BlockHost {}

/** A busy region three levels above the skeleton — the walk has to leave the parent. */
@Component({
  imports: [PctSkeleton],
  template: `
    <section aria-busy="true">
      <div>
        <p><pct-skeleton data-testid="deep" /></p>
      </div>
    </section>
  `,
})
class DeepHost {}

/** A region that says it is NOT busy, which is a skeleton drawn over a settled answer. */
@Component({
  imports: [PctSkeleton],
  template: `<div aria-busy="false">
    <pct-skeleton data-testid="settled" />
  </div>`,
})
class SettledHost {}

/** Nothing says anything here, and then the inputs move. */
@Component({
  imports: [PctSkeleton],
  template: `
    <div [attr.aria-busy]="busy() ? 'true' : null">
      <pct-skeleton data-testid="quiet" [lines]="lines()" />
    </div>
  `,
})
class QuietHost {
  readonly busy = signal(false);
  readonly lines = signal(2);
}

/**
 * A rendered page, waited for through the `ApplicationRef` — which is what this component
 * needs and a `detectChanges()` alone would not give: the dev-mode reading is taken in an
 * `afterNextRender`, and a spec that never let those run would measure a warning that had not
 * happened yet.
 */
async function render<T>(type: Type<T>): Promise<ComponentFixture<T>> {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
  return fixture;
}

async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  fixture.detectChanges();
  await TestBed.inject(ApplicationRef).whenStable();
}

const skeleton = (testid: string) =>
  document.querySelector(
    `pct-skeleton[data-testid="${testid}"]`,
  ) as HTMLElement;

const bound = () => skeleton('bound');

const parts = (name: string, host: HTMLElement = bound()) => [
  ...host.querySelectorAll<HTMLElement>(`[data-pct-part="${name}"]`),
];

const tracks = (host: HTMLElement = bound()) => parts('track', host);

/** A spy that keeps the dev-mode sentence out of the run's output and readable in a case. */
const warnings = () =>
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);

/**
 * Restoring is not tidiness: a `vi.spyOn` over an already-spied method hands back the same
 * spy, history and all, so a spy created per case and never restored is one spy for the whole
 * file, and "was not called" then answers about every earlier case as well — including the
 * ones that render an unannounced skeleton on purpose
 * ([`lesson-135`](../../../../docs/lessons.md#lesson-135)).
 */
afterEach(() => {
  vi.restoreAllMocks();
});

describe('PctSkeleton — what it draws', () => {
  it('draws one bar per line, each with a sheen inside it', async () => {
    await render(Host);

    expect(tracks()).toHaveLength(3);
    for (const track of tracks())
      expect(track.querySelectorAll('[data-pct-part="fill"]')).toHaveLength(1);
  });

  it('follows the line count as it changes', async () => {
    const fixture = await render(Host);

    fixture.componentInstance.lines.set(1);
    await settle(fixture);
    expect(tracks()).toHaveLength(1);

    fixture.componentInstance.lines.set(7);
    await settle(fixture);
    expect(tracks()).toHaveLength(7);
  });

  it('is one line of text with nothing bound', async () => {
    warnings();
    await render(BareHost);

    // Both defaults read where they can be read at all. A host that binds an input cannot see
    // what happens without it, and `shape`'s default is exactly the shape of hole the
    // accordion's, the pagination's and the progress bar's mutation runs each found: with
    // `text` blanked, every arrangement that binds the input keeps drawing what it always did.
    expect(tracks(skeleton('bare'))).toHaveLength(1);
    expect(skeleton('bare').getAttribute('data-pct-shape')).toBe('text');
  });

  it('reads the count written as an attribute', async () => {
    await render(AttributeHost);

    expect(tracks(skeleton('written'))).toHaveLength(4);
  });

  it('is one box in the block shape, however many lines were asked for', async () => {
    // `lines` counts lines of TEXT and a box has none, so the input has nothing to count
    // here — it is not quietly multiplying the drawing.
    await render(BlockHost);

    expect(tracks(skeleton('block'))).toHaveLength(1);
  });

  it('says which drawing it is on the host, and says it with one attribute', async () => {
    const fixture = await render(Host);
    expect(bound().getAttribute('data-pct-shape')).toBe('text');

    fixture.componentInstance.shape.set('block');
    await settle(fixture);
    expect(bound().getAttribute('data-pct-shape')).toBe('block');
    expect(bound().classList.contains('pct-skeleton')).toBe(true);
  });
});

describe('PctSkeleton — the line count is a count', () => {
  it('takes a whole number of at least one, and answers with one for anything else', async () => {
    const fixture = await render(Host);
    const counted = async (written: unknown): Promise<number> => {
      fixture.componentInstance.lines.set(written as number);
      await settle(fixture);
      return tracks().length;
    };

    expect(await counted(0)).toBe(1);
    expect(await counted(-3)).toBe(1);
    expect(await counted('abc')).toBe(1);
    expect(await counted(null)).toBe(1);
    expect(await counted(undefined)).toBe(1);
    // And a fraction is floored rather than refused: two and a bit lines of text is two bars
    // and the beginning of a third nobody asked for.
    expect(await counted(2.7)).toBe(2);
  });

  it('answers with one for an infinite count, and answers at all', async () => {
    // The case is here for the second half of its own name. `lines` is the length of the
    // array the template repeats over, and `Array.from({ length: Infinity })` does not draw a
    // very long skeleton — it never returns, and a test that hangs reports nothing.
    const fixture = await render(Host);
    fixture.componentInstance.lines.set(Number.POSITIVE_INFINITY);
    await settle(fixture);

    expect(tracks()).toHaveLength(1);
  });
});

describe('PctSkeleton — it is a picture and says nothing', () => {
  it('hides itself from the accessibility tree', async () => {
    await render(Host);

    expect(bound().getAttribute('aria-hidden')).toBe('true');
  });

  it('writes no role, no name and no state of its own', async () => {
    await render(Host);

    // The whole of what a skeleton could wrongly claim: it is not a status, not a progress
    // bar and not a live region. The busy state is the region's (0037), and the region is the
    // consumer's element rather than this one.
    for (const attribute of [
      'role',
      'aria-label',
      'aria-labelledby',
      'aria-live',
      'aria-busy',
      'aria-valuenow',
    ])
      expect(bound().getAttribute(attribute)).toBeNull();
  });

  it('draws no text anywhere', async () => {
    await render(Host);

    expect(bound().textContent?.trim()).toBe('');
  });

  it('holds nothing a user can land on', async () => {
    await render(Host);

    // `aria-hidden` over anything focusable is axe's `aria-hidden-focus`, and it is the one
    // violation this component could cause — by growing a content slot. `check-aria` point 8
    // refuses that statically; this reads the rendered DOM for the same fact.
    expect(
      bound().querySelectorAll(
        'a[href], button, input, select, textarea, summary, [tabindex], [contenteditable]',
      ),
    ).toHaveLength(0);
  });
});

describe('PctSkeleton — the wait belongs to the region', () => {
  it('says nothing when a region above it is busy', async () => {
    const warn = warnings();
    await render(Host);

    expect(warn).not.toHaveBeenCalled();
  });

  it('finds the busy region however far above it stands', async () => {
    const warn = warnings();
    await render(DeepHost);

    // `closest` is the platform's own walk — the component asks the question instead of
    // reading its parent and hoping the region is exactly there.
    expect(warn).not.toHaveBeenCalled();
  });

  it('reports a skeleton with no busy region around it', async () => {
    const warn = warnings();
    await render(BareHost);

    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('reports one whose region says it is NOT busy', async () => {
    const warn = warnings();
    await render(SettledHost);

    // `aria-busy="false"` is the default value spelled out, so this is not a region that has
    // gone quiet — it is one that never said anything, with a placeholder drawn inside it.
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('says what is missing, where it goes and what the silence costs', async () => {
    const warn = warnings();
    await render(BareHost);

    // Four fragments, because the sentence is the whole of what stands between a consumer and
    // a wait no screen reader hears: the attribute, the element it belongs on, the fact that
    // the placeholder itself is silent, and what that silence costs.
    const said = warn.mock.calls[0][0] as string;
    expect(said).toContain('aria-busy="true"');
    expect(said).toContain('the element the content will land in');
    expect(said).toContain('hidden from the accessibility tree');
    expect(said).toContain('announced to nobody');
  });

  it('reports once and not again as the drawing changes', async () => {
    const warn = warnings();
    const fixture = await render(QuietHost);
    expect(warn).toHaveBeenCalledTimes(1);

    fixture.componentInstance.lines.set(5);
    await settle(fixture);
    fixture.componentInstance.busy.set(true);
    await settle(fixture);

    // The reading is taken where it means something — when the placeholder first stands in
    // the document. A sentence repeated on every change would be noise nobody reads, and a
    // region that becomes busy afterwards has answered the warning rather than earned another.
    expect(warn).toHaveBeenCalledTimes(1);
    expect(tracks(skeleton('quiet'))).toHaveLength(5);
  });
});

describe('PctSkeleton — the parts a skin reaches for', () => {
  it('exposes the placeholder and the sheen under the progress bar’s own names', async () => {
    await render(Host);

    // The same two names one component over, deliberately: a skeleton is an indeterminate
    // progress bar wearing the shape of the content, so one selector styles both.
    expect(parts('track')).toHaveLength(3);
    expect(parts('fill')).toHaveLength(3);
  });

  it('keeps the sheen inside the placeholder it travels across', async () => {
    await render(Host);

    for (const track of tracks())
      expect(track.firstElementChild?.getAttribute('data-pct-part')).toBe(
        'fill',
      );
  });
});
