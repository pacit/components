// @pacit/components/testing — the instrument a consumer's own suite holds the library's
// promises with: one harness per component on the `data-pct-part` contract, and the DOM
// helpers for a plain fixture. Nothing here reaches an application bundle; the entrypoint
// is imported by tests alone.
export { allParts, part, query } from './dom';
export { PctHarness, partSelector } from './harness';
export * from './harnesses';
