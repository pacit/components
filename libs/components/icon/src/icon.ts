import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  createComponent,
  createEnvironmentInjector,
  DestroyRef,
  Directive,
  ElementRef,
  EnvironmentInjector,
  inject,
  Injectable,
  InjectionToken,
  input,
  isDevMode,
  OnInit,
  Provider,
  TemplateRef,
  Type,
} from '@angular/core';
import type { PctSize, PctTone } from '@pacit/components/core';
import type {
  PctIconId,
  PctIconRendering,
  PctIconSource,
} from './source.types';

/**
 * The icons the library draws, by the ROLE they play rather than by what they look like
 * (`req-api-icons`). `chevron-down` and not `arrow-down-16`: a consumer swapping it is
 * answering "what does the select's trigger show", not "which of my 16-pixel arrows".
 *
 * **The list is public API** and grows with the components that need a new one — a name here
 * is a promise that some component draws it and that supplying one replaces that drawing
 * ([0011](../../../../docs/decisions/0011-icons.md)). `check-icons` holds both directions:
 * a name nothing draws is a promise nobody keeps, a drawing with no name cannot be swapped.
 *
 * **The four tones arrived together, and that was the point of waiting.** `success`, `warning`,
 * `danger` and `info` are the second channel a tone needs **wherever the thing wearing it can
 * stand with no words** — a toast, a progress bar — because a state painted in colour alone is
 * a state carried by colour alone ([`req-a11y-forced-colors`](../../../../docs/requirements/a11y.md#req-a11y-forced-colors)).
 * On a component that IS text the words are that channel and these drawings would only repeat
 * them, which is why the badge and the button wear tones and ship no glyph
 * ([0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)).
 * The set is one nobody's single component could judge: the toast wanted it, the progress
 * bar wanted the same four, and the field's error, the dialog's confirm and whatever the banner
 * turns out to be will want them too. Four names added once, by a decision, rather than one at a
 * time by whoever needed the first
 * ([0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)).
 *
 * @since 0.1.0
 */
export type PctIconName =
  | 'calendar'
  | 'check'
  | 'chevron-down'
  | 'close'
  | 'danger'
  | 'indeterminate'
  | 'info'
  | 'success'
  | 'user'
  | 'warning';

/**
 * What `providePctIcons` takes, any number of times: a set component, or a source.
 *
 * A **set** is a component whose templates are the icons, keyed by the library's roles
 * ([0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md)). A **source**
 * answers an id with data — a font's classes, an SVG drawing, a component — and may name
 * the roles in its own vocabulary ([0083](../../../../docs/decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).
 *
 * @since next
 */
export type PctIconSetOrSource = Type<unknown> | PctIconSource;

/**
 * ONE set component, as [0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md)
 * wrote it — kept in that shape so that whoever read or provided it keeps compiling and
 * running. A set standing here is read first, before everything `PCT_ICON_SOURCES` carries.
 *
 * The shape of the set is a measurement rather than a taste. A registry maps a name onto
 * markup, the only thing in Angular that carries markup a consumer wrote is a `TemplateRef`,
 * and a `TemplateRef` cannot exist without a component to live in — so the value a provider
 * holds is the component ([`lesson-85`](../../../../docs/lessons.md#lesson-85)).
 *
 * @since 0.1.0
 */
export const PCT_ICONS = new InjectionToken<Type<unknown>>('PCT_ICONS');

/**
 * The consumer's icons, in order of precedence: set components and sources alike — what
 * `providePctIcons(…)` provides ([0083](../../../../docs/decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).
 * A source holds no markup at all, which is why it can be a plain object.
 *
 * @since next
 */
export const PCT_ICON_SOURCES = new InjectionToken<
  readonly PctIconSetOrSource[]
>('PCT_ICON_SOURCES');

