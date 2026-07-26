import { Route } from '@angular/router';
import { SBX_VIEWS } from './views';

/** Trasy budowane z rejestru widoków — patrz `views.ts`. */
export const appRoutes: Route[] = SBX_VIEWS.map((view) => ({
  path: view.path,
  title: `${view.title} · @pacit/components`,
  loadComponent: view.load,
}));
