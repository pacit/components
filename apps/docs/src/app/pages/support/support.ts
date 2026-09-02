import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { SUPPORT_HTML } from '../../../generated/pages-data';

/** The support policy, rendered from the same tracked file `check-support` reads. */
@Component({
  selector: 'docs-support',
  imports: [PctContainer],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportPage {
  protected readonly html =
    inject(DomSanitizer).bypassSecurityTrustHtml(SUPPORT_HTML);
}
