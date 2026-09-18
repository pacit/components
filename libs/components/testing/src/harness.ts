import {
  BaseHarnessFilters,
  ComponentHarness,
  ComponentHarnessConstructor,
  HarnessPredicate,
  TestElement,
} from '@angular/cdk/testing';

const ATTRIBUTE = 'data-pct-part';

/**
 * The selector of a part — the same string a stylesheet writes (`req-api-parts`).
 *
 * @since 0.1.0
 */
export const partSelector = (name: string): string =>
  `[${ATTRIBUTE}="${name}"]`;

/**
 * The base of every harness in this entrypoint: the CDK's `ComponentHarness`, which knows
 * how to find a host in a TestBed fixture or through a WebDriver, plus the one thing the
 * CDK cannot know — the component's `data-pct-part` inventory, the parts a consumer's
 * selector is allowed to hold across an upgrade (`req-api-parts`, decision 0013).
 *
 * A subclass is a declaration and nothing more: the host selector and the list of parts.
 * Both are held to the built package by `tools/check-harness.mjs`, so a harness cannot
 * name a part the component does not draw, and a part the component draws cannot be
 * missing from its harness — the same two directions the cards are held in.
 *
 * Where a part is looked for: the host itself first (a menu item IS its `item` part), then
 * under the host, then — for a panel the component draws in an overlay, outside its own
 * subtree — anywhere in the document. The last step is what makes `part('panel')` answer
 * on an open select; it also means a test with two open panels of one kind reads the first.
 *
 * @since 0.1.0
 */
export abstract class PctHarness<
  P extends string = string,
> extends ComponentHarness {
  /**
   * The element the harness attaches to — the component's own selector, verbatim. The CDK
   * reads it off the class to find a host, and every harness below overrides it with its own
   * value; the sentence stays here, where a reader of any of them is shown it.
   *
   * Declared and not assigned, on purpose: a default of `''` would be a selector that looks
   * valid and matches nothing, and a harness that forgot to override it would ship. With no
   * value, `check-harness` point 1 says so by name — the cost being that it says so there
   * rather than at the keystroke, since the type is satisfied either way.
   *
   * @since 0.1.0
   */
  declare static hostSelector: string;

  /**
   * The parts the component exposes — the inventory's own names, the ones
   * `libs/components/parts.snapshot.md` records for the class this harness stands on.
   *
   * @since 0.1.0
   */
  static readonly parts: readonly string[] = [];

  /**
   * A predicate for `getHarness` and `getAllHarnesses` with the CDK's own filters —
   * `selector` narrows the host, `ancestor` the subtree it is searched in.
   *
   * @since 0.1.0
   */
  static with<T extends PctHarness>(
    this: ComponentHarnessConstructor<T>,
    options: BaseHarnessFilters = {},
  ): HarnessPredicate<T> {
    return new HarnessPredicate(this, options);
  }

  /**
   * A state the component writes on its host: `state('size')` reads `data-pct-size`
   * (`req-api-attributes` — state is an attribute, never a class name).
   *
   * @since 0.1.0
   */
  async state(name: string): Promise<string | null> {
    return (await this.host()).getAttribute(`data-pct-${name}`);
  }

  /**
   * Whether the part is drawn right now — a spinner while loading, an error once invalid.
   *
   * @since 0.1.0
   */
  async has(name: P): Promise<boolean> {
    return (await this.find(name)) !== null;
  }

  /**
   * The part's element; throws naming the parts that are drawn when this one is not.
   *
   * @since 0.1.0
   */
  async part(name: P): Promise<TestElement> {
    const found = await this.find(name);
    if (found) return found;
    const drawn = await this.drawn();
    throw new Error(
      `${this.constructor.name}: no part "${name}" is drawn. ` +
        `Parts drawn: ${drawn.join(', ') || '(none)'}.`,
    );
  }

  /**
   * Every element of a part — the options, the days, the pages; an empty list is an answer.
   *
   * @since 0.1.0
   */
  async parts(name: P): Promise<TestElement[]> {
    const host = await this.host();
    if ((await host.getAttribute(ATTRIBUTE)) === name) return [host];
    const inside = await this.locatorForAll(partSelector(name))();
    if (inside.length) return inside;
    return this.documentRootLocatorFactory().locatorForAll(
      partSelector(name),
    )();
  }

  /**
   * The part's text, trimmed.
   *
   * @since 0.1.0
   */
  async text(name: P): Promise<string> {
    return (await this.part(name)).text();
  }

  private async find(name: P): Promise<TestElement | null> {
    const host = await this.host();
    if ((await host.getAttribute(ATTRIBUTE)) === name) return host;
    return (
      (await this.locatorForOptional(partSelector(name))()) ??
      (await this.documentRootLocatorFactory().locatorForOptional(
        partSelector(name),
      )())
    );
  }

  private async drawn(): Promise<string[]> {
    const host = await this.host();
    const own = await host.getAttribute(ATTRIBUTE);
    const inside = await this.locatorForAll(`[${ATTRIBUTE}]`)();
    const names = await Promise.all(
      inside.map((el) => el.getAttribute(ATTRIBUTE)),
    );
    return [...new Set([own, ...names].filter((n): n is string => !!n))];
  }
}
