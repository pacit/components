import { Component, inject, input, linkedSignal } from '@angular/core';
import { PctSize } from '@pacit/components';
import { PctTheme } from '@pacit/components/theme';
import { SbxControls } from './controls';
import { PctDocId } from './doc-ids';
import {
  SBX_ALL_CONTROLS,
  SbxControl,
  SbxDir,
  SbxScheme,
  SbxSettings,
} from './settings';

/**
 * Demo card — the shared wrapper around every example in the sandbox.
 *
 * It sets the theme and the skin on **its own subtree** (`data-theme` /
 * `data-skin` on the stage), never on `:root`. That makes every example a test
 * of the scoped theme (req-token-scoped) as well — with no example written for it.
 *
 * The card follows the global settings until somebody moves its own bar;
 * `linkedSignal` lets a global change take it back.
 *
 * The bar is **chrome**, so it stands outside the stage — otherwise the theme
 * switch would be changing itself and two cards could not be compared side by side.
 *
 * @example
 * <sbx-demo #d heading="Variants" [reqs]="['req-api-signals']">
 *   <button pctButton [size]="d.activeSize()">Solid</button>
 * </sbx-demo>
 */
@Component({
  selector: 'sbx-demo',
  imports: [SbxControls, PctTheme],
  templateUrl: './demo.html',
  styleUrl: './demo.scss',
})
export class SbxDemo {
  private readonly settings = inject(SbxSettings);

  /** The card heading. Not `title` — that is a global HTML attribute (a tooltip). */
  readonly heading = input.required<string>();

  /** One sentence: what this example shows. */
  readonly summary = input<string>('');

  /**
   * The requirements the example is about (for instance `req-api-size`).
   *
   * The type is a **union generated from the documentation**
   * (`tools/check-docs.mjs --write`), not `string`: while it was `string[]`, a typo
   * gave a chip leading nowhere, which is a silent defect (`req-axis`). The same
   * move as `PctCssVar` for reading tokens (`lesson-43`).
   */
  readonly reqs = input<readonly PctDocId[]>([]);

  /** Which axes this card lets you move; `[]` hides the bar. */
  readonly controls = input<readonly SbxControl[]>(SBX_ALL_CONTROLS);

  /** The starting value of an axis; `null` = take the global one. */
  readonly scheme = input<SbxScheme | null>(null);
  readonly skin = input<string | null>(null);
  readonly size = input<PctSize | null>(null);
  readonly dir = input<SbxDir | null>(null);

  /** The values in force on the stage — the card content reads them too. */
  readonly activeScheme = linkedSignal<SbxScheme>(
    () => this.scheme() ?? this.settings.scheme(),
  );
  readonly activeSkin = linkedSignal<string>(
    () => this.skin() ?? this.settings.skin(),
  );
  readonly activeSize = linkedSignal<PctSize>(
    () => this.size() ?? this.settings.size(),
  );
  readonly activeDir = linkedSignal<SbxDir>(
    () => this.dir() ?? this.settings.dir(),
  );
}
