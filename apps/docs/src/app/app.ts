import { DOCUMENT } from '@angular/common';
import { Component, effect, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';
import { PctTheme, PctThemeName } from '@pacit/components/theme';

const THEME_KEY = 'pct-docs-theme';

/** The one nav, spelled once — the top bar and the narrow drawer render the same list. */
const NAV = [
  { path: '/components', label: 'Components' },
  { path: '/theming', label: 'Theming' },
  { path: '/trust', label: 'Trust' },
  { path: '/support', label: 'Support' },
] as const;

/**
 * The stored choice, read synchronously at construction — in the browser only; the
 * prerender has no storage and ships themeless. Synchronous on purpose, and the first
 * version measured why: it read the storage in `afterNextRender`, and the persisting
 * effect ran FIRST, saw the not-yet-loaded `null`, and erased the very entry it was
 * about to read — the choice survived exactly one visit, in all three engines.
 */
const storedTheme = (): PctThemeName | null => {
  if (typeof localStorage === 'undefined') return null;
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
};

/**
 * The shell: a top bar, the routed page, a footer — all of it laid out and painted by the
 * library it documents (0060). The theme policy lives HERE, on top of the `[pctTheme]`
 * directive, exactly where 0059 said policy belongs: the shell decides what to pin and
 * where to remember it (`localStorage`), the directive only spells the attribute. The one
 * hand-written mirror onto `<html>` is 0059's recorded root writer — the body's ground
 * sits outside any template scope. The drawer 0060 deferred arrives with the nav that
 * fills it (2.1.7): the same links as the bar, for the widths where the bar has no room.
 */
@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    PctButton,
    PctContainer,
    PctDrawer,
    PctDrawerTrigger,
    PctTheme,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly document = inject(DOCUMENT);

  protected readonly nav = NAV;

  /** `null` = follow the system — the absence of an opinion, not a third theme. */
  protected readonly theme = signal<PctThemeName | null>(storedTheme());

  /** The narrow-viewport menu; every link inside closes it as it navigates. */
  protected readonly menuOpen = signal(false);

  constructor() {
    effect(() => {
      const theme = this.theme();
      const root = this.document.documentElement;
      if (theme === null) root.removeAttribute('data-theme');
      else root.setAttribute('data-theme', theme);
      // Guarded: during prerender there is no storage to remember anything in. The
      // initial run writes back what it just read — a no-op by construction.
      if (typeof localStorage !== 'undefined') {
        if (theme === null) localStorage.removeItem(THEME_KEY);
        else localStorage.setItem(THEME_KEY, theme);
      }
    });
  }

  /** One button, three states: system → dark → light → system. */
  protected cycleTheme(): void {
    const order: ReadonlyArray<PctThemeName | null> = [null, 'dark', 'light'];
    const at = order.indexOf(this.theme());
    this.theme.set(order[(at + 1) % order.length]);
  }

  protected readonly themeLabel = () =>
    this.theme() === null
      ? 'System'
      : this.theme() === 'dark'
        ? 'Dark'
        : 'Light';
}
