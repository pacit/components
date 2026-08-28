# 0045 — A panel nobody chose is still text in the document

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-token-logical`](../requirements/tokens.md#req-token-logical)
**Evidence:** four probes over three engines. `hidden="until-found"` computes
`content-visibility: hidden` with `display: block` in chromium, firefox **and** webkit, while
a value the engine does not know (`hidden="nonsense"`) falls back to `display: none` in all
three; a node inside such a subtree answers `checkVisibility() === false` in all three, and
chromium's own accessibility tree — read through CDP — holds **no node for it at all**, not
even an ignored one; focus cannot enter it, by `Tab` or by `focus()`, in any of the three; and
its text is still reachable by a `Range`, which is the mechanism find-in-page is built on.
Playwright's `ariaSnapshot()` disagrees with the engines on webkit, which is the tool's tree
and not the browser's ([`lesson-125`](../lessons.md#lesson-125))

## Context

Tabs are the first component here whose whole job is to **hide something the consumer wrote**.
Every panel in the library so far arrived on top of the page — a dialog, a menu, a toast — and
what it hid was nothing, because it was not there a moment earlier. A tab strip is the
opposite: all of the content exists, all of it was written by the consumer, and the component
decides which part of it a person may see.

That makes the hiding a decision rather than an implementation detail, and there were four
candidates:

- **`@if`** — the panel is not in the DOM. State inside it is lost on every switch, the
  consumer's `@defer` and `@ViewChild` stop being predictable, and the text is gone from the
  document,
- **`[hidden]` / `display: none`** — the panel is in the DOM and out of the layout, the
  accessibility tree and find-in-page,
- **`visibility: hidden` / `opacity: 0`** — out of sight, still in the layout and, for
  `opacity`, still in the accessibility tree. The last is the defect
  [`req-token-no-opacity`](../requirements/tokens.md#req-token-no-opacity) exists for,
- **`hidden="until-found"`** — in the DOM, out of the layout and out of the accessibility
  tree, and **searchable**: the browser's own find-in-page looks inside it, reveals it, and
  fires `beforematch` first.

The question the fourth one asks is the one worth settling: **is text a user cannot currently
see still part of the document?** For a tab panel the honest answer is yes. Nobody deleted the
Network settings by looking at the General ones, and a person pressing Ctrl+F for a word they
know is on this page is not asking about the strip.

## Decision

### An unchosen panel is `hidden="until-found"`, and a disabled one is `hidden`

`PctTab` binds `[attr.hidden]` to a computed with three states and no fourth:

| what the panel is           | attribute      | what the browser does                        |
| --------------------------- | -------------- | -------------------------------------------- |
| showing                     | absent         | the panel is the page                        |
| not showing                 | `until-found`  | `content-visibility: hidden`, and findable   |
| not showing, and disabled   | `''`           | `display: none`                              |

The third row is not symmetry for its own sake. **Find-in-page is a promise of a way in**: the
browser reveals what it found and leaves the user standing in it. A disabled tab has no way in
— the walk steps over it and the press is refused — so offering its text to a search would
take the user to a section and then refuse to open it. Hiding it outright is the honest answer,
and it costs the one thing it should: text nobody can reach is not searchable.

### The reveal is answered, or it is undone a frame later

`beforematch` fires **before** the browser removes the attribute and before it scrolls. The
panel answers it by asking the strip to choose it. Without that answer the sequence is: the
browser removes `hidden`, Angular's next pass writes it straight back from the binding, and the
user watches the thing they searched for appear and vanish. **The event is the whole cost of
the feature**, and a component that took the attribute without taking the event would be worse
than one that used plain `hidden`.

### The stylesheet has to say `display` twice, and guard the second time

The browser's own rule is `[hidden] { display: none }`, and it is a user-agent rule — so
`:host { display: block }`, being an author rule, silently beats it and every panel would show.
Writing `:host([hidden]) { display: none }` back is therefore compulsory. But
`hidden="until-found"` **must not** become `display: none`: the browser hides that subtree with
`content-visibility`, and `content-visibility` does nothing to a box that is not generated at
all.

So the sheet restores `display: block` for `until-found` — inside `@supports (content-visibility:
hidden)`, and restating the property there. That guard is the fallback, and the measurement is
what makes it more than a ritual: an engine that does not know the attribute reads the value as
unknown, falls into the plain hidden state, and gets `display: none` from the rule above.
Without the `@supports` this component would show every panel at once on such an engine — the
loudest possible failure, from the one line that looks like a detail.

### The panels are the consumer's markup, in the place they wrote it

`<pct-tab>` **is** the panel: `role="tabpanel"` on its own host, content projected once, and
`label` handed up so that the strip above can draw a `<button role="tab">` for it. Nothing
travels through an `<ng-template>` and nothing is rendered twice, so the DOM order the APG asks
for — the whole strip, then the panels — is the order anybody writing the markup would use
anyway.

The price is one that has to be said plainly: **every panel's content is rendered, always.** A
consumer whose panel is expensive wraps their own content in an `@defer` or an `@if` — which is
a thing they can do, and a thing this component could not do for them without taking the text
back out of the document, which is the whole point of the decision above.

## Consequences

- **A search finds what a tab strip is hiding.** That is new for this library and, on the
  measurement above, free in all three engines,
- **the panels cannot be cheap by default.** See the price above; it is written into the
  component's card as a limitation rather than left to be discovered,
- **`value` cannot be a required input** on `PctTab`. The strip resolves which panel shows by
  comparing every panel's value against its own, and that comparison is read from a panel's
  host binding — which, under an `@for`, runs before the next iteration's inputs exist
  ([`lesson-124`](../lessons.md#lesson-124)). `label` stays required, because it is read from
  the strip's template, one phase later,
- **the strip is a scroll container, and two engines of three make it focusable** — with
  `tabIndex === -1`, so it never joins the page's tab order. Measured rather than assumed, and
  held by a test ([`lesson-126`](../lessons.md#lesson-126)),
- **nothing here is announced through `PctAnnouncer`.** A tab strip is the most homed control
  in the library: the tab takes focus and the panel it names is right there. That is
  [0026](0026-one-channel-per-politeness.md)'s rule applied for the third time, and the third
  time it has not been the caller 0026 predicted either.
