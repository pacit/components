import { Routes } from '@angular/router';

/**
 * One route today — the scaffold's honest inventory. The pages of
 * [site.md](../../../../docs/site.md) land here step by step: `/components` and
 * `/components/:id` with 2.1.5's pipeline, `/start`, `/theming`, `/trust` and
 * `/support` with 2.1.7.
 */
export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: '@pacit/components — components that prove themselves',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
];
