import type { PctIconName } from './icon';
import type { PctIconSource } from './source.types';

/**
 * The library's roles in a font's vocabulary — what an adapter carries so that one line
 * dresses every component, and what a consumer overrides when their version spells one
 * differently (`times` became `xmark` between FontAwesome 5 and 6).
 *
 * @since next
 */
export type PctIconRoles = Readonly<
  Partial<Record<PctIconName, string | undefined>>
>;

/**
 * What every font adapter takes besides its own knobs.
 *
 * @since next
 */
export interface PctIconFontRoles {
  /**
   * Roles to spell differently, or to keep the library's drawing for (`undefined`). Merged
   * over the adapter's own map.
   *
   * @since next
   */
  readonly roles?: PctIconRoles;
}

/**
 * How an icon font keys its glyphs, for a font this entrypoint has no adapter of its own
 * for — or for the application's own.
 *
 * @since next
 */
export interface PctIconFontOptions extends PctIconFontRoles {
  /**
   * The classes an id becomes — `(id) => \`my my-${id}\``.
   *
   * @since next
   */
  readonly class: (id: string) => string;
  /**
   * The text written in the span, for a font that reads a ligature.
   *
   * @since next
   */
  readonly text?: (id: string) => string;
  /**
   * Inline style every glyph carries — the variation axes of a variable font.
   *
   * @since next
   */
  readonly style?: Readonly<Record<string, string>>;
}

/**
 * An icon font as a source: every id is a glyph of it (`req-api-icons`).
 *
 * A font answers for EVERY id — there is no list to check it against, the browser draws
 * what the class names and nothing for a class the stylesheet does not know — so a font
 * stands last among the sources, after any that answer for a few ids and `null` for the rest.
 *
 * @example
 * providePctIcons(iconFont({ class: (id) => `acme acme-${id}`, roles: { close: 'cross' } }))
 *
 * @since next
 */
export function iconFont(options: PctIconFontOptions): PctIconSource {
  const { class: classOf, text, style, roles } = options;
  return {
    resolve: (id) => ({
      kind: 'font',
      class: classOf(id),
      ...(text === undefined ? {} : { text: text(id) }),
      ...(style === undefined ? {} : { style }),
    }),
    roles: { ...roles },
  };
}

/** The adapter's own map, with the consumer's corrections over it. */
const rolesOf = (
  defaults: Readonly<Record<PctIconName, string>>,
  overrides: PctIconRoles | undefined,
): PctIconRoles => ({ ...defaults, ...overrides });

/**
 * What FontAwesome's stylesheet is told, besides the roles.
 *
 * @since next
 */
export interface PctFontAwesomeOptions extends PctIconFontRoles {
  /**
   * The style every glyph is drawn in — `solid` by default, `regular` or `brands` in the
   * free set, more in the paid ones. It becomes the `fa-<style>` class of version 6.
   *
   * @since next
   */
  readonly style?: string;
  /**
   * The first class outright, for a stylesheet that spells it differently — the three-letter
   * prefixes of version 5, `far` for the regular style. Replaces `fa-<style>` when given.
   *
   * @since next
   */
  readonly prefix?: string;
}

/** FontAwesome 6, free: the roles under the names it gives them. */
const FONT_AWESOME_ROLES: Readonly<Record<PctIconName, string>> = {
  calendar: 'calendar',
  check: 'check',
  'chevron-down': 'chevron-down',
  close: 'xmark',
  danger: 'circle-exclamation',
  indeterminate: 'minus',
  info: 'circle-info',
  success: 'circle-check',
  user: 'user',
  warning: 'triangle-exclamation',
};

/**
 * FontAwesome, as classes: `<pct-icon icon="house">` is `<i class="fa-solid fa-house">`.
 *
 * The stylesheet is the consumer's to include — the library brings no font
 * (`req-api-icons-custom`). The role map is version 6's; a version 5 stylesheet takes
 * `prefix: 'far'` and `roles: { close: 'times' }`.
 *
 * @since next
 */
export function fontAwesome(
  options: PctFontAwesomeOptions = {},
): PctIconSource {
  const first = options.prefix ?? `fa-${options.style ?? 'solid'}`;
  return iconFont({
    class: (id) => `${first} fa-${id}`,
    roles: rolesOf(FONT_AWESOME_ROLES, options.roles),
  });
}

/** PrimeIcons: the roles under the names it gives them. */
const PRIME_ICONS_ROLES: Readonly<Record<PctIconName, string>> = {
  calendar: 'calendar',
  check: 'check',
  'chevron-down': 'chevron-down',
  close: 'times',
  danger: 'exclamation-circle',
  indeterminate: 'minus',
  info: 'info-circle',
  success: 'check-circle',
  user: 'user',
  warning: 'exclamation-triangle',
};

