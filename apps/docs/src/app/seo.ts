import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/**
 * The one description writer, the SEO plumbing of site.md "The bar the site itself meets".
 * Each page states what it is in a sentence; the tag pair mirrors it for scrapers. What is
 * deliberately absent needs a domain the deploy decision has not made yet — site.md
 * "Deploy — decided later, built for now": `og:url`, `og:image`, canonical links and the
 * sitemap, left out rather than faked with a placeholder host.
 *
 * Call from a component's constructor (an injection context — `inject(Meta)` says so).
 */
export const describePage = (description: string): void => {
  const meta = inject(Meta);
  meta.updateTag({ name: 'description', content: description });
  meta.updateTag({ property: 'og:description', content: description });
  meta.updateTag({ property: 'og:type', content: 'website' });
  meta.updateTag({ property: 'og:site_name', content: '@pacit/components' });
};
