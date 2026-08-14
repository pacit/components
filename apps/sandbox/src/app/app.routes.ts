import { Route } from '@angular/router';
import { SBX_VIEWS } from './views';

/** The routes built from the view registry — see `views.ts`. */
export const appRoutes: Route[] = SBX_VIEWS.map((view) => ({
  path: view.path,
  title: `${view.title} · @pacit/components`,
  loadComponent: view.load,
}));
