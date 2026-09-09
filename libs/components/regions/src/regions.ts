import {
  computed,
  DestroyRef,
  Directive,
  effect,
  ElementRef,
  inject,
  Injectable,
  input,
  Provider,
  signal,
} from '@angular/core';
import { PCT_REGIONS, PctRegion, PctRegionsApi } from '@pacit/components/core';

/**
 * The regions of a page and the way a keyboard reaches one that is not where the reading order
 * says it is.
 *
 * **The problem this exists for is a real measurement, not a convention.** A toast's `Undo` is
 * a control on a card that is a child of `body`, so it stands after every control on the page:
 * a keyboard user who wants it walks the whole document first. A navigation drawer written at
 * the end of a template has the mirror-image problem — it is somewhere, and it is the wrong
 * somewhere. Both are "reachable in principle", which is not the promise "reachable" makes
 * (plan 4.16).
 *
 * **The keystroke is the consumer's to install, and that is the decision.** Several
 * implementations answer this with F6, others with F8, and this repository has measured nothing
 * about which one an application has free. A library that installs a document-level listener is
 * taking a key away from an application that never offered one — so this ships the MECHANISM
 * and mounts nothing: {@link PctRegionKey} listens on the element a consumer puts it on, F6 by
 * default and configurable, and the document is left alone
 * ([`req-api-platform`](../../../../docs/requirements/api.md#req-api-platform), 0072).
 *
 * Order is the DOCUMENT's, read at the moment of the press rather than kept: a region inside an
 * `@if` would otherwise take its place in the cycle from whenever it happened to be created.
 * The toast's stack sits last, exactly where it sits in the tab order — the cycle is not there
 * to reorder the page, it is there to make one hop out of a walk.
 */
@Injectable()
export class PctRegions implements PctRegionsApi {
  private readonly registered = signal<readonly PctRegion[]>([]);

  /** The registered regions, in the order a reader meets them. */
  readonly regions = computed(() =>
    [...this.registered()].sort((a, b) =>
      // eslint-disable-next-line no-bitwise
      a.element.compareDocumentPosition(b.element) &
      Node.DOCUMENT_POSITION_FOLLOWING
        ? -1
        : 1,
    ),
  );

  /**
   * The key a consumer chose, or `null` while nobody has. It is read by the parts of the
   * library that stand OUTSIDE the element the key is mounted on — the toast's stack is a
   * child of `body`, so a press inside it never reaches an application's root — and it is the
   * whole reason this service knows about a key at all.
   */
  readonly key = signal<string | null>(null);

  /** Declares the key a consumer chose — see the field above for who reads it. */
  useKey(key: string): void {
    this.key.set(key);
  }

  /** Adds a region and hands back the way to take it out again. */
  register(region: PctRegion): () => void {
    this.registered.update((list) => [...list, region]);
    return () =>
      this.registered.update((list) => list.filter((r) => r !== region));
  }

  /**
   * Moves focus to the region after the one holding focus now, wrapping at the end. Returns
   * whether anything moved, so a caller can leave the key to the application when it did not.
   *
   * A region is focused as a WHOLE — the element itself, not the first control inside it. That
   * is what the pattern is for: the user arrives at a named place and walks it with Tab, and a
   * jump straight to a control would skip whatever the region says about itself.
   */
  next(from: Element | null): boolean {
    const regions = this.regions();
    const here = regions.findIndex((r) => r.element.contains(from));
    // One guard and not two. An `if (regions.length === 0) return false` above this line
    // shadowed the one below it — with no regions, `(-1 + 1) % 0` is `NaN`, `regions[NaN]`
    // is `undefined`, and this returns the same `false` by the same road. Two guards where
    // one answers means neither can be measured: each is equivalent while the other stands,
    // and the mutation run said so in the only way it can (4.48).
    const target = regions[(here + 1) % regions.length];
    if (target === undefined) return false;

    // A region is a place, not a control, so it is not focusable by itself. `-1` makes it
    // focusable by script and leaves it out of the tab order, which is the whole point: the
    // cycle is a hop, and the walk inside it is still Tab's.
    if (!target.element.hasAttribute('tabindex'))
      target.element.setAttribute('tabindex', '-1');
    target.element.focus();
    return true;
  }
}

/**
 * Declares its element a region the keyboard can be sent to.
 *
 * A region is a place with a name: the page's navigation, its main content, a stack of
 * messages. The name comes from the element when it names itself (`aria-label`, or a heading
 * an `aria-labelledby` points at) and from {@link PctRegionDirective.pctRegion} when it does
 * not — a place the keyboard lands on with nothing to announce is a place the user has to
 * guess at.
 *
 * @example
 * <nav pctRegion="Site navigation">…</nav>
 * <main pctRegion="Main content">…</main>
 */
