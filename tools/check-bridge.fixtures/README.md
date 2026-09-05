# Negative control of the bridge gate

Deliberately defective inputs. `tools/check-bridge.mjs` runs all six of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where a file is read by a tool and not by a person. A designer
opens the plugin, not the repository, and every way the export can lie is quiet: a set left
out reads as "no tokens there", a shadow written as the CSS string the sources keep reads as
a shadow the plugin shows blank, a reference into a set the theme does not enable reads as a
token with no value in Figma and a perfectly good one in CSS — and a value moved in the tool
and pasted over the export reads as a change nobody has to argue with.

## How a case is built

A case is not a seventeenth copy of the correct export with one thing broken. The gate builds
it from two layers:

1. the **live input** — the DTCG sources as they stand at the commit under test, and the
   export the bridge writes from them, in memory ([`_reference.json`](_reference.json) says
   so and records nothing, because a stored copy would measure the sources as they were the
   day somebody stored it),
2. the operations from the case file, applied to a copy of that export (`drop` — a file
   gone; `sets` — a token of a set patched by its dotted path, dropped with `null`, or added
   under a path the sources do not have; `themes` — a theme's sets or its name; `metadata` —
   names dropped from the set order).

That way the case file holds **nothing but the defect** — visible without comparing files —
and does not drift from the reference when the sources move.

**The live input must pass.** It is checked first, on the real run; were it defective, every
case would fire because of it rather than because of its own defect, and every "rejected"
would be false.

## The cases

| file                                                                           | what it breaks                                                                                       | point | check        |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ----- | ------------ |
| [`a-set-the-export-lost.json`](a-set-the-export-lost.json)                     | the button set is gone from the export                                                               | 1     | `sets`       |
| [`a-set-nobody-ordered.json`](a-set-nobody-ordered.json)                       | `$metadata.json` no longer orders the button set                                                     | 1     | `sets`       |
| [`no-themes.json`](no-themes.json)                                             | `$themes.json` is gone — light and dark become two files with the same names                         | 1     | `sets`       |
| [`a-type-the-plugin-does-not-read.json`](a-type-the-plugin-does-not-read.json) | the button background comes out as `spacing`, a legacy name the DTCG mode does not read              | 2     | `dialect`    |
| [`a-shadow-as-a-string.json`](a-shadow-as-a-string.json)                       | the panel shadow comes out as the CSS string the sources write                                       | 2     | `dialect`    |
| [`a-dimension-without-a-unit.json`](a-dimension-without-a-unit.json)           | a dimension of `8` — a length the plugin cannot place                                                | 2     | `dialect`    |
| [`a-bezier-of-three.json`](a-bezier-of-three.json)                             | the easing comes out as three numbers                                                                | 2     | `dialect`    |
| [`a-reference-to-nothing.json`](a-reference-to-nothing.json)                   | `pct.primary` refers to `{pct.blue.999}`, a step the ramp does not have                              | 3     | `references` |
| [`a-reference-outside-the-theme.json`](a-reference-outside-the-theme.json)     | the dark theme stops enabling the primitives — CSS still resolves every semantic token, Figma cannot | 3     | `references` |
| [`a-set-no-theme-enables.json`](a-set-no-theme-enables.json)                   | no theme enables `motion.reduced` any more                                                           | 4     | `themes`     |
| [`two-themes-of-one-name.json`](two-themes-of-one-name.json)                   | the dark theme is renamed `light` — two themes of one name in one group                              | 4     | `themes`     |
| [`a-value-changed-in-figma.json`](a-value-changed-in-figma.json)               | `pct.primary` moved to `{pct.blue.500}` in the export on disk — a mirror that is a draft             | 5     | `round-trip` |
| [`a-token-added-in-figma.json`](a-token-added-in-figma.json)                   | a `pct.primary-soft` the sources do not have comes back                                              | 6     | `refusal`    |
| [`a-token-dropped-in-figma.json`](a-token-dropped-in-figma.json)               | the button background is gone from what comes back                                                   | 6     | `refusal`    |
| [`a-token-retyped-in-figma.json`](a-token-retyped-in-figma.json)               | `pct.primary` comes back as a dimension                                                              | 6     | `refusal`    |
| [`a-modifier-from-figma.json`](a-modifier-from-figma.json)                     | `pct.primary` comes back with a `$extensions` modifier                                               | 6     | `refusal`    |

Point 2 has four cases because the dialect can be wrong in four shapes that all parse: a
type outside the plugin's list, a composite written as a string, a length without its unit,
a bezier one number short. Point 6 has four because a designer's hands can do four things
the bridge does not carry — add, drop, retype, modify — and each is refused with its own
sentence. Two of the cases had to be aimed twice: dropping `pct.primary` fired point 3
before the import could refuse it (every component set refers to it), and disabling the light
semantics in the dark theme fired nothing, because the dark set overrides every one of them —
so the drop is a component token nothing refers to, and the theme loses its primitives.
