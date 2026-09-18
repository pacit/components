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

  /**
   * A field that is no input: it ships in the types like the rest, so it is dated too.
   *
   * @since 0.1.0
   */
  readonly id = 'pct-plain-1';

  /**
   * A getter, which the readers count beside the fields.
   *
   * @since next
   */
  get ready(): boolean {
    return true;
  }

  /** @since 0.1.0 */
  open(): void {}

  ngOnInit(): void {}

  protected measureTwice(): number {
    return 2;
  }

  protected readonly hiddenField = 'not API';

  private measure(): number {
    return 0;
  }
}
