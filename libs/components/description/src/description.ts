import {
  Component,
  inject,
  isDevMode,
  ElementRef,
  afterNextRender,
} from '@angular/core';
import { nextPctId } from '@pacit/components/core';

/**
 * A description list: the details of one thing as terms and their values — a property and its
 * reading, a setting and its control.
 *
 * **The platform's `<dl>`, all of it.** The selector demands the element, so the terms and the
 * values are the platform's `term` and `definition` and a reader pairs them; each pair is a
 * `div[pctDescription]`, the one wrapper the platform lets a `<dl>` hold, and that wrapper
 * writes the `<dt>` and the `<dd>` itself, so a pair cannot be written out of the order the
 * platform reads it in
 * ([0110](../../../../docs/decisions/0110-a-frame-is-three-parts-the-application-arranges.md)).
 *
 * **No breakpoint.** A pair stands on one row while the row holds the term's width and the
 * value's floor, and the value wraps under its term when it does not — a wrap the row decides
 * by its own width, wherever the list stands.
 *
 * @example
 * <dl pctDescriptionList>
 *   <div pctDescription>
 *     <span pctDescriptionTerm>Supply temperature</span>
 *     21.4 °C
 *   </div>
 * </dl>
 *
 * @since next
 */
@Component({
  selector: 'dl[pctDescriptionList]',
  templateUrl: './description-list.html',
  styleUrl: './description-list.scss',
  host: { class: 'pct-description-list' },
})
export class PctDescriptionList {}

/**
 * One pair of the list: the term, its value, and a control that changes the value when the
 * thing can be changed. The host is the `<div>` a `<dl>` may group a pair in; the `<dt>` and the
 * `<dd>`s are this component's own.
 *
 * **The control is named by the term.** `termId` is the `id` of the `<dt>`, so the control
 * takes it as its `ariaLabelledby` and a reader calls the switch by the property it switches —
 * the term is written once and is the name of both.
 *
 * @example
 * <div pctDescription #heating="pctDescription">
 *   <span pctDescriptionTerm>Heating</span>
 *   On
 *   <pct-switch pctDescriptionControl [ariaLabelledby]="heating.termId" [(checked)]="on" />
 * </div>
 *
 * @since next
 */
@Component({
  selector: 'div[pctDescription]',
  exportAs: 'pctDescription',
  templateUrl: './description.html',
  styleUrl: './description.scss',
  host: { class: 'pct-description' },
})
export class PctDescription {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /**
   * The `id` of the term's `<dt>`: the name a control in this pair is labelled by.
   *
   * @since next
   */
  readonly termId = nextPctId('pct-description-term');

  constructor() {
    if (isDevMode()) afterNextRender(() => this.warnOnLoosePair());
  }

  /**
   * A pair outside `dl[pctDescriptionList]` is a `<dt>` and a `<dd>` with no `<dl>` above
   * them — markup the platform does not read as a term and its value. Said once, in dev mode.
   */
  private warnOnLoosePair(): void {
    // Rendered, so it has a parent: the host stands in the template that declared it.
    if (
      (this.host.nativeElement.parentElement as HTMLElement).localName === 'dl'
    )
      return;
    console.warn(
      `[pctDescription] A pair whose parent element is not a <dl>. A term and its value are read as a pair only inside a description list — axe counts a loose <dt> as a serious violation. Make the pair a direct child of <dl pctDescriptionList>.`,
    );
  }
}
