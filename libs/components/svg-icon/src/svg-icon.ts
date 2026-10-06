import {
  Component,
  computed,
  Directive,
  effect,
  ElementRef,
  inject,
  input,
  isDevMode,
  Renderer2,
} from '@angular/core';
import type {
  PctIconRoles,
  PctIconSource,
  PctSvgIconData,
  PctSvgIconInput,
  PctSvgNode,
} from '@pacit/components/icon';

/**
 * A node as the renderer reads it: a tag and a map of attributes. The list of TAGS is the
 * `@switch` of `svg-icon.html` and nowhere else — a tag with no case draws nothing — so what
 * is checked here is only the SHAPE, for data that arrived as JSON rather than through a type.
 */
function isNode(node: unknown): node is PctSvgNode {
  return (
    Array.isArray(node) &&
    typeof node[0] === 'string' &&
    typeof node[1] === 'object' &&
    node[1] !== null
  );
}

/**
 * The attributes the renderer paints: the geometry of each element and the paint an icon
 * sets on itself. A name outside this list never reaches an element — `onload`, `href`,
 * `style`, `class`, `id` — so a drawing from anybody's data is as safe as a drawing from
 * nobody's. This is the whole sanitizer, and it is a list of geometry because Angular's
 * own has no SVG in it at all ([`lesson-85`](../../../../docs/lessons.md#lesson-85)).
 *
 * A function and not a constant, as is every list and pattern of this file: a literal
 * evaluated as the module loads is one the mutation run cannot tell which cases read, so it
 * runs every spec that imports the file against each edit of it (`lesson-250`).
 */
function paintedAttributes(): readonly string[] {
  return [
    'd',
    'cx',
    'cy',
    'r',
    'rx',
    'ry',
    'x',
    'y',
    'x1',
    'x2',
    'y1',
    'y2',
    'width',
    'height',
    'points',
    'transform',
    'fill',
    'fill-rule',
    'fill-opacity',
    'clip-rule',
    'stroke',
    'stroke-width',
    'stroke-linecap',
    'stroke-linejoin',
    'stroke-dasharray',
    'stroke-dashoffset',
    'stroke-miterlimit',
    'stroke-opacity',
    'opacity',
    'vector-effect',
  ];
}

/** `trim()` the way a URL parser trims: everything at or below U+0020, off both ends. */
const trimControls = (text: string): string => {
  let start = 0;
  let end = text.length;
  while (start < end && text.charCodeAt(start) <= 0x20) start += 1;
  while (end > start && text.charCodeAt(end - 1) <= 0x20) end -= 1;
  return text.slice(start, end);
};

/** The names already warned about, so a drawing of a hundred paths says it once. */
const dropped = new Set<string>();

/**
 * Paints the geometry attributes of an SVG element from a map, and **only** those: a name
 * outside the list the renderer knows is dropped, with a word in dev mode.
 *
 * A directive rather than a binding per attribute, because the list is thirty names over
 * seven tags and a drawing names a handful of them; and a directive rather than markup,
 * because `setAttribute` with a name from a list cannot be made to run a script, while a
 * string of SVG can ([0083](../../../../docs/decisions/0083-an-icon-source-answers-a-name-with-data-and-the-box-renders-it.md)).
 *
 * @since next
 */
@Directive({
  selector: '[pctSvgAttributes]',
})
export class PctSvgAttributes {
  /**
   * The attributes to paint, by name. A number is written as its text; an `undefined` is an
   * attribute left out.
   *
   * @since next
   */
  readonly attributes = input.required<
    Readonly<Record<string, string | number | undefined>>
  >({ alias: 'pctSvgAttributes' });

  private readonly element = inject<ElementRef<Element>>(ElementRef);
  private readonly renderer = inject(Renderer2);

