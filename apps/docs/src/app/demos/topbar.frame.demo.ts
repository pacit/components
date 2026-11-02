import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';
import { PctNav, PctNavItem, PctNavLink } from '@pacit/components/nav';
import { PctTopbar, PctTopbarTitle } from '@pacit/components/topbar';

/**
 * A frame the application arranges: the navigation at the side while the window is wide, in a
 * drawer opened from the bar while it is narrow. The width is the application's, read after
 * the first render so the server's markup and the client's first one agree, and the drawer is
 * shut before a widening takes its content away.
 */
@Component({
  selector: 'demo-topbar-frame',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    PctButton,
    PctDrawer,
    PctDrawerTrigger,
    PctNav,
    PctNavItem,
    PctNavLink,
    PctTopbar,
    PctTopbarTitle,
  ],
  template: `
    <header pctTopbar>
      @if (!wide()) {
        <button
          pctButton
          pctTopbarStart
          variant="ghost"
          [pctDrawerTrigger]="menu"
        >
          Screens
        </button>
      }
      <h3 pctTopbarTitle>{{ current() }}</h3>
      <span pctTopbarEnd>Ada Lovelace</span>
    </header>

    <div style="display: flex; gap: 16px; padding-block: 12px">
      @if (wide()) {
        <div style="inline-size: 180px">
          <ng-container [ngTemplateOutlet]="screens" />
        </div>
      }
      <p style="margin: 0">The {{ current() }} screen.</p>
    </div>

    <pct-drawer #menu heading="Screens">
      @if (!wide()) {
        <ng-container [ngTemplateOutlet]="screens" />
      }
    </pct-drawer>

    <ng-template #screens>
      <nav pctNav aria-label="Screens">
        @for (screen of names; track screen) {
          <pct-nav-item>
            <a
              pctNavLink
              routerLink="."
              [fragment]="screen"
              [attr.aria-current]="current() === screen ? 'page' : null"
              (click)="current.set(screen); menu.close('api')"
              >{{ screen }}</a
            >
          </pct-nav-item>
        }
      </nav>
    </ng-template>
  `,
})
export class TopbarFrameDemo {
  protected readonly names = ['Rooms', 'Devices', 'Energy'];
  protected readonly current = signal('Rooms');
  protected readonly wide = signal(true);
  private readonly drawer = viewChild.required<PctDrawer>('menu');

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const query = matchMedia('(min-width: 64rem)');
      const sync = () => {
        // Widening takes the drawer's content away: shut it, or an empty panel stays open.
        // An application also moves the keyboard after it (the sandbox's `/frame` does).
        if (query.matches) this.drawer().close('api');
        this.wide.set(query.matches);
      };
      sync();
      query.addEventListener('change', sync);
      destroyRef.onDestroy(() => query.removeEventListener('change', sync));
    });
  }
}
