import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { ACR_HTML } from '../../../generated/pages-data';
import { describePage } from '../../seo';

/**
 * The Accessibility Conformance Report, rendered from the same tracked file `check-acr`
 * holds to its claims (plan 2.2): one row per WCAG 2.2 criterion, each resting on a gate
 * that runs on every commit — and the assistive-technology pass named as not recorded.
 */
@Component({
  selector: 'docs-acr',
  imports: [PctContainer],
  templateUrl: './acr.html',
  styleUrl: './acr.scss',
})
export class AcrPage {
  constructor() {
    describePage(
      'The Accessibility Conformance Report of @pacit/components: WCAG 2.2 at levels A and AA, every row rendered from a gate that runs on every commit, and the assistive-technology pass named as not yet recorded.',
    );
  }

  protected readonly html =
    inject(DomSanitizer).bypassSecurityTrustHtml(ACR_HTML);
}