/**
 * PrimeIcons, as classes: `<pct-icon icon="bell">` is `<i class="pi pi-bell">`.
 *
 * @since next
 */
export function primeIcons(options: PctIconFontRoles = {}): PctIconSource {
  return iconFont({
    class: (id) => `pi pi-${id}`,
    roles: rolesOf(PRIME_ICONS_ROLES, options.roles),
  });
}

/** Bootstrap Icons: the roles under the names it gives them. */
const BOOTSTRAP_ICONS_ROLES: Readonly<Record<PctIconName, string>> = {
  calendar: 'calendar',
  check: 'check-lg',
  'chevron-down': 'chevron-down',
  close: 'x-lg',
  danger: 'exclamation-circle-fill',
  indeterminate: 'dash-lg',
  info: 'info-circle-fill',
  success: 'check-circle-fill',
  user: 'person-fill',
  warning: 'exclamation-triangle-fill',
};

/**
 * Bootstrap Icons, as classes: `<pct-icon icon="bell">` is `<i class="bi bi-bell">`.
 *
 * @since next
 */
export function bootstrapIcons(options: PctIconFontRoles = {}): PctIconSource {
  return iconFont({
    class: (id) => `bi bi-${id}`,
    roles: rolesOf(BOOTSTRAP_ICONS_ROLES, options.roles),
  });
}

/** Material's two fonts spell the roles the same way. */
const MATERIAL_ROLES: Readonly<Record<PctIconName, string>> = {
  calendar: 'calendar_today',
  check: 'check',
  'chevron-down': 'expand_more',
  close: 'close',
  danger: 'error',
  indeterminate: 'remove',
  info: 'info',
  success: 'check_circle',
  user: 'person',
  warning: 'warning',
};

/**
 * Which of the Material Icons fonts is loaded.
 *
 * @since next
 */
export type PctMaterialIconsVariant =
  'filled' | 'outlined' | 'round' | 'sharp' | 'two-tone';

/**
 * What the Material Icons font is told, besides the roles.
 *
 * @since next
 */
export interface PctMaterialIconsOptions extends PctIconFontRoles {
  /**
   * The font loaded — `filled` by default, which is the `material-icons` class; the others
   * are `material-icons-<variant>`.
   *
   * @since next
   */
  readonly variant?: PctMaterialIconsVariant;
}

/**
 * Material Icons, the ligature font: `<pct-icon icon="home">` is
 * `<span class="material-icons">home</span>`.
 *
 * @since next
 */
export function materialIcons(
  options: PctMaterialIconsOptions = {},
): PctIconSource {
  const variant = options.variant ?? 'filled';
  const cls =
    variant === 'filled' ? 'material-icons' : `material-icons-${variant}`;
  return iconFont({
    class: () => cls,
    text: (id) => id,
    roles: rolesOf(MATERIAL_ROLES, options.roles),
  });
}

/**
 * Which of the Material Symbols fonts is loaded.
 *
 * @since next
 */
export type PctMaterialSymbolsVariant = 'outlined' | 'rounded' | 'sharp';

/**
 * What the Material Symbols font is told, besides the roles: the axes of a variable font.
 * An axis left out is left to the stylesheet.
 *
 * @since next
 */
export interface PctMaterialSymbolsOptions extends PctIconFontRoles {
  /**
   * The font loaded — `outlined` by default; the class is `material-symbols-<variant>`.
   *
   * @since next
   */
  readonly variant?: PctMaterialSymbolsVariant;
  /**
   * The `FILL` axis: filled glyphs, or outlines.
   *
   * @since next
   */
  readonly fill?: boolean;
  /**
   * The `wght` axis, 100 to 700.
   *
   * @since next
   */
  readonly weight?: number;
}

/**
 * Material Symbols, the variable ligature font: `<pct-icon icon="home">` is
 * `<span class="material-symbols-outlined">home</span>`, with `font-variation-settings`
 * for the axes given.
 *
 * @since next
 */
export function materialSymbols(
  options: PctMaterialSymbolsOptions = {},
): PctIconSource {
  const axes: string[] = [];
  if (options.fill !== undefined) axes.push(`'FILL' ${options.fill ? 1 : 0}`);
  if (options.weight !== undefined) axes.push(`'wght' ${options.weight}`);
  return iconFont({
    class: () => `material-symbols-${options.variant ?? 'outlined'}`,
    text: (id) => id,
    ...(axes.length
      ? { style: { 'font-variation-settings': axes.join(', ') } }
      : {}),
    roles: rolesOf(MATERIAL_ROLES, options.roles),
  });
}
