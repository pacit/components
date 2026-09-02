import { inject } from '@angular/core';
import { Meta } from '@angular/platform-browser';

/**
 * The one description writer (2.1.8's SEO plumbing). Each page states what it is in a
 * sentence; the tag pair mirrors it for scrapers. What is deliberately absent needs a
 * domain the deploy decision (3.1) has not made yet: `og:url`, `og:image`, canonical
 * links and the sitemap — recorded in the plan, not faked with a placeholder host.
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
