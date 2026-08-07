# The axis — what we win on

This file holds **one** requirement. It stands apart because the order of all the others
follows from it, and a thesis mixed into a list of seventy points cannot settle arguments
about priority.

---

## <a id="req-axis"></a>`req-axis` — Nothing breaks silently

**Promise.** Any state in which wrong behaviour produces no signal is a defect **in
itself** — whether or not anyone has hit it yet. Every promise in this documentation has
a gate that can fire on it, and every gate has a negative control proving it can **fail**.

**Gate:** [`req-quality-registry`](requirements/quality.md#req-quality-registry) — the
promise → gate → control registry, read by `tools/check-docs.mjs`
**Control:** [`req-quality-negative-control`](requirements/quality.md#req-quality-negative-control) —
the rule that a gate without proof of firing is unfinished

### Why this is not a slogan

The [lesson](lessons.md) log looks like a set of independent observations; it is nine
occurrences of **one**:

| lesson                              | key sentence                                                             |
| ----------------------------------- | ------------------------------------------------------------------------ |
| [`lesson-36`](lessons.md#lesson-36) | „the failure was **silent in both directions**"                          |
| [`lesson-43`](lessons.md#lesson-43) | „is not an error, it is an **empty string**"                             |
| [`lesson-38`](lessons.md#lesson-38) | „**silently does nothing** and the test passes"                          |
| [`lesson-39`](lessons.md#lesson-39) | „can be **born dead** in two independent ways"                           |
| [`lesson-17`](lessons.md#lesson-17) | „was broken and **nobody saw it**"                                       |
| [`lesson-31`](lessons.md#lesson-31) | „was unsafe under SSR and **nobody saw it**"                             |
| [`lesson-42`](lessons.md#lesson-42) | „was never typechecked and **nobody noticed**"                           |
| [`lesson-40`](lessons.md#lesson-40) | „neither the contrast gate nor axe **can see it**"                       |
| [`lesson-26`](lessons.md#lesson-26) | „the defect **survived** because every test started with an empty model" |

The common denominator: **the default behaviour of the layer is „nothing happened"**.

| layer       | what the platform does instead of failing              | where it hit us                                      |
| ----------- | ------------------------------------------------------ | ---------------------------------------------------- |
| CSS         | missing `var()` → initial value                        | [`lesson-36`](lessons.md#lesson-36), `check-package` |
| DOM read    | non-existent token → `''`                              | [`lesson-43`](lessons.md#lesson-43)                  |
| test infra  | no reference screenshot → save the current one as good | [`lesson-39`](lessons.md#lesson-39)                  |
| test infra  | emulation does not arrive → test runs on defaults      | [`lesson-38`](lessons.md#lesson-38)                  |
| build graph | missing edge → build succeeds, output is wrong         | [`lesson-36`](lessons.md#lesson-36)                  |
| SSR         | id mismatch → silent re-render, ARIA into the void     | [`lesson-31`](lessons.md#lesson-31)                  |
| a11y        | state by colour alone → gone in `forced-colors`        | [`lesson-40`](lessons.md#lesson-40)                  |
| types       | `T` too wide → contradictory bindings compile          | [`lesson-37`](lessons.md#lesson-37)                  |

Which is why **a missing gate never shows up as missing — it shows up as green**.

### Why named after the silent defect and not after „quality"

Three reasons:

1. It is derived from our own evidence, not from a marketing ambition.
2. It explains **why** every gate needs a negative control — a gate without one is another
   silent defect, one floor up.
3. It is a sentence a person keeps in their head **while writing code**. „Verifiability of
   promises" is not.

### Consequence for the order of work

A requirement without a gate is **unfinished**, not „implemented, just unverified". The
point is not that every gate exists from day one — the point is that its absence be
**countable rather than invisible**.

---

## What the axis is not

It is not a thesis about a11y, or tokens, or tests. It is about **a class of failure that
runs through every layer** — the one where the platform answers an error with silence. The
contrast gate, `check-package`, the hydration gate and the negative control of the axe audit
are four occurrences of the same pattern in four different layers, not four independent
ideas.

---

## Success criteria

The axis works when three sentences are true — each machine-checkable, not arguable:

1. **The registry has no entry in a `declared` state.** Every promise has a gate, or an
   explicitly written reason for its absence together with whatever will force it closed.
2. **Every gate has a negative control.** For each one there is a test or a recorded run
   proving that after a deliberate regression the gate **fires**.
3. **The documentation cannot lie.** A requirement's state is derived from the content of
   the registry, not typed in by hand — and adding a requirement without a gate is a CI
   failure, not an oversight.

Point 3 is the one whose absence made this documentation need a „how to read it" chapter
(see [`req-quality-registry`](requirements/quality.md#req-quality-registry)).

---

## Explicit non-goals

Things we deliberately do **not** do. Written down so they do not come back as a „missing
requirement" — a non-goal is a promise just like a goal, and is gated just the same.

| non-goal                     | requirement                                                          | why                                                                                                                                                                               |
| ---------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Our own icon set             | [`req-api-icons-custom`](requirements/api.md#req-api-icons-custom)   | an icon set is a separate product with its own life cycle; we ship the swap mechanism                                                                                             |
| Winning on component count   | —                                                                    | PrimeNG has ~90 and a decade of head start; that axis cannot be caught up and it is not worth trying                                                                              |
| Full bidi                    | [`req-token-logical`](requirements/tokens.md#req-token-logical)      | the layout mirrors; mixed directions inside one run of text and isolation on truncation — not in v1                                                                               |
| A theme engine in JS         | [`req-token-css`](requirements/tokens.md#req-token-css)              | JS at runtime for theming buys FOUC and hydration mismatches; the CSS cascade does the same for free                                                                              |
| `ControlValueAccessor`       | [`req-api-signal-forms`](requirements/api.md#req-api-signal-forms)   | verified by experiment to be unnecessary ([`lesson-9`](lessons.md#lesson-9))                                                                                                      |
| `@angular/animations`        | [`req-api-animations`](requirements/api.md#req-api-animations)       | a runtime dependency, against [`req-project-dependencies`](requirements/project.md#req-project-dependencies)                                                                      |
| `zone.js`                    | [`req-project-angular`](requirements/project.md#req-project-angular) | removed entirely, not merely switched off ([`lesson-8`](lessons.md#lesson-8))                                                                                                     |
| A headless core / skin split | —                                                                    | contrast, forced colours and touch target live in the template and the stylesheet — handing those over hands over half the evidence ([0013](decisions/0013-no-headless-split.md)) |

---

## How the rest grows out of the axis

```
LEVEL 0   req-axis                       ← this file
             │
             ├─ LEVEL 1  requirements/   promises: what has to be true
             │              │
             │              ├─ LEVEL 2  decisions/     why this way
             │              │
             │              └─ LEVEL 3  components/  whether this component keeps them
             │
             ├─ lessons.md              the evidence levels 0–2 came from
             └─ registry.md             GENERATED: does every promise have a gate
```

Reading order is the reverse of writing order: **requirements come out of lessons**, not
the other way round. The lesson log is the evidence base, not an appendix — it is the only
place that records **what actually happened**, before anyone turned it into a rule.
