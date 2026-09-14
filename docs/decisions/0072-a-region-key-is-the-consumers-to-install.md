# 0072 — A region key is the consumer's to install

**Status:** accepted
**Implements:** [`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-attributes`](../requirements/api.md#req-api-attributes)
**Evidence:** `libs/components/core/src/regions.ts`,
`libs/components/toast/src/toast-viewport.ts`, `libs/components/core/src/core.spec.ts`
(five cases, one of them the refusal), `apps/sandbox-e2e/src/regions.spec.ts` (four cases in
three engines), [`lesson-181`](../lessons.md#lesson-181)

## The question

A toast's `Undo` is a real control on a real card, and the card is a child of `body`. So it
stands after every control on the page: a keyboard user who wants it walks the whole document
first. The clock at least does not run out during that walk — an action makes a message
standing, and focus inside the stack stops every clock — but **"reachable in principle" is not
the promise "reachable" makes**.

The same gap arrives from the other side at the first navigation drawer written at the end of a
template: it is somewhere, and it is the wrong somewhere. One question underneath both: how does
a keyboard reach a region that is not where the reading order says it is?

## The usual answer, and why it is not ours to give

Implementations answer with a global key — F6 in several, F8 in others — installed on the
document. The disagreement between them IS the argument: a library that installs a
document-level listener is taking a keystroke away from an application that never offered one,
and this repository has measured nothing about which key an application has free. A component
library does not get to spend the host application's keyboard.

## The decision

**The library ships the mechanism and mounts nothing.** Three pieces, in an entrypoint of
their own — `@pacit/components/regions`:

- `PctRegions`, a root service holding the registered regions and moving focus between them,
  in the DOCUMENT's order read at the moment of the press;
- `[pctRegion]`, which declares an element a place the keyboard can be sent to and names it;
- `[pctRegionKey]`, which listens **on the element a consumer puts it on** — F6 by default,
  the key an input, and the document untouched unless the consumer writes one word more.

`./core` keeps the SHAPE and the CHANNEL: the `PctRegion` and `PctRegionsApi` interfaces and a
`PCT_REGIONS` token whose default factory answers `null`. That split is a measurement rather
than tidiness. Written into `./core`, the service and its two directives cost **+19111 B over
the package** — a `providedIn: 'root'` service compiles to a static initialiser calling an
imported function, which no bundler may treat as pure, so every entrypoint that imports `./core`
carried a cycle it never used (`lesson-173` in its fourth disguise). Moved out, the same
mechanism is **5515 B in its own entrypoint** and `./core` grows by 108 — the token and the
interfaces. A consumer who never installs the cycle pays that, and the toast's optional
integration, and nothing else.

And it is a `providePctRegions()` rather than a root service for the same reason twice over: a
provider is what an application writes when it decides to have something, and a service nobody
provides is a service nobody's bundle has to keep.

The toast's stack registers itself, because it is the shape the question was asked about, and
it answers the same key from inside the stack: a press there can never reach the element the
key was mounted on, since the stack is a child of `body` and the application is elsewhere in
the tree. It answers only when a consumer has chosen a key — with no `[pctRegionKey]` on the
page, F6 does exactly what it did before this existed.

## The hole in the honest default, and the word that closes it

A keydown reaches an element only when focus is already inside it, and a page that has just
loaded has focus on `body` — outside every element on it. So with the default `listenOn="host"`
the first press of a cold page does nothing, and the cycle starts working once the user has
tabbed in. That was measured rather than reasoned about: the first version of the e2e case
pressed F6 on a fresh page and focus stayed on `body`.

`listenOn="document"` closes it, and it is **a word the consumer writes**. The library still
installs nothing anywhere by itself; an application that writes it has decided the key is free
for it to take. The sandbox writes it, because a sandbox is an application.

## What this costs us

- **Two ways to mount one key**, and a consumer has to understand the difference to pick. The
  default is the conservative one and the documentation says plainly what it cannot do.
- **A provider to install and an entrypoint to import**, which is two steps where a root
  service would have been none. It is the price of not charging thirty-four entrypoints for a
  mechanism most of them never use.
- **A region is focused as a whole**, which means a `tabindex="-1"` written onto a consumer's
  element by the library. It is written only on arrival, and only when the element carries no
  `tabindex` of its own.
- **Nothing announces the cycle.** A user who does not try F6 never learns it is there; a
  library cannot teach a keystroke it did not choose. What it can do is name the places, which
  is why the stack's region carries a string of the text channel (`toastRegion`).
- **The order is the document's**, so a stack appended to `body` sits last in the cycle as well
  as in the tab order. The cycle is not there to reorder a page — it is there to make one hop
  out of a walk.

## Alternatives considered

| alternative                                      | why rejected                                                                                                      |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| A document-level F6 the library installs         | takes a keystroke from an application that never offered one, and F6 vs F8 is a disagreement nobody here measured |
| A skip link into the stack                       | answers the toast alone and not the drawer, and it puts a control on the page for a state that is usually absent  |
| Moving focus into the stack when a toast appears | steals focus from what the user was doing — the defect `role="alert"` exists to avoid                             |
| Ordering regions by registration                 | a region inside an `@if` would take its place in the cycle from whenever it happened to be created                |
| Focusing the first control inside a region       | skips whatever the region says it is, which is the one thing a keyboard user arriving there needs                 |
