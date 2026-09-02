import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Every route prerenders — the site is static by construction (0060): the build emits
 * finished HTML per route, and no server exists to fall back on. A route that cannot
 * prerender is a build error here, which is exactly the loudness a static site wants.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];
