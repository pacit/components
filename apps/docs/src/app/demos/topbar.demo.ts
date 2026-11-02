import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTopbar, PctTopbarTitle } from '@pacit/components/topbar';

/** A top bar: the screen's title, and sign-out at the end. */
@Component({
  selector: 'demo-topbar',
  imports: [PctButton, PctTopbar, PctTopbarTitle],
  template: `
    <header pctTopbar style="inline-size: 260px">
      <h3 pctTopbarTitle>Living room</h3>
      <button pctButton pctTopbarEnd variant="outline" size="sm">
        Sign out
      </button>
    </header>
  `,
})
export class TopbarDemo {}
