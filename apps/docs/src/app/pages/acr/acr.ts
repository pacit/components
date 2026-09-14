import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import { PctContainer } from '@pacit/components/container';
import {
  ACR_FACTS,
  ACR_HTML,
  ACR_SECTIONS,
} from '../../../generated/pages-data';
import { DocsToc } from '../../docs-toc';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';

/**
 * The conformance report, rendered from the tracked file `check-acr` holds to its claims.
 *
 * **It is the page a procurement office prints, and it was 8 971 px of one prose column with
 * no furniture at all**: six sections, four tables, 65 criterion rows, and its
 * identifying fields — product, standard, report date, evaluation methods — arriving as
 * ordinary paragraphs among the prose. The six headings have carried stable addresses since
 * the day the report was first rendered, slugged the way GitHub slugs them, and nothing on
 * the site pointed at one of them.
 *
 * So: the rail the component page already runs, and the fields in the header block a VPAT
 * reader looks for first. The words are the report's own — the page frames them and does not
 * rewrite them, because a gate reads that file.
 */
@Component({
  selector: 'docs-acr',
  imports: [DocsToc, RouterLink, PctButton, PctContainer],
  templateUrl: './acr.html',
  styleUrl: './acr.scss',
})
export class AcrPage {
  private readonly document = inject(DOCUMENT);
  private readonly sanitizer = inject(DomSanitizer);

  constructor() {
    describePage(
      'The accessibility conformance report for @pacit/components: WCAG 2.2 A and AA, one row per criterion, each answer naming the gate that holds it.',
    );

    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      spyOnSections(this.document, destroyRef, (id) => this.active.set(id)),
    );
  }

  protected readonly html = this.sanitizer.bypassSecurityTrustHtml(ACR_HTML);
  protected readonly facts = ACR_FACTS.map((fact) => ({
    ...fact,
    valueHtml: this.sanitizer.bypassSecurityTrustHtml(fact.value),
  }));
  protected readonly sections = ACR_SECTIONS;
  protected readonly active = signal<string | null>(null);

  /** The one page on this site somebody prints — so the print is a control, not a guess. */
  protected print(): void {
    this.document.defaultView?.print();
  }
}