  constructor() {
    let painted: string[] = [];
    effect(() => {
      const next = this.attributes();
      const element = this.element.nativeElement;
      for (const name of painted)
        if (next[name] === undefined)
          this.renderer.removeAttribute(element, name);
      painted = [];
      const paints = paintedAttributes();
      for (const [name, value] of Object.entries(next)) {
        if (value === undefined) continue;
        if (!paints.includes(name)) {
          if (isDevMode() && !dropped.has(name)) {
            dropped.add(name);
            console.warn(
              `[pct-svg-icon] \`${name}\` is not an attribute the renderer paints and was ` +
                `dropped. A drawing from data carries geometry and paint — ` +
                `${paints.join(', ')} — and nothing that names a script, an ` +
                `address or a stylesheet.`,
            );
          }
          continue;
        }
        const text = String(value);
        // A paint value that names an address: `fill="url(https://…)"` makes a browser fetch
        // a paint server from wherever the data says — Chromium across origins, measured — so
        // a `url(` in a value is refused unless it is a reference into the document itself,
        // `url(#id)`, bare or quoted. A value holding a backslash is refused outright: the CSS
        // tokenizer unescapes `u\72l(` to `url(` before it decides what the word is (measured
        // in review), and an escape is the only way to spell `url` without writing it.
        if (
          text.includes('\\') ||
          (/url\s*\(/i.test(text) &&
            !/^url\(\s*(["']?)#[^()"']*\1\s*\)$/i.test(text))
        ) {
          if (isDevMode() && !dropped.has(`${name}=url`)) {
            dropped.add(`${name}=url`);
            console.warn(
              `[pct-svg-icon] \`${name}\` names an address (\`${text}\`) and was dropped. ` +
                `A paint value may reference the document itself — \`url(#id)\` — and ` +
                `nothing beyond it.`,
            );
          }
          continue;
        }
        this.renderer.setAttribute(element, name, text);
        painted.push(name);
      }
    });
  }
}

/**
 * The library's SVG renderer: a drawing given as data, or one `<use>` of a sprite, drawn in
 * the box of a `pct-icon` (`req-api-icons`).
 *
 * It is a component the SOURCE names (`svgIcons()`, `svgSprite()`), not one the box knows:
 * an application that provides an icon font never carries these bytes, and the fourteen
 * entrypoints that draw an arrow pay nothing for them — which is why this is an entrypoint
 * of its own and not a file of `./icon`: a component in a barrel is not shaken out the way a
 * function is, and measured in `./icon` it put 3558 B on every one of them
 * ([`lesson-86`](../../../../docs/lessons.md#lesson-86), [`lesson-248`](../../../../docs/lessons.md#lesson-248)). The host is `display: contents`,
 * so the `<svg>` is sized by the icon's box as if it stood in it directly.
 *
 * @since next
 */
@Component({
  selector: 'pct-svg-icon',
  imports: [PctSvgAttributes],
  templateUrl: './svg-icon.html',
  styleUrl: './svg-icon.scss',
  host: {
    class: 'pct-svg-icon',
  },
})
export class PctSvgIcon {
  /**
   * The drawing, or `null` for a sprite.
   *
   * @since next
   */
  readonly data = input<PctSvgIconData | null>(null);

  /**
   * The address of a sprite's symbol — `icons.svg#house` — or `null` for a drawing. A
   * sprite is same-origin by the platform's rule, so the address is a relative path or
   * `http(s):`, and one naming any other scheme is refused.
   *
   * @since next
   */
  readonly href = input<string | null>(null);

  /**
   * The address, or `null` for one that names a scheme a sprite cannot come from. A
   * `<use>` reaches a same-origin document and nothing else, so an address is a relative
   * path or `http(s):` — and `javascript:`, `data:` and the rest are refused rather than
   * handed to the element, with a word in dev mode. Angular's URL sanitizer does not read
   * `href` on `<use>` (measured in `svg-icon.spec.ts`), so the check is this one.
   */
  protected readonly address = computed(() => {
    const href = this.href();
    if (href === null) return null;
    // An address that names a scheme at all, and the two schemes a sprite may come from. The
    // address is read the way a URL parser reads it — tabs and newlines gone from anywhere, C0
    // controls and spaces gone from both ends — because `' javascript:'` IS `javascript:` to
    // the element, and a check on the raw string would be a check on nothing.
    const read = trimControls(href.replace(/[\t\n\r]/g, ''));
    if (!/^[a-z][a-z0-9+.-]*:/i.test(read) || /^https?:/i.test(read))
      return read;
    if (isDevMode())
      console.warn(
        `[pct-svg-icon] \`${href}\` names a scheme a sprite cannot come from and was ` +
          `dropped. A sprite's address is a relative path or \`http(s):\`.`,
      );
    return null;
  });
  protected readonly viewBox = computed(() => this.data()?.viewBox ?? null);
  protected readonly attributes = computed(() => this.data()?.attributes ?? {});
  protected readonly nodes = computed(() => {
    const nodes: unknown = this.data()?.nodes;
    return Array.isArray(nodes) ? nodes.filter(isNode) : [];
  });
}

/**
 * What `svgIcons()` takes besides the drawings.
 *
 * @since next
 */
export interface PctSvgIconsOptions {
  /**
   * The library's roles under the ids of the drawings given — `{ close: 'x', check: 'check' }`.
   *
   * @since next
   */
  readonly roles?: PctIconRoles;
}

/** `Array.isArray` narrows a readonly array to nothing useful; this one narrows. */
function isNodes(icon: PctSvgIconInput): icon is readonly PctSvgNode[] {
  return Array.isArray(icon);
}

/**
 * One drawing in the shape the renderer takes, from any of the three a consumer may hold.
 *
 * @since next
 */
export function svgIconData(icon: PctSvgIconInput): PctSvgIconData {
  if (isNodes(icon))
    return {
      viewBox: '0 0 24 24',
      // The 24-grid and the stroke conventions the Tabler icons and their kin draw with.
      attributes: {
        fill: 'none',
        stroke: 'currentColor',
        'stroke-width': 2,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      nodes: icon,
    };
  if ('icon' in icon) {
    const [width, height, , , pathData] = icon.icon;
    const paths = typeof pathData === 'string' ? [pathData] : pathData;
    return {
      viewBox: `0 0 ${width} ${height}`,
      attributes: { fill: 'currentColor' },
      nodes: paths.map((d) => ['path', { d }]),
    };
  }
  return icon;
}

/**
 * SVG drawings as data, under the ids a consumer chooses (`req-api-icons`).
 *
 * Three shapes drop in as they are: a Tabler-style icon (its node list,
 * drawn on the 24-grid with a 2-unit round stroke), a FontAwesome SVG definition
 * (`faHouse`), and a drawing written out — `viewBox`, the root's paint, the nodes. The
 * drawing paints itself in `currentColor`, so the box's colour, the tone and the state the
 * component shows there all reach it.
 *
 * This source answers for the ids it was given and `null` for the rest, so it stands first
 * in `providePctIcons(…)`, before a font that answers for everything.
 *
 * @example
 * import { faTrash } from '@fortawesome/free-solid-svg-icons';
 *
 * providePctIcons(
 *   svgIcons(
 *     {
 *       trash: faTrash,
 *       x: [['path', { d: 'M18 6 6 18' }], ['path', { d: 'm6 6 12 12' }]],
 *       dot: { viewBox: '0 0 10 10', attributes: { fill: 'currentColor' }, nodes: [['circle', { cx: 5, cy: 5, r: 4 }]] },
 *     },
 *     { roles: { close: 'x' } },
 *   ),
 * );
 *
 * @since next
 */
export function svgIcons(
  icons: Readonly<Record<string, PctSvgIconInput>>,
  options: PctSvgIconsOptions = {},
): PctIconSource {
  const drawings = new Map<string, PctSvgIconData>();
  for (const [id, icon] of Object.entries(icons))
    drawings.set(id, svgIconData(icon));
  return {
    resolve: (id) => {
      const data = drawings.get(id);
      return data === undefined
        ? null
        : { kind: 'component', component: PctSvgIcon, inputs: { data } };
    },
    roles: { ...options.roles },
  };
}

/**
 * What `svgSprite()` takes besides the address.
 *
 * @since next
 */
export interface PctSvgSpriteOptions {
  /**
   * The library's roles under the sprite's symbol ids.
   *
   * @since next
   */
  readonly roles?: PctIconRoles;
  /**
   * The symbol an id names, when the sprite spells them differently — `(id) => \`i-${id}\``.
   *
   * @since next
   */
  readonly symbol?: (id: string) => string;
}

/**
 * An SVG sprite as a source: `<pct-icon icon="house">` is `<svg><use href="icons.svg#house">`.
 *
 * Bootstrap Icons ship one, and a build step makes one out of any folder of `.svg` files —
 * which is how a designer's export becomes icons with no markup in the application. The
 * sprite is same-origin by the platform's rule. Like a font, a sprite answers for EVERY id
 * and so stands last among the sources.
 *
 * @since next
 */
export function svgSprite(
  url: string,
  options: PctSvgSpriteOptions = {},
): PctIconSource {
  const symbol = options.symbol ?? ((id: string) => id);
  return {
    resolve: (id) => ({
      kind: 'component',
      component: PctSvgIcon,
      inputs: { href: `${url}#${symbol(id)}` },
    }),
    roles: { ...options.roles },
  };
}