/**
 * Registers the application's icons, for the whole application or for one subtree
 * (`req-api-icons`). Every argument is a set component or a source, asked **in this order**:
 * the first that answers draws. A role no argument answers keeps the drawing the component
 * ships with, the same partial override as `providePctTexts`.
 *
 * One line is the whole of an application's icons: an adapter carries the library's roles
 * in its set's vocabulary, so the select's arrow and the toast's marks wear that set too.
 *
 * @example
 * // Every component draws with PrimeIcons, and `<pct-icon icon="bell">` is `pi pi-bell`.
 * bootstrapApplication(App, { providers: [providePctIcons(primeIcons())] });
 *
 * @example
 * // The application's own drawings first, a font for everything else.
 * providePctIcons(svgIcons({ logo: LOGO, house: House }), fontAwesome({ style: 'regular' }));
 *
 * @example
 * // PrimeIcons for the application's ids and the select's arrow; every other component
 * // keeps the drawing it ships with. `[]` keeps them all.
 * providePctIcons(primeIcons({ roles: ['chevron-down'] }));
 *
 * @example
 * // A set component, as before: its templates replace the roles they name.
 * @Component({
 *   imports: [PctIconTemplate],
 *   template: `
 *     <ng-template pctIcon="chevron-down"><i class="pi pi-chevron-down"></i></ng-template>
 *     <ng-template pctIcon="check"><i class="pi pi-check"></i></ng-template>
 *   `,
 * })
 * export class PrimeIcons {}
 *
 * bootstrapApplication(App, { providers: [providePctIcons(PrimeIcons)] });
 *
 * @since 0.1.0
 */
export function providePctIcons(...sources: PctIconSetOrSource[]): Provider[] {
  return [{ provide: PCT_ICON_SOURCES, useValue: sources }, PctIconSet];
}

/**
 * Where a set component's templates register while the set is being created.
 *
 * One per set, provided in the environment injector the set is created in — and **that
 * provider is not redundant**: a set written into a COMPONENT's `providers` puts the registry
 * in an element injector, so without an injector of the set's own the slots inside it would
 * resolve past it and find the application's set, or nothing.
 */
@Injectable()
class PctIconSetRegistry {
  private readonly icons = new Map<string, TemplateRef<void>>();

  register(name: PctIconName, template: TemplateRef<void>): void {
    this.icons.set(name, template);
  }

  read(id: string): TemplateRef<void> | null {
    return this.icons.get(id) ?? null;
  }

  names(): readonly string[] {
    return [...this.icons.keys()];
  }
}

/**
 * A set component read as a source: its templates are the renderings, its template names
 * are the roles it carries, and its ids are those same names.
 *
 * The set is built on first use: a component created **outside the document**, never
 * attached to `ApplicationRef` and never rendered. Its templates are all that is wanted, and
 * a `TemplateRef` is complete the moment the view holding it exists — the embedded views
 * made from it later belong to the `pct-icon` that renders them, so change detection
 * reaches them by their real place in the tree and not through this one.
 */
class PctIconComponentSource implements PctIconSource {
  private registry: PctIconSetRegistry | null = null;

  constructor(
    private readonly type: Type<unknown>,
    private readonly parent: EnvironmentInjector,
    private readonly destroyRef: DestroyRef,
  ) {}

  /**
   * The template names, each under itself: a set's roles are the names it registered.
   *
   * @since next
   */
  get roles(): Readonly<Partial<Record<PctIconName, string>>> {
    return Object.fromEntries(
      this.built()
        .names()
        .map((name) => [name, name]),
    );
  }

  resolve(id: string): PctIconRendering | null {
    const template = this.built().read(id);
    return template === null ? null : { kind: 'template', template };
  }

  private built(): PctIconSetRegistry {
    if (this.registry !== null) return this.registry;
    const registry = new PctIconSetRegistry();
    this.registry = registry;
    const injector = createEnvironmentInjector(
      [{ provide: PctIconSetRegistry, useValue: registry }],
      this.parent,
    );
    const ref = createComponent(this.type, { environmentInjector: injector });
    // The inputs of a directive are set on the first check of the view it stands in, and
    // the name is an input — so the registration happens in `ngOnInit`, and this is the
    // pass that runs it. The view is attached to nothing, so nothing else is checked here.
    ref.changeDetectorRef.detectChanges();
    // Both, and in this order: the component is a child of the injector, and an injector
    // destroyed with a live view under it leaves that view's `DestroyRef` hooks unrun.
    this.destroyRef.onDestroy(() => {
      ref.destroy();
      injector.destroy();
    });
    return registry;
  }
}

/**
 * The sources, in order, read by every `pct-icon` below the injector they were provided in.
 *
 * Deliberately **not** exported from the entrypoint: a consumer declares sources and never
 * touches the thing that reads them. `providePctIcons` puts it in the same injector as the
 * token, which is what makes a set scoped to a subtree possible — the icons of a section in
 * somebody else's design system stop where its providers do.
 */
