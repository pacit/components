/**
 * The sandbox routes in the order of the registry (`apps/sandbox/src/app/views.ts`).
 *
 * The e2e project does not compile the application code, so the list is repeated
 * here. To keep the repetition from quietly drifting, `shell.spec.ts` compares it
 * with the navigation the shell renders — adding a view without listing it here
 * fires a test instead of silently switching off its a11y audit.
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
