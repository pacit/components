import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  createComponent,
  createEnvironmentInjector,
  DestroyRef,
  Directive,
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

/**
 * The icons the library draws, by the ROLE they play rather than by what they look like
 * (`req-api-icons`). `chevron-down` and not `arrow-down-16`: a consumer swapping it is
 * answering "what does the select's trigger show", not "which of my 16-pixel arrows".
 *
 * **The list is public API** and grows with the components that need a new one — a name here
 * is a promise that some component draws it and that supplying one replaces that drawing
 * ([0011](../../../../docs/decisions/0011-icons.md)). `check-icons` holds both directions:
 * a name nothing draws is a promise nobody keeps, a drawing with no name cannot be swapped.
 */
export type PctIconName = 'check' | 'chevron-down' | 'close' | 'indeterminate';

/**
 * The consumer's icon set: **a component whose templates are the icons**.
 *
 * The shape is a measurement rather than a taste. A registry maps a name onto markup, the
 * only thing in Angular that carries markup a consumer wrote is a `TemplateRef`, and a
 * `TemplateRef` cannot exist without a component to live in — so the value a provider can
 * hold is the component ([0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md),
 * [`lesson-85`](../../../../docs/lessons.md#lesson-85)).
 */
export const PCT_ICONS = new InjectionToken<Type<unknown>>('PCT_ICONS');

/**
 * Registers an icon set for the whole application, or for one subtree
 * (`req-api-icons`). The names supplied are swapped and the rest keep the drawing the
 * component ships with, the same partial override as `providePctTexts`.
 *
 * @example
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
 */
export function providePctIcons(set: Type<unknown>): Provider[] {
  return [{ provide: PCT_ICONS, useValue: set }, PctIconSet];
}

/**
 * The set, created once and read by every `pct-icon` below the injector it was provided in.
 *
 * Deliberately **not** exported from the entrypoint: a consumer declares a set and never
 * touches the thing that reads it. `providePctIcons` puts it in the same injector as the
 * token, which is what makes a set scoped to a subtree possible — the icons of a section in
 * somebody else's design system stop where its providers do.
 */
@Injectable()
class PctIconSet {
  private readonly type = inject(PCT_ICONS);
  private readonly parent = inject(EnvironmentInjector);
  private readonly destroyRef = inject(DestroyRef);

  /** What the set registered. Empty until it is built, which is not the same thing. */
  private readonly icons = new Map<string, TemplateRef<void>>();
  /** A set nobody reads is never built, so the flag is the state and the map is not. */
  private built = false;

  /** The template a name was registered with, or `null` for the component's own drawing. */
  read(name: PctIconName): TemplateRef<void> | null {
    if (!this.built) this.build();
    return this.icons.get(name) ?? null;
  }

  /** Called by `PctIconTemplate` while the set component is being created. */
  register(name: PctIconName, template: TemplateRef<void>): void {
    this.icons.set(name, template);
  }

  /**
   * Builds the set: a component created **outside the document**, never attached to
   * `ApplicationRef` and never rendered. Its templates are all that is wanted, and a
   * `TemplateRef` is complete the moment the view holding it exists — the embedded views
   * made from it later belong to the `pct-icon` that renders them, so change detection
   * reaches them by their real place in the tree and not through this one.
   *
   * The slots find this instance through an environment injector made for the set alone.
   * **That provider is not redundant**, and where it earns its place is the scoped case: a
   * set written into a COMPONENT's `providers` puts the registry in an element injector,
   * while the environment injector above is the application's — so without this line the
   * slots inside the set would resolve past it and find the application's set, or nothing.
   */
  private build(): void {
    this.built = true;
    const injector = createEnvironmentInjector(
      [{ provide: PctIconSet, useValue: this }],
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
 */
@Directive({
  selector: 'ng-template[pctIcon]',
})
export class PctIconTemplate implements OnInit {
  /** The icon this template draws. */
  readonly name = input.required<PctIconName>({ alias: 'pctIcon' });

  private readonly template = inject<TemplateRef<void>>(TemplateRef);
  private readonly set = inject(PctIconSet, { optional: true });

  ngOnInit(): void {
    if (this.set !== null) {
      this.set.register(this.name(), this.template);
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

/**
 * An icon: the drawing a component ships with, or the consumer's in its place
 * (`req-api-icons`).
 *
 * The component writes its own icon as content and names it. With no set provided the
 * content renders, so a consumer who does nothing gets working icons; with a set that
 * carries the name, the set's template renders **in the same place in the DOM** — which is
 * what makes the swap invisible to the layout around it. The library ships no icon set of
 * its own ([`req-api-icons-custom`](../../../../docs/requirements/api.md#req-api-icons-custom)):
 * a default lives in the template that needs it and travels only to the entrypoint that
 * draws it.
 *
 * **The styling contract is this element and not what is inside it.** A component sizes the
 * icon and gives it a colour here (`data-pct-part`, `color`), the drawing paints itself in
 * `currentColor` — a component that reaches for the `stroke` of an `<svg>` is styling the
 * one icon it happens to know, and `check-styles` point 8 refuses it.
 *
 * @example
 * <pct-icon name="chevron-down" data-pct-part="arrow">
 *   <svg viewBox="0 0 16 16" fill="none" stroke="currentColor"><path d="M4 6l4 4 4-4" /></svg>
 * </pct-icon>
 */
@Component({
  selector: 'pct-icon',
  imports: [NgTemplateOutlet],
  templateUrl: './icon.html',
  styleUrl: './icon.scss',
  host: {
    class: 'pct-icon',
    // Every icon here stands beside the text it belongs to — the select's arrow next to the
    // chosen value, the checkbox's tick inside a labelled control. A second reading of the
    // same thing is noise in a screen reader, so the element is hidden from the tree and
    // the meaning stays with the control (`req-a11y-built-in`).
    'aria-hidden': 'true',
  },
})
export class PctIcon {
  /**
   * Which icon this is. A component of the library always names one; a consumer dropping a
   * one-off drawing into their own markup can leave it out, and then the content is all
   * there is.
   */
  readonly name = input<PctIconName | null>(null);

  private readonly set = inject(PctIconSet, { optional: true });

  /** The set's template for this name, or `null` — and then the content renders. */
  protected readonly replacement = computed(() => {
    const name = this.name();
    return name === null ? null : (this.set?.read(name) ?? null);
  });
}
