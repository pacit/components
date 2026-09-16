import { Component, inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { PctContainer } from '@pacit/components/container';
import { describePage } from '../../seo';

/**
 * The page behind every address the site does not have. It is prerendered once, under
 * `/404`, and the host serves that file for any unknown path with a real 404 status
 * (decision 0078) — which is why nothing here derives from the address the reader typed:
 * the same HTML hydrates at `/404` and at `/no/such/page`, and a path in the markup would
 * be a hydration mismatch. The client router reaches it through the catch-all route, so a
 * wrong link inside the site lands here as well, with the console silent.
 */
@Component({
  selector: 'docs-not-found',
  imports: [PctContainer, RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFoundPage {
  constructor() {
    describePage(
      'There is no page at this address on the @pacit/components site.',
    );
    // The status tells the host; this tells a crawler that followed a dead link here.
    inject(Meta).updateTag({ name: 'robots', content: 'noindex' });
  }
}
