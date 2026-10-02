import type { TemplateRef, Type } from '@angular/core';
import type { PctIconName } from './icon';

/**
 * The ids a consumer's icons go by — **empty here, and open to augmentation**.
 *
 * `PctIconId` is `string` until an application declares its own ids, and then it is exactly
 * those: a misspelt `icon="hosue"` becomes the compile error a misspelt role already is
 * ([0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md)). The library ships
 * no list, because the ids are the set's and the set is the consumer's
 * (`req-api-icons-custom`).
 *
 * @example
 * declare module '@pacit/components/icon' {
 *   interface PctIconIds {
 *     house: true;
 *     trash: true;
 *   }
 * }
 *
 * @since next
 */
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type -- the shape IS the emptiness: a consumer fills it in
export interface PctIconIds {}

/**
 * What `icon` takes: every key of `PctIconIds`, or any string while that interface is empty.
 *
 * @since next
 */
export type PctIconId = [keyof PctIconIds] extends [never]
  ? string
  : keyof PctIconIds & string;

/**
 * A drawing a set component registered under a role: the template renders in the box.
 *
 * @since next
 */
export interface PctIconTemplateRendering {
  /**
   * Which kind of answer this is.
   *
   * @since next
   */
  readonly kind: 'template';
  /**
   * The `<ng-template pctIcon>` of the set.
   *
   * @since next
   */
  readonly template: TemplateRef<void>;
}

/**
 * A glyph of an icon font: a `<span>` wearing the font's classes, holding the ligature text
 * when the font reads one (Material), with `font-variation-settings` or whatever else the
 * font takes as inline style.
 *
 * @since next
 */
export interface PctIconFontRendering {
  /**
   * Which kind of answer this is.
   *
   * @since next
   */
  readonly kind: 'font';
  /**
   * The classes the font keys the glyph on — `fa-solid fa-house`, `pi pi-check`.
   *
   * @since next
   */
  readonly class: string;
  /**
   * The ligature text, for a font that draws its glyph from the word written in the span.
   *
   * @since next
   */
  readonly text?: string;
  /**
   * Inline style the glyph needs — the variation axes of a variable font.
   *
   * @since next
   */
  readonly style?: Readonly<Record<string, string>>;
}

/**
 * A component created in the box with the inputs given — the way every drawing that is
 * not a template and not a font arrives, including the library's own SVG renderer.
 *
 * The box knows nothing of the component: it is the SOURCE that names it, so an
 * application providing only an icon font never carries the SVG renderer, which lives in
 * `@pacit/components/svg-icon` for that reason ([`lesson-86`](../../../../docs/lessons.md#lesson-86)).
 *
 * @since next
 */
export interface PctIconComponentRendering {
  /**
   * Which kind of answer this is.
   *
   * @since next
   */
  readonly kind: 'component';
  /**
   * The component to create inside the box.
   *
   * @since next
   */
  readonly component: Type<unknown>;
  /**
   * Its inputs, by name.
   *
   * @since next
   */
  readonly inputs?: Readonly<Record<string, unknown>>;
}

/**
 * What a source answers for an id: a template, a font glyph or a component — **data, never
 * markup**. A string of SVG has no place here on purpose: Angular's sanitizer deletes an
 * `<svg>` from `[innerHTML]` outright, and the only way around it is the library trusting
 * markup a consumer wrote, which is the shape
 * [0028](../../../../docs/decisions/0028-an-icon-set-is-a-component.md) refused.
 *
 * @since next
 */
export type PctIconRendering =
  PctIconTemplateRendering | PctIconFontRendering | PctIconComponentRendering;

/**
 * A source of icons: answers an id with a rendering, or with `null` so that the next source
 * is asked. `providePctIcons(…)` takes any number of them, in order of precedence.
 *
 * A source that knows the library's roles under its own ids says so in `roles`, and then
 * the components draw with it too: `providePctIcons(primeIcons())` is one line, and the
 * select's arrow, the checkbox's tick and the toast's four marks all wear PrimeIcons.
 *
 * @example
 * const catalogue: PctIconSource = {
 *   resolve: (id) => (id in icons ? { kind: 'font', class: `cat cat-${id}` } : null),
 *   roles: { close: 'x', check: 'tick' },
 * };
 *
 * @since next
 */
export interface PctIconSource {
  /**
   * The rendering for an id, or `null` when this source has no such icon.
   *
   * @since next
   */
  resolve(id: string): PctIconRendering | null;
  /**
   * The library's roles in this source's own vocabulary — `close` is `xmark` in
   * FontAwesome and `times` in PrimeIcons. A role left out keeps the drawing the component
   * ships with; a role set to `undefined` does the same, which is how a consumer keeps one
   * library drawing while taking an adapter's map for the rest.
   *
   * @since next
   */
  readonly roles?: Readonly<Partial<Record<PctIconName, string | undefined>>>;
}

/**
 * One element of an SVG drawing given as data: the tag and its attributes.
 *
 * This is the shape the Tabler icons and the packages built like them export their icons
 * in, so those packages drop in as they are. A tag outside the geometry the renderer knows is dropped, and so is an
 * attribute outside the list it paints — which is what makes a drawing from data safe to
 * render without trusting anybody.
 *
 * @since next
 */
export type PctSvgNode = readonly [
  tag: string,
  attributes: Readonly<Record<string, string | number | undefined>>,
];

/**
 * An SVG drawing as data: the box it is drawn in, the attributes of the root and the
 * elements inside it.
 *
 * @since next
 */
export interface PctSvgIconData {
  /**
   * The `viewBox` of the drawing — `0 0 24 24` for a 24-grid icon.
   *
   * @since next
   */
  readonly viewBox: string;
  /**
   * Paint attributes of the root: `fill`, `stroke`, `stroke-width` and the like. A drawing
   * paints itself in `currentColor` so that the box's colour is the icon's. An `undefined`
   * value is an attribute left out, which is how the typed packages spell an optional one.
   *
   * @since next
   */
  readonly attributes?: Readonly<Record<string, string | number | undefined>>;
  /**
   * The elements, in drawing order.
   *
   * @since next
   */
  readonly nodes: readonly PctSvgNode[];
}

/**
 * An icon as FontAwesome's SVG packages export it: `faHouse` from
 * `@fortawesome/free-solid-svg-icons`. Only the `icon` tuple is read — the width, the
 * height and the path data, one path or two.
 *
 * @since next
 */
export interface PctSvgIconDefinition {
  /**
   * `[width, height, ligatures, unicode, pathData]`, as the package writes it.
   *
   * @since next
   */
  readonly icon: readonly [
    width: number,
    height: number,
    ligatures: unknown,
    unicode: unknown,
    pathData: string | readonly string[],
  ];
}

/**
 * What `svgIcons()` takes under an id: a drawing as data, the nodes alone (Tabler and the
 * packages built like it — drawn on the 24-grid with their stroke conventions), or a
 * FontAwesome definition.
 *
 * @since next
 */
export type PctSvgIconInput =
  PctSvgIconData | readonly PctSvgNode[] | PctSvgIconDefinition;
