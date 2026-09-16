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
    // The catch-all prerenders ONE page, under `/404`: Angular names a catch-all's
    // parameter `'**'`, and the value is the path the page is written to. The workflow
    // copies that file to the root `404.html` the host serves for every unknown address
    // (decision 0078). The concrete routes above still match this entry and take their
    // own paths; the parameters are read for the catch-all alone.
    path: '**',
    renderMode: RenderMode.Prerender,
    async getPrerenderParams() {
      return [{ '**': '404' }];
    },
  },
];