@Directive({
  selector: '[pctRegion]',
  host: { '[attr.data-pct-region]': '""' },
})
export class PctRegionDirective {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * What a reader hears on arrival, for an element that does not name itself.
   *
   * `alias` and not a property called `pctRegion`, which is the shape this repository already
   * uses for `[pctTooltip]` — and here it is a measurement rather than a house style: with the
   * property named after the selector, `pctRegion="Navigation"` left the signal at its default
   * and every region registered with an empty name.
   */
  readonly label = input('', { alias: 'pctRegion' });

  constructor() {
    const remove = inject(PCT_REGIONS)!.register({
      element: this.host.nativeElement,
      label: this.label,
    });
    inject(DestroyRef).onDestroy(remove);
  }
}

/**
 * Mounts the region cycle's key on the element it stands on — and on nothing else.
 *
 * This is the half a consumer installs. The library never touches `document`: a key on the
 * document is a key taken from an application that did not offer one, and which key is free is
 * a question only that application can answer (0072). Put it on the element that holds the
 * page — the application's own root is the usual answer — and every region below it is in the
 * cycle.
 *
 * The default is **F6**, which is what several implementations use and what a screen-reader
 * user is most likely to try. It is an input because the disagreement is real: others use F8,
 * and an application that already owns F6 has to be able to say so.
 *
 * @example
 * <div class="app" pctRegionKey>…</div>
 * <div class="app" pctRegionKey key="F8">…</div>
 */
@Directive({
  selector: '[pctRegionKey]',
  host: { '(keydown)': 'onKey($event)' },
})
export class PctRegionKey {
  private readonly regions = inject(PCT_REGIONS)!;
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The key that moves focus on to the next region. */
  readonly key = input('F6');

  /**
   * Where the key is listened for: on this element (the default) or on the whole document.
   *
   * **The default is the honest one and it has a real hole in it**, which is why the other
   * value exists. A keydown reaches this element only when focus is already inside it, and a
   * page that has just loaded has focus on `body` — outside every element on it. So with
   * `host` the first press of a cold page does nothing, and the cycle starts working once the
   * user has tabbed into the page; measured, not assumed.
   *
   * `document` closes that hole, and it is a WORD THE CONSUMER WRITES: the library still
   * installs nothing anywhere by itself, and an application that says this has decided the key
   * is free for it to take (0072). It is the value the sandbox uses, because a sandbox is an
   * application.
   */
  readonly listenOn = input<'host' | 'document'>('host');

  constructor() {
    // The document listener is the consumer's word made real, and it is torn down with the
    // element like any other. `capture: false` deliberately: a press inside a region the
    // library owns is answered there first (the toast's stack), and this one steps aside on
    // an event already handled.
    // The service carries the key so that the parts of the library standing OUTSIDE this
    // element — the toast's stack, a child of `body` — can answer it without a second input.
    // An effect and not a line in the constructor: an input is not set when that runs.
    effect(() => this.regions.useKey(this.key()));

    effect((onCleanup) => {
      if (this.listenOn() !== 'document') return;
      const doc = this.host.nativeElement.ownerDocument;
      const listener = (event: Event) => this.onKey(event as KeyboardEvent);
      doc.addEventListener('keydown', listener);
      onCleanup(() => doc.removeEventListener('keydown', listener));
    });
  }

  protected onKey(event: KeyboardEvent): void {
    // Already answered — by the stack the press happened inside, or by this same directive on
    // the way up. Two listeners for one key is what `listenOn: 'document'` makes possible, and
    // this is the line that keeps it one hop rather than two.
    if (event.defaultPrevented) return;
    if (event.key !== this.key()) return;
    // A modifier means the user asked the browser for something, not us.
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (this.regions.next(this.host.nativeElement.ownerDocument.activeElement))
      event.preventDefault();
  }
}

/**
 * Installs the region cycle for an application.
 *
 * It is a provider and not a `providedIn: 'root'` service, and the reason is bytes rather than
 * taste: a root service is pinned into every bundle that imports the entrypoint it lives in,
 * so a cycle nobody uses would be a cycle everybody pays for. This way an application that
 * wants one says so once, in the same place it says everything else about itself.
 *
 * @example
 * bootstrapApplication(App, { providers: [providePctRegions()] });
 */
export function providePctRegions(): Provider[] {
  return [PctRegions, { provide: PCT_REGIONS, useExisting: PctRegions }];
}
