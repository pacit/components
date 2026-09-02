# 0062 — The pages render a form, not markdown, and a demo file is its own code tab

**Status:** accepted
**Implements:** [`req-project-apps`](../requirements/project.md#req-project-apps),
[`req-project-language`](../requirements/project.md#req-project-language) (the site is the
cards worn outward)
**Evidence:** `apps/docs/tools/markdown.mjs` + `build-content.mjs`;
`apps/docs/src/app/demos/` (33 files, each both a running demo and a highlighted
snippet); `apps/docs-e2e/src/pages.spec.ts` — the gallery count, the live dialog, the
`/trust` anchors and the registers' sizes all measured against tracked sources

## The question

Plan 2.1.7: the component pages must render the cards, and the cards are markdown. The
obvious move is a markdown engine plus a highlighter shipped to the client — and both
halves of the obvious move are wrong here.

## A form renderer, deliberately incomplete

The cards are a **form** (`docs/components/README.md` says so, `check-docs` holds them to
it), and support.md is barely more. So the site renders exactly the constructs those
documents use — headings, paragraphs, flat lists, tables (including the form's headless
"empty header" tables), blockquotes, fences, the inline marks — in ~150 lines of
build-time code with no dependency. A full engine would accept anything and render the
mistakes too; this renderer turns an unknown construct into escaped text, which review
then reads as the defect it is. The one dependency is **shiki, at build time only**: one
emitted HTML carries both palettes (`--shiki-dark` variables), and not one highlighter
byte reaches the client.

## One law for links, and /trust is the anchor space

Documents link repository files; pages need routes. `rewriteLink` is the single mapping:
decision records → `/trust#adr-NNNN`, requirements → `/trust#req-…`, lessons →
`/trust#lesson-N`, sibling cards → `/components/:id` — and an address the law does not
know renders as **plain text, never a dead link** (the shell's own rule, applied to
generated prose). /trust renders all three registers under those stable ids, so every
citation in every card lands on a real element; the router's `anchorScrolling` does the
rest.

## The demo file is the snippet

Each component page runs ONE canonical demo — a small standalone component under
`apps/docs/src/app/demos/` — and its code tab shows **that same file**, highlighted by
the content pass. Pixels and snippet share a source; they cannot drift apart. The demo
lazy-loads per id inside a `PendingTasks` span, so the prerender waits and the static
HTML ships with the demo's first frame already drawn — measured: the button page carries
its hero button before any script.

## The landing's chunk carries none of this

The pass emits four modules instead of one: lean cards + evidence (the landing's diet),
the rendered card bodies, the /trust///theming//support registers, and the highlighted
code. Each lazy route imports its own payload; the home chunk never learns how big the
lessons log is.

## Costs

- The hero CTAs are `<button routerLink>`: `pctButton` dresses `button[pctButton]` only,
  and an anchor wearing the button's faces is **library work** at the full regime —
  named in the plan (4.33), not smuggled into the site.
- The shiki theme switch (`[data-theme='dark'] … !important`) mirrors the token system's
  two conditions but not a light island nested inside a dark scope; no page nests themes
  around code today, and the day one does, the switch needs the island's third rule.
- `select.scss` compiles to 7.69 kB and now trips the app's 6 kB style warning on every
  docs build — the library's heaviest stylesheet, named here so the warning reads as a
  known number, not noise.
