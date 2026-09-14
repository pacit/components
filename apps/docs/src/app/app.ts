import { DOCUMENT, ViewportScroller } from '@angular/common';
import {
  ApplicationRef,
  Component,
  afterNextRender,
  effect,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';
import { PctTheme, PctThemeName } from '@pacit/components/theme';
import { DocsIndex } from './pages/component/docs-index';

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
 * fills it (0062): the same links as the bar, for the widths where the bar has no room.
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
    DocsIndex,
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
    // The router's anchor scrolling positions a fragment's target ITSELF — `scrollTo` on
    // the element's rectangle — and reads neither `scroll-padding` nor `scroll-margin`, so
    // the offset the stylesheet declares for a native #fragment jump is invisible to it.
    // Measured on the component page before this: a table-of-contents link put its heading
    // at y=0, under the 56px bar (`lesson-159`). The router is handed the SAME number the
    // stylesheet uses, read from it at each scroll rather than copied — `--docs-anchor-offset`
    // is declared once, on `html`, and this is its second reader.
    const document = this.document;
    inject(ViewportScroller).setOffset(() => [
      0,
      parseFloat(
        document.defaultView
          ?.getComputedStyle(document.documentElement)
          .getPropertyValue('--docs-anchor-offset') ?? '',
      ) || 0,
    ]);

    // The "the page is interactive" marker for the e2e suite — the sandbox's own idiom
    // (its lesson-30): until hydration the server's DOM can be clicked but nothing
    // listens, and with the demos arriving as lazy chunks the window between "visible"
    // and "wired up" is long enough for a loaded test runner to fall into. Measured
    // here the night the site's full suite first ran: a switch click swallowed and three
    // screenshots "never stable", all under 300-test contention.
    const appRef = inject(ApplicationRef);
    afterNextRender(async () => {
      await appRef.whenStable();
      this.document.documentElement.setAttribute('data-docs-ready', '');
    });

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