@Injectable()
class PctIconSet {
  /** The one set of 0028, if somebody still provides it that way; it stands first. */
  private readonly legacy = inject(PCT_ICONS, { optional: true });
  private readonly entries = inject(PCT_ICON_SOURCES, { optional: true }) ?? [];
  private readonly parent = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  /** A set nobody reads is never built, so the list is made on the first read. */
  private sources: readonly PctIconSource[] | null = null;

  /** The first source that carries the role and answers for it, or `null`. */
  role(name: PctIconName): PctIconRendering | null {
    for (const source of this.all()) {
      const id = source.roles?.[name];
      if (id === undefined) continue;
      const rendering = source.resolve(id);
      if (rendering !== null) return rendering;
    }
    return null;
  }

  /** The first source that answers for the id, or `null`. */
  icon(id: string): PctIconRendering | null {
    for (const source of this.all()) {
      const rendering = source.resolve(id);
      if (rendering !== null) return rendering;
    }
    return null;
  }

  private all(): readonly PctIconSource[] {
    this.sources ??= [
      ...(this.legacy === null ? [] : [this.legacy]),
      ...this.entries,
    ].map((entry) =>
      typeof entry === 'function'
        ? new PctIconComponentSource(entry, this.parent, this.destroyRef)
        : entry,
    );
    return this.sources;
  }
}

/**
 * One icon of a set: an `<ng-template>` under the name it replaces (`req-api-icons`).
 *
 * The name is an **input of a union type**, not a directive selector, and that is what makes
 * a misspelling a compile error — `TS2820`, with the right name suggested. A slot's name in
 * `*pctTemplate="'option'"` is invisible to the compiler for the opposite reason: there the
 * string picks a slot the compiler has no type for ([`lesson-85`](../../../../docs/lessons.md#lesson-85)).
 *
 * @example
 * <ng-template pctIcon="check"><svg viewBox="0 0 16 16">…</svg></ng-template>
 *
 * @since 0.1.0
 */
@Directive({
  selector: 'ng-template[pctIcon]',
})
export class PctIconTemplate implements OnInit {
  /**
   * The icon this template draws.
   *
   * @since 0.1.0
   */
  readonly name = input.required<PctIconName>({ alias: 'pctIcon' });

  private readonly template = inject<TemplateRef<void>>(TemplateRef);
  private readonly registry = inject(PctIconSetRegistry, { optional: true });

  ngOnInit(): void {
    if (this.registry !== null) {
      this.registry.register(this.name(), this.template);
      return;
    }
    if (!isDevMode()) return;
    console.warn(
      `[pctIcon] The template for \`${this.name()}\` stands in no icon set. An icon set ` +
        `is the component handed to \`providePctIcons()\`, and a template written ` +
        `anywhere else is rendered by nobody.`,
    );
  }
}

/** The ids already warned about, so a list of a hundred rows says it once. */
const warned = new Set<string>();

/**
 * An icon: a drawing in a box the text around it sizes and colours (`req-api-icons`).
 *
 * **Two ways to say which.** `name` is a ROLE of the library — the select names
 * `chevron-down`, the toast names `danger` — and the drawing written as content is what a
 * consumer who registers nothing sees. `icon` is an id in the consumer's own set, answered by
 * the sources `providePctIcons(…)` registered: an icon font's class, an SVG drawing as data, a
 * component. One source may answer both, because a source that knows the library's roles
 * in its vocabulary says so, and then one line dresses every component in the application
 * ([0083](../../../../docs/decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).
 *
 * **The styling contract is this element and not what is inside it.** The box is `1em` and
 * inherits `color`; `size` steps it off the icon's own tokens and `tone` colours it with the
 * skin's four; a custom colour is `color` on the box or on anything above it. The drawing
 * paints itself in `currentColor` and owns nothing but its geometry
 * ([0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md)). A component that
 * reaches for the `stroke` of an `<svg>` is styling the one icon it happens to know, and
 * `check-styles` point 8 refuses it.
 *
 * **Hidden until named.** An icon beside text is a second reading of the same thing, so the
 * element is out of the accessibility tree and the meaning stays with the control
 * (`req-a11y-built-in`). An icon that IS the information — a status nobody wrote a word for —
 * takes a `label`, and then it is an image with that name. The one thing a label cannot do is
 * name a control: an icon-only button is named on the button.
 *
 * @example
 * <pct-icon icon="trash" tone="danger" />
 * <pct-icon icon="bell" label="Unread messages" />
 * <pct-icon name="chevron-down" data-pct-part="arrow">
 *   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M4 6l4 4 4-4" /></svg>
 * </pct-icon>
 *
 * @since 0.1.0
 */
