import { Component, signal } from '@angular/core';
import { PctIcon } from '@pacit/components/icon';
import { PctNav, PctNavItem, PctNavLink } from '@pacit/components/nav';

/** Links with icons: the icon is silent, the name is what the link is called. */
@Component({
  selector: 'demo-nav-icons',
  imports: [PctIcon, PctNav, PctNavItem, PctNavLink],
  template: `
    <nav pctNav aria-label="Screens" style="inline-size: 220px">
      @for (screen of screens; track screen) {
        <pct-nav-item>
          <a
            pctNavLink
            [href]="'#' + screen"
            [attr.aria-current]="current() === screen ? 'page' : null"
            (click)="current.set(screen)"
          >
            <pct-icon pctNavIcon>
              <svg
                viewBox="0 0 16 16"
                width="100%"
                height="100%"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                focusable="false"
              >
                <path d="M2.5 7.5 8 3l5.5 4.5V13h-11z" />
              </svg>
            </pct-icon>
            {{ screen }}
          </a>
        </pct-nav-item>
      }
    </nav>
  `,
})
export class NavIconsDemo {
  protected readonly screens = ['Rooms', 'Devices', 'Settings'];
  protected readonly current = signal('Rooms');
}
