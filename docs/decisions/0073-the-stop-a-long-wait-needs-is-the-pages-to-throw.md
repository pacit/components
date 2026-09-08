# 0073 — The stop a long wait needs is the page's to throw

**Status:** accepted
**Implements:** [`req-a11y-wcag`](../requirements/a11y.md#req-a11y-wcag),
[`req-a11y-motion`](../requirements/a11y.md#req-a11y-motion),
[`req-api-attributes`](../requirements/api.md#req-api-attributes)
**Evidence:** `libs/components/skeleton/src/skeleton.ts`,
`libs/components/skeleton/src/skeleton.scss`,
`libs/components/skeleton/src/skeleton.spec.ts` (four cases),
`apps/sandbox-e2e/src/skeleton.spec.ts` (two cases in three engines, one of them the
negative control), `docs/acr/claims.json` (SC 2.2.2), plan 4.45

## The question

SC 2.2.2 asks for a mechanism to pause, stop or hide motion that **starts on its own, runs
past five seconds and stands in parallel with other content** — unless the movement is
essential. Every other sweep in this library was answered by 4.37: one pass, four seconds,
and then stillness, which is under the bar the criterion sets. The skeleton's sheen is the one
that cannot be answered that way. It travels for as long as the wait does, and that is the
promise 0050 made: **a busy indicator that stopped would say the work had finished.**

So the question is not "how do we stop it" but "**who** stops it", and the criterion's
"essential" exception is where a library is tempted to answer for everybody.

## What was refused, and why it is the interesting half

**A cap after N passes.** The one road that lies. A placeholder that goes still while the work
goes on says the work is over; the user then waits for a page that looks finished. It would
satisfy the criterion's letter by breaking the component's one job.

**The essential exception, claimed and closed.** The argument is real — the sheen is
`aria-hidden`, the wait is announced by the `aria-busy` region the consumer writes around it,
and the movement is that same fact in the sighted channel. But it is an ARGUMENT, and this
repository does not raise a conformance row on one. A row that says Supports because we
reasoned well is the shape of claim the whole ACR exists to avoid.

## The decision

**`paused`, an input, `false` by default — the same word `[pctHero]` took one component
over.** The library ships the mechanism and decides nothing: only the page knows how long its
own wait has been, whether the placeholder stands beside text somebody is reading, and whether
a wait of thirty seconds means "slow" or "broken".

Three mechanisms, and the order between them is the whole of it:

1. **`prefers-reduced-motion` is the reader's** and outranks everything. It does not stop the
   sheen — it slows it through the motion axis, because a still placeholder is the same lie in
   a quieter voice.
2. **`paused` is the page's.**
3. **With neither spoken, the sheen travels for as long as the wait does**, which is what a
   picture of a wait is.

The stylesheet freezes it with `animation-play-state` and not `animation: none`: a stop that
reset the animation would put the shade back at its start edge, and a page asking for
stillness would get a twitch. Two attributes against the running rule's one class, so the
pause outranks the shorthand with no `!important` and with the shorthand left whole.

With the mechanism in the package, **SC 2.2.2 rises to Supports** and stops naming an open
finding.

## What this costs us

- **A fourth input on a component whose whole argument is that it says nothing.** It says
  nothing still: `paused` draws no control, writes no text and adds no state a reader hears.
- **A consumer who never thinks about it gets the old behaviour**, which is the right default
  and also the one that reaches the criterion. The card and the ACR both say so plainly rather
  than implying the library has solved it.
- **Nothing measures how long a consumer's wait is**, and nothing here can. A gate that fired
  on "a skeleton that stood for six seconds" would be measuring the consumer's server.
- **Two components now carry the same word for the same criterion**, and a third would be the
  moment to extract it. Today an input on two classes is cheaper than a mechanism they share.

## Alternatives considered

| alternative                                         | why rejected                                                                                                |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| A cap after N passes                                | a placeholder that stops while the work runs says the work finished — the one thing it must never say       |
| Claiming the "essential" exception                  | an argument, not a measurement; the row would rest on our own reasoning and the report exists to avoid that |
| A global "stop all motion" service                  | a document-level switch the library installs is the keystroke problem of 0072 in another costume            |
| Stopping the sheen when the region stops being busy | the region already stops being busy by removing the skeleton; there is nothing left to pause                |
| `animation: none` for the pause                     | resets the shade to its start edge, so a stop reads as a jump                                               |
