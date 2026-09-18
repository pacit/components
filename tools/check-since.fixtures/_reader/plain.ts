// A component of the ordinary shape: the keyword on the class, an input, an output, a public
// method, a lifecycle hook Angular calls and a private helper. The last two are not API.
import { input, output } from '@angular/core';

/** @since 0.1.0 */
export class PctPlain {
  /** @since 0.1.0 */
  readonly variant = input<string>('solid');

  /** @since next */
  readonly opened = output<void>();

  /** @since 0.1.0 */
  open(): void {}

  ngOnInit(): void {}

  private measure(): number {
    return 0;
  }
}
