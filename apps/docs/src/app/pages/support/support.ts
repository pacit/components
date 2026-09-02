import { Component, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { SUPPORT_HTML } from '../../../generated/pages-data';
import { describePage } from '../../seo';

/** The support policy, rendered from the same tracked file `check-support` reads. */
@Component({
  selector: 'docs-support',
  imports: [PctContainer],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportPage {
  constructor() {
    describePage(
      'What a consumer can count on: supported Angular majors, deprecation notice, codemods with every breaking change — read by the same gate that checks the package.',
    );
  }

  protected readonly html =
    inject(DomSanitizer).bypassSecurityTrustHtml(SUPPORT_HTML);
}
