import { Routes } from '@angular/router';

/**
 * The whole map of [site.md](../../../../docs/site.md)'s information architecture,
 * filled in by 2.1.7. Every page is lazy — the landing's chunk carries no card bodies,
 * no registry and no highlighted code; each route loads its own payload.
 */
export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    title: '@pacit/components — components that prove themselves',
    loadComponent: () => import('./pages/home/home').then((m) => m.HomePage),
  },
  {
    path: 'start',
    title: 'Get started — @pacit/components',
    loadComponent: () => import('./pages/start/start').then((m) => m.StartPage),
  },
  {
    path: 'components',
    title: 'Components — @pacit/components',
    loadComponent: () =>
      import('./pages/components/components').then((m) => m.ComponentsPage),
  },
  {
    path: 'components/:id',
    title: (route) => `${route.paramMap.get('id')} — @pacit/components`,
    loadComponent: () =>
      import('./pages/component/component').then((m) => m.ComponentPageView),
  },
  {
    path: 'theming',
    title: 'Theming — @pacit/components',
    loadComponent: () =>
      import('./pages/theming/theming').then((m) => m.ThemingPage),
  },
  {
    path: 'trust',
    title: 'Trust — @pacit/components',
    loadComponent: () => import('./pages/trust/trust').then((m) => m.TrustPage),
  },
  {
    path: 'support',
    title: 'Support — @pacit/components',
    loadComponent: () =>
      import('./pages/support/support').then((m) => m.SupportPage),
  },
  {
    path: 'acr',
    title: 'Accessibility conformance report — @pacit/components',
    loadComponent: () => import('./pages/acr/acr').then((m) => m.AcrPage),
  },
  {
    // Last, and reached two ways: by the client router for a link inside the site that
    // leads nowhere, and by the host, which serves the prerendered `/404` for any unknown
    // path (decision 0078). Without it the router throws NG04002 on every such address.
    path: '**',
    title: 'Not found — @pacit/components',
    loadComponent: () =>
      import('./pages/not-found/not-found').then((m) => m.NotFoundPage),
  },
];
