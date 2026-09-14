import { DOCUMENT } from '@angular/common';
import {
  afterNextRender,
  Component,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { PctContainer } from '@pacit/components/container';
import { SUPPORT_HTML, SUPPORT_SECTIONS } from '../../../generated/pages-data';
import { DocsToc } from '../../docs-toc';
import { describePage } from '../../seo';
import { spyOnSections } from '../../spy';

/**
 * The support policy, rendered from the same tracked file `check-support` reads.
 *
 * It takes the conformance report's rail and nothing else: seven sections, 2 929 px, and
 * seven addresses nothing on the site pointed at. No header block, because it is a
 * policy and not a report — there are no identifying fields for a reader to check it by.
 */
@Component({
  selector: 'docs-support',
  imports: [DocsToc, PctContainer],
  templateUrl: './support.html',
  styleUrl: './support.scss',
})
export class SupportPage {
  private readonly document = inject(DOCUMENT);

  constructor() {
    describePage(
      'What a consumer can count on: supported Angular majors, deprecation notice, codemods with every breaking change — read by the same gate that checks the package.',
    );

    const destroyRef = inject(DestroyRef);
    afterNextRender(() =>
      spyOnSections(this.document, destroyRef, (id) => this.active.set(id)),
    );
  }

  protected readonly html =
    inject(DomSanitizer).bypassSecurityTrustHtml(SUPPORT_HTML);
  protected readonly sections = SUPPORT_SECTIONS;
  protected readonly active = signal<string | null>(null);
}
