import { Component, computed, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctTone } from '@pacit/components/core';
import { PctRadio, PctRadioGroup } from '@pacit/components/radio';

/**
 * Tones
 *
 * `tone` picks which of the skin's families the face paints from — the same four names the
 * toast and the progress bar wear. Move the choice and watch the four faces follow: there is
 * no `primary` tone, because a button without one already is the brand, and `None` is what
 * every button here is by default.
 *
 * The fifth face is missing from the row on purpose. `hero` is the brand gradient and takes
 * no tone at all; ask it for one and it says so in dev mode rather than quietly ignoring you.
 *
 * The colour is never the message. "Delete account" says danger in words, and that is what a
 * reader hears — a red button labelled "OK" tells nobody anything they could not see.
 */
@Component({
  selector: 'demo-button-tones',
  imports: [PctButton, PctRadio, PctRadioGroup],
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }
  `,
  template: `
    <pct-radio-group ariaLabel="Tone" [(value)]="choice">
      <pct-radio value="none">None</pct-radio>
      <pct-radio value="danger">danger</pct-radio>
      <pct-radio value="warning">warning</pct-radio>
      <pct-radio value="success">success</pct-radio>
      <pct-radio value="info">info</pct-radio>
    </pct-radio-group>

    <div class="row">
      <button pctButton [tone]="tone()">Solid</button>
      <button pctButton variant="outline" [tone]="tone()">Outline</button>
      <button pctButton variant="ghost" [tone]="tone()">Ghost</button>
      <button pctButton variant="soft" [tone]="tone()">Soft</button>
    </div>
  `,
})
export class ButtonTonesDemo {
  readonly choice = signal<PctTone | 'none'>('danger');

  /** `none` is the absence of a tone, which is what the input takes: there is no member for it. */
  protected readonly tone = computed(() => {
    const chosen = this.choice();
    return chosen === 'none' ? null : chosen;
  });
}
