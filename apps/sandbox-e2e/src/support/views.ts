/**
 * Trasy sandboxa w kolejności z rejestru (`apps/sandbox/src/app/views.ts`).
 *
 * Projekt e2e nie kompiluje kodu aplikacji, więc lista jest tu powtórzona.
 * Żeby powtórzenie nie zaczęło cicho odstawać, `shell.spec.ts` porównuje ją
 * z nawigacją wyrenderowaną przez powłokę — dodanie widoku bez dopisania go
 * tutaj zapala test, zamiast po cichu wyłączyć jego audyt a11y.
 */
export const SBX_ROUTES = [
  '/',
  '/button',
  '/field',
  '/text',
  '/number',
  '/checkbox',
  '/radio',
  '/select',
  '/size',
  '/states',
  '/all',
] as const;
