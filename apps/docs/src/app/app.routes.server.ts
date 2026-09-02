import { RenderMode, ServerRoute } from '@angular/ssr';
import { DOCS_CARDS } from '../generated/content';

/**
 * Every route prerenders — the site is static by construction (0060): the build emits
 * finished HTML per route, and no server exists to fall back on. A route that cannot
 * prerender is a build error here, which is exactly the loudness a static site wants.
 * The one parameterised route names its pages from the same generated inventory the
 * pages render — a card without a prerendered page is impossible by construction.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'components/:id',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return DOCS_CARDS.map((card) => ({ id: card.id }));
    },
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
