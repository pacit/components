import { Component, signal } from '@angular/core';
import { PctNav, PctNavItem, PctNavLink } from '@pacit/components/nav';

/** A navigation of three screens, the current one marked by aria-current. */
@Component({
  selector: 'demo-nav',
  imports: [PctNav, PctNavItem, PctNavLink],
  template: `
    <nav pctNav aria-label="Screens" style="inline-size: 200px">
      @for (screen of screens; track screen) {
        <pct-nav-item>
          <a
            pctNavLink
            [href]="'#' + screen"
            [attr.aria-current]="current() === screen ? 'page' : null"
            (click)="current.set(screen)"
            >{{ screen }}</a
          >
        </pct-nav-item>
      }
    </nav>
  `,
})
export class NavDemo {
  protected readonly screens = ['Rooms', 'Devices', 'Settings'];
  protected readonly current = signal('Devices');
}
