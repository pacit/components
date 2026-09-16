import { DOCUMENT } from '@angular/common';
import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { canonicalUrl, SITE_ORIGIN } from '../generated/site';

/** The one brand image a scraper shows beside a link — 1200×630, in `public/`. */
const OG_IMAGE = 'og-image.png';

/**
 * The one description writer, the SEO plumbing of site.md "The bar the site itself meets".
 * Each page states what it is in a sentence; the tag pair mirrors it for scrapers, and the
 * address tags say where the page lives: the canonical link and `og:url` in the form the
 * host serves — origin from `public/CNAME`, the route's own path, the trailing slash
 * (decision 0078) — and `og:title` from the route's title, which the snapshot already
 * carries at construction where `Title.getTitle()` still holds the previous page's.
 *
 * The path is read off the activated route's snapshot and not off the router's URL: at
 * construction the router still reports the navigation it is leaving.
 *
 * Call from a component's constructor (an injection context — `inject(Meta)` says so).
 */
export const describePage = (description: string): void => {
  const meta = inject(Meta);
  const document = inject(DOCUMENT);
  const route = inject(ActivatedRoute).snapshot;
  const path = route.pathFromRoot
    .flatMap((r) => r.url.map((segment) => segment.path))
    .join('/');
  const url = canonicalUrl(path);
  const title = route.title ?? document.title;

  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:title', content: title });
  meta.updateTag({ property: 'og:description', content: description });
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:site_name', content: '@pacit/components' });
  meta.updateTag({ property: 'og:url', content: url });
  meta.updateTag({
    property: 'og:image',
    content: `${SITE_ORIGIN}/${OG_IMAGE}`,
  });
  meta.updateTag({ property: 'og:image:width', content: '1200' });
  meta.updateTag({ property: 'og:image:height', content: '630' });
  meta.updateTag({
    property: 'og:image:alt',
    content: 'The PacIT mark beside the name @pacit/components',
  });
  meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });

  // Angular has no service for `<link>`; the document is the seam. Found and updated rather
  // than appended, or a client-side navigation would leave one canonical per page visited.
  const head = document.head;
  const link =
    head.querySelector<HTMLLinkElement>('link[rel="canonical"]') ??
    head.appendChild(document.createElement('link'));
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', url);
};
