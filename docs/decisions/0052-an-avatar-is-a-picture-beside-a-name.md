# 0052 — An avatar is a picture beside a name, and never the name itself

**Status:** accepted
**Implements:** [`req-a11y-built-in`](../requirements/a11y.md#req-a11y-built-in),
[`req-api-platform`](../requirements/api.md#req-api-platform),
[`req-api-size`](../requirements/api.md#req-api-size),
[`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)
**Evidence:** `libs/components/avatar/`, `apps/sandbox-e2e/src/avatar.spec.ts`, the unit suite
in `libs/components/avatar/src/avatar.spec.ts`; the probes quoted below — grapheme
segmentation across five scripts and the `error` behaviour of an `<img>` with a missing,
dead or empty `src` — were measured in Chromium, Firefox and WebKit before anything was
written

## The question

An avatar looks like the simplest component on the list — a picture in a circle — and every
library that believed that shipped the same three defects: a screen reader announcing "Ada
Lovelace" twice (once for the image, once for the text beside it), initials that cut a
surrogate pair or an emoji family in half, and a broken-image glyph where the network
failed. The questions are what the picture MEANS, what an initial IS, and what stands where
the picture cannot.

## It is decoration, all the way down

**Where an avatar actually stands is beside the name it depicts** — a table row, a comment
header, an account button — and there the name is already text, a reader already says it,
and a second announcement is noise. So the host is `aria-hidden="true"` outright: the third
component in the library after `pct-icon` and `pct-skeleton`, and for the icon's reason —
it is a drawing beside the meaning, not the meaning.

The consequence is written plainly rather than hedged: **an avatar is never the only carrier
of a name.** A button that shows nothing but an avatar names itself (`aria-label` on the
button), which is where the platform puts a control's name anyway; the class JSDoc carries
that example. There is no `alt` input and no way to make the component announce — a
half-decoration with an opt-in voice would be two components wearing one selector, and the
audible one would be wrong wherever the visible name stands.

Inside, the picture is `<img alt="">` — the platform's own word for a decorative image —
and the initials sit under the hidden host like the skeleton's bars do.

## The fallback is a chain whose every link is measured

A picture that has not arrived, failed, or was never given still has to look like somebody:

1. **`src` given and alive** — the image, `object-fit: cover` in the token-rounded box;
2. **`src` dead** — the `error` event flips one signal and the initials stand up. Measured:
   a 404 fires `error` in all three engines, and **so does `src=""`** — an empty string is a
   request to the page's own URL, not an absence — which is why the template never binds an
   empty `src` rather than trusting the attribute to stay quiet;
3. **no `name` either** — the silhouette, through the icon seam like every drawing in the
   library. The first cut of this decision drew it as a bare `<svg>`, arguing an internal
   state of a hidden subtree is nobody's to address — and the icon gate refused, rightly:
   a glyph a consumer cannot swap is exactly the thing their brand's empty state would
   want to replace ([0011](0011-icons-are-a-component.md), `req-api-icons`). So it is
   `pct-icon name="user"` with the inline drawing as its default, and the registry
   overrides it the way it overrides every other name.

A new `src` re-arms the chain: the broken flag is derived from the input
(`linkedSignal`), so swapping the picture retries the image instead of remembering the
last failure forever.

## An initial is a grapheme, not a `charAt`

The initials are the first grapheme of the first word and the first grapheme of the last —
one grapheme alone for a one-word name. `Intl.Segmenter` is the platform's own segmenter,
and the probe is why it is non-negotiable: `charAt` would cut `👩‍👩‍👧 Team` into a broken
surrogate half, while the measured answer is the whole family — `👩‍👩‍👧T` in all three
engines — and Devanagari (`आर्या शर्मा` → `आश`), a flag (`🇳🇴 Norge` → `🇳🇴N`) and CJK
(`李小龙` → `李`) all come back whole the same way.

**The initials are not uppercased.** `toLocaleUpperCase()` without a locale answers with
the machine's, with one it needs a locale nobody here knows — the component would be
guessing between `i → I` and `i → İ` on every Turkish name. What the consumer wrote is what
is drawn; a consumer who wants capitals writes capitals.

## What is refused, and why

- **an `alt` input, or any announced variant** — refused above: the name belongs to the
  text or the control beside the picture, and a component that is sometimes decoration and
  sometimes a name would be wrong in one of its costumes on every page.
- **a status dot** — presence is a fact of its own with its own text, and a coloured dot as
  its only channel fails forced colours and screen readers at once. Where status exists it
  is the page's sentence, not this component's corner.
- **an avatar group / stack** — a different component with its own questions (overflow
  count, overlap order, one label for many). Refusing it here keeps this one a leaf.
- **a `shape` input** — the skeleton's move ([0050](0050-a-skeleton-is-a-picture-of-a-wait.md))
  in reverse: the circle is `--pct-avatar-radius: 999px`, and a square avatar is a consumer
  setting one token, not a third drawing this component has to know about.
- **an image-loading spinner** — a wait inside a decoration announces nothing and holds no
  layout (the box is token-sized either way); the initials already stand there, and they
  are a better placeholder for a face than motion is.

## Consequences

- `pct-avatar` is one host on the shared control axis (`--pct-avatar-size` from
  `{pct.control.height}`), `aria-hidden`, with three parts — `image`, `initials`,
  `silhouette` — of which exactly one is in the document at a time.
- No `PCT_TEXTS` key: a component that says nothing has nothing to translate, so every
  other entrypoint's bytes stand still — the skeleton's arithmetic at the third component.
- Forced colours keep the boundary through the border and the initials through
  `CanvasText`; the fill goes, and the pill's edge is the channel that survives
  ([`req-a11y-forced-colors`](../requirements/a11y.md#req-a11y-forced-colors)).
- The mutation surface is the chain and the segmentation, and both are observable: which
  part stands is a DOM fact, and the initials of the probe's five scripts are the unit
  suite's fixtures.
