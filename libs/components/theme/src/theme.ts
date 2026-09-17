import { Directive, input } from '@angular/core';

/**
 * The two themes the shipped skin keys its blocks on.
 *
 * @since 0.1.0
 */
export type PctThemeName = 'light' | 'dark';

/**
 * Theme as a template binding: `[pctTheme]="'dark'"` writes `data-theme="dark"` on the
 * host — the attribute the generated skin keys its theme blocks on — and `null` removes
 * it, so the system preference speaks again
 * ([`req-token-system`](../../../../docs/requirements/tokens.md#req-token-system)).
 *
 * The directive is **sugar and nothing else**
 * ([0059](../../../../docs/decisions/0059-a-theme-is-an-attribute-the-skin-reads.md)):
 * the mechanism stays the cascade itself, and a hand-written `data-theme` produces the
 * same theme to the pixel — the sandbox measures the two side by side. Scoping follows
 * from where the attribute lands: on `<html>` it is the page's theme, on a panel it is
 * the panel's, and the token build's transitive closure keeps the component tokens
 * re-themed down the whole subtree either way.
 *
 * @example
 * <aside [pctTheme]="userPrefersDark() ? 'dark' : null">…</aside>
 *
 * @since 0.1.0
 */
@Directive({
  selector: '[pctTheme]',
  host: { '[attr.data-theme]': 'pctTheme()' },
})
export class PctTheme {
  /**
   * The theme to pin on this subtree, or `null` to follow the page.
   *
   * @since 0.1.0
   */
  readonly pctTheme = input.required<PctThemeName | null>();
}
