// A component of the ordinary shape: the keyword on the class, an input, an output, a required
// model, a public method — and a lifecycle hook, a protected method and a private helper, none
// of which are API and all of which have to stay out of the result.
import { input, model, output } from '@angular/core';

/** @since 0.1.0 */
export class PctPlain {
  /** @since 0.1.0 */
  readonly variant = input<string>('solid');

  /** @since next */
  readonly opened = output<void>();

  /** @since 0.1.0 */
  readonly value = model.required<string>();

  /** @since 0.1.0 */
  open(): void {}

  ngOnInit(): void {}

  protected measureTwice(): number {
    return 2;
  }

  private measure(): number {
    return 0;
  }
}
