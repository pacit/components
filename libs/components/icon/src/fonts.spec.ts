import {
  bootstrapIcons,
  fontAwesome,
  iconFont,
  materialIcons,
  materialSymbols,
  primeIcons,
} from './fonts';
import type { PctIconName } from './icon';
import type { PctIconFontRendering, PctIconSource } from './source.types';

/** What a font answered, read as the glyph it always is. */
const glyph = (source: PctIconSource, id: string) =>
  source.resolve(id) as PctIconFontRendering;

/**
 * The font adapters: what classes an id becomes, what the span reads, which axes it carries
 * — and the library's ten roles in each font's own spelling, the whole map, because a map
 * is read by a component the consumer never looks at and a wrong entry there is a wrong
 * arrow on every select (`req-api-icons`).
 */
describe('@pacit/components/icon — fonts', () => {
  const ROLES: readonly PctIconName[] = [
    'calendar',
    'check',
    'chevron-down',
    'close',
    'danger',
    'indeterminate',
    'info',
    'success',
    'user',
    'warning',
  ];

  describe('iconFont', () => {
    it('answers every id with the classes given, and nothing it was not given', () => {
      const font = iconFont({ class: (id) => `acme acme-${id}` });
      expect(font.resolve('bell')).toEqual({
        kind: 'font',
        class: 'acme acme-bell',
      });
      expect(font.resolve('anything-at-all')).toEqual({
        kind: 'font',
        class: 'acme acme-anything-at-all',
      });
      expect(font.roles).toEqual({});
    });

    it('carries the ligature text and the style when the font takes them', () => {
      const font = iconFont({
        class: () => 'ligature',
        text: (id) => id.toUpperCase(),
        style: { 'font-variation-settings': "'wght' 300" },
        roles: { close: 'cross' },
      });
      expect(font.resolve('home')).toEqual({
        kind: 'font',
        class: 'ligature',
        text: 'HOME',
        style: { 'font-variation-settings': "'wght' 300" },
      });
      expect(font.roles).toEqual({ close: 'cross' });
    });

    it('a list names roles under their own names — the only spelling a font of yours has', () => {
      const font = iconFont({
        class: (id) => `acme acme-${id}`,
        roles: ['check', 'close'],
      });
      expect(font.roles).toEqual({ check: 'check', close: 'close' });
      expect(iconFont({ class: () => 'acme', roles: [] }).roles).toEqual({});
    });
  });

  describe('fontAwesome', () => {
    it('spells a glyph as version 6 does, solid by default', () => {
      expect(fontAwesome().resolve('house')).toEqual({
        kind: 'font',
        class: 'fa-solid fa-house',
      });
      expect(fontAwesome({ style: 'regular' }).resolve('bell')).toEqual({
        kind: 'font',
        class: 'fa-regular fa-bell',
      });
    });

    it('takes a prefix outright for a stylesheet that spells the style differently', () => {
      expect(fontAwesome({ prefix: 'far' }).resolve('home')).toEqual({
        kind: 'font',
        class: 'far fa-home',
      });
      // The prefix REPLACES the style class rather than standing beside it.
      expect(
        fontAwesome({ prefix: 'far', style: 'solid' }).resolve('x'),
      ).toEqual({ kind: 'font', class: 'far fa-x' });
    });

    it("carries the library's ten roles in version 6's names", () => {
      expect(fontAwesome().roles).toEqual({
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
      });
    });

    it("a consumer's roles land over the adapter's and leave the rest", () => {
      const roles = fontAwesome({
        roles: { close: 'times', calendar: undefined },
      }).roles;
      expect(roles?.close).toBe('times');
      expect(roles?.calendar).toBeUndefined();
      expect(roles?.check).toBe('check');
      expect(roles?.warning).toBe('triangle-exclamation');
    });

    it("a list names the roles to dress and nothing else, in the adapter's spelling", () => {
      expect(fontAwesome({ roles: ['chevron-down', 'close'] }).roles).toEqual({
        'chevron-down': 'chevron-down',
        close: 'xmark',
      });
      expect(
        Object.keys(
          fontAwesome({ roles: ['chevron-down', 'close'] }).roles ?? {},
        ),
      ).toEqual(['chevron-down', 'close']);
    });

    it('an empty list dresses nothing, and the font still answers for every id', () => {
      const font = fontAwesome({ roles: [] });
      expect(font.roles).toEqual({});
      expect(glyph(font, 'house').class).toBe('fa-solid fa-house');
    });

    it('the roles are a copy: a consumer writing on them changes nothing it reads later', () => {
      const first = fontAwesome().roles as Record<string, string>;
      first['close'] = 'times';
      expect(fontAwesome().roles?.close).toBe('xmark');
    });
  });

  describe('primeIcons', () => {
    it('spells a glyph as `pi pi-<id>`', () => {
      expect(primeIcons().resolve('bell')).toEqual({
        kind: 'font',
        class: 'pi pi-bell',
      });
    });

    it("carries the library's ten roles in PrimeIcons' names", () => {
      expect(primeIcons().roles).toEqual({
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
      });
      expect(primeIcons({ roles: { user: 'users' } }).roles?.user).toBe(
        'users',
      );
    });
  });

  describe('bootstrapIcons', () => {
    it('spells a glyph as `bi bi-<id>`', () => {
      expect(bootstrapIcons().resolve('bell')).toEqual({
        kind: 'font',
        class: 'bi bi-bell',
      });
    });

    it("carries the library's ten roles in Bootstrap Icons' names", () => {
      expect(bootstrapIcons().roles).toEqual({
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
      });
      expect(bootstrapIcons({ roles: { close: 'x' } }).roles?.close).toBe('x');
    });
  });

  describe('materialIcons', () => {
    it('reads the id as a ligature under the filled font by default', () => {
      expect(materialIcons().resolve('home')).toEqual({
        kind: 'font',
        class: 'material-icons',
        text: 'home',
      });
    });

    it('names the other fonts by their variant', () => {
      expect(materialIcons({ variant: 'outlined' }).resolve('home')).toEqual({
        kind: 'font',
        class: 'material-icons-outlined',
        text: 'home',
      });
      expect(glyph(materialIcons({ variant: 'two-tone' }), 'home').class).toBe(
        'material-icons-two-tone',
      );
      // `filled` spelled out is the same font as the default.
      expect(glyph(materialIcons({ variant: 'filled' }), 'home').class).toBe(
        'material-icons',
      );
    });

    it("carries the library's ten roles in Material's names", () => {
      expect(materialIcons().roles).toEqual({
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
      });
      expect(materialIcons({ roles: { user: 'face' } }).roles?.user).toBe(
        'face',
      );
    });
  });

  describe('materialSymbols', () => {
    it('reads the id as a ligature under the outlined font, with no axes set', () => {
      expect(materialSymbols().resolve('home')).toEqual({
        kind: 'font',
        class: 'material-symbols-outlined',
        text: 'home',
      });
    });

    it('names the font by its variant and writes the axes it is given', () => {
      expect(
        materialSymbols({
          variant: 'rounded',
          fill: true,
          weight: 300,
        }).resolve('home'),
      ).toEqual({
        kind: 'font',
        class: 'material-symbols-rounded',
        text: 'home',
        style: { 'font-variation-settings': "'FILL' 1, 'wght' 300" },
      });
      expect(glyph(materialSymbols({ fill: false }), 'x').style).toEqual({
        'font-variation-settings': "'FILL' 0",
      });
      expect(glyph(materialSymbols({ weight: 700 }), 'x').style).toEqual({
        'font-variation-settings': "'wght' 700",
      });
      expect(glyph(materialSymbols({ variant: 'sharp' }), 'x').class).toBe(
        'material-symbols-sharp',
      );
    });

    it('carries the same ten roles as the Icons font', () => {
      expect(materialSymbols().roles).toEqual(materialIcons().roles);
      expect(materialSymbols({ roles: { close: 'cancel' } }).roles?.close).toBe(
        'cancel',
      );
    });
  });

  it('every adapter names every role of the library, and nothing beyond them', () => {
    for (const source of [
      fontAwesome(),
      primeIcons(),
      bootstrapIcons(),
      materialIcons(),
      materialSymbols(),
    ]) {
      expect(Object.keys(source.roles ?? {}).sort()).toEqual([...ROLES].sort());
      for (const role of ROLES)
        expect(typeof source.roles?.[role], role).toBe('string');
    }
  });
});