@Component({
  selector: 'pct-icon',
  imports: [NgTemplateOutlet, NgComponentOutlet],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: {
    class: 'pct-icon',
    // Decoration unless it is given a name: beside the text it belongs to — the select's
    // arrow next to the chosen value, the checkbox's tick inside a labelled control — a
    // second reading of the same thing is noise in a screen reader. Named, it is an image.
    '[attr.aria-hidden]': 'named() === null ? "true" : null',
    '[attr.role]': 'named() === null ? null : "img"',
    '[attr.aria-label]': 'named()',
    '[attr.data-pct-tone]': 'tone()',
    '[attr.data-pct-size]': 'size()',
  },
})
export class PctIcon {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly set = inject(PctIconSet, { optional: true });

  /**
   * Which ROLE this icon plays in a component of the library. A component always names one;
   * a consumer dropping a one-off drawing into their own markup leaves it out, and then the
   * content is all there is. Resolved through the `roles` of each source, in order.
   *
   * @since 0.1.0
   */
  readonly name = input<PctIconName | null>(null);

  /**
   * Which icon of the CONSUMER's set this is — `house`, `trash`, whatever the sources
   * answer for. `string` until the application augments `PctIconIds`, and then exactly its
   * keys. Not for a component of the library: those name a role.
   *
   * @since next
   */
  readonly icon = input<PctIconId | null>(null);

  /**
   * The colour of the skin's four tones, or `null` for the colour of the text around it.
   * An icon IS the second channel a tone needs — a shape that stays when the colour goes —
   * so a tone here never speaks alone; what it cannot do is tell two states apart by colour
   * on one and the same glyph ([0076](../../../../docs/decisions/0076-a-tone-is-two-channels-and-four-names.md)).
   *
   * @since next
   */
  readonly tone = input<PctTone | null>(null);

  /**
   * A step on the icon's own scale, or `null` for the text's own size (`1em`) — the default,
   * and the right one beside text. The steps are tokens, so a theme moves them
   * (`req-token-override`); any other size is `font-size` on the box.
   *
   * @since next
   */
  readonly size = input<PctSize | null>(null);

  /**
   * The accessible name, for an icon that carries information nothing else in the page
   * says. With one the element is `role="img"` and read by that name; without one it is
   * hidden from the accessibility tree, which is right for every icon that stands beside
   * the words it repeats.
   *
   * @since next
   */
  readonly label = input<string | null>(null);

  /**
   * The label with its blanks taken off, or `null`: an empty string bound from a row with no
   * label is no name, and an image with no name is worse than decoration.
   */
  protected readonly named = computed(() => {
    const label = this.label()?.trim();
    return label ? label : null;
  });

  /** What the sources answered, or `null` — and then the content renders. */
  protected readonly rendering = computed<PctIconRendering | null>(() => {
    const icon = this.icon();
    if (icon !== null) return this.set?.icon(icon) ?? null;
    const name = this.name();
    return name === null ? null : (this.set?.role(name) ?? null);
  });

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnSilence());
  }

  /**
   * The two shapes a consumer cannot see on the page: an icon asked for by role AND by id,
   * where only the id is read; and an id no source answers over an empty box, which renders
   * as nothing at all. Said once per id and only in dev mode — a list of a hundred rows has
   * a hundred icons and one mistake.
   */
  private warnOnSilence(): void {
    const icon = this.icon();
    if (icon === null) return;
    if (this.name() !== null)
      console.warn(
        `[pct-icon] \`${icon}\` is asked for by \`icon\` and \`${this.name()}\` by ` +
          `\`name\` on one element. The id is read and the role is not: \`name\` is for ` +
          `a component of the library, \`icon\` for an icon of yours.`,
      );
    if (this.rendering() !== null || warned.has(icon)) return;
    if (this.host.nativeElement.childElementCount > 0) return;
    if (this.host.nativeElement.textContent?.trim()) return;
    warned.add(icon);
    console.warn(
      `[pct-icon] No source answers for \`${icon}\`, and the box holds no drawing of its ` +
        `own — it renders as nothing. Register a source with \`providePctIcons()\`, or ` +
        `write the drawing as content.`,
    );
  }
}
