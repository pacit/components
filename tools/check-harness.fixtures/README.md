# Negative control of the harness gate

Deliberately defective inputs. `tools/check-harness.mjs` runs all six of its points on each of
them and **requires every one to be rejected — and rejected by the point it declares**. An
input that passes is a fault; an input that fires for a reason other than the one written in
its file is a fault just the same, because it proves something other than what it declares.

The reason it exists is the same as for every other gate here
([`req-quality-negative-control`](../../docs/requirements/quality.md#req-quality-negative-control)):
**a new gate is not ready when it passes — it is ready when it has been shown to fail.**

For this gate the rule bites where a declaration is read as a promise. A harness is four lines
— a host selector and a list of names — and nothing in those lines proves itself: a selector
that matches no element, a part the component stopped drawing and a type that offers a name
the list does not hold are all green in this repository's own suite. They are red in a
consumer's, after the upgrade, which is the one place a gate cannot reach.

## How a case is built

A case is not an eighteenth copy of the correct input with one thing broken. The gate builds
it from two layers:

1. the **live input** — the repository itself as it stands at the commit under test: the
   built package (its testing module, the component definitions after linking, the
   declaration file) and the cards in `docs/components/`
   ([`_reference.json`](_reference.json) says so and records nothing, because a stored copy
   would measure the repository as it was the day somebody stored it),
2. the operations from the case file, applied to a copy of it (`entrypoint: null` — the
   testing module gone; `harnesses` and `classes` — an entry patched by name, dropped with
   `null`, or added under a name the package does not know; `declarations: null` — the
   declaration file gone; `declarations.replace` — the file rewritten by a pattern that has
   to match, because a needle that finds nothing is a case that broke nothing; `cards` — a
   card patched by file name, its row taken away with `harnesses: null`, or dropped).

## The cases

| file                                                                                   | what it breaks                                                   | point | check   |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----- | ------- |
| [`no-testing-entrypoint.json`](no-testing-entrypoint.json)                             | the packed manifest exports no `./testing`                       | 1     | `set`   |
| [`a-harness-off-the-base.json`](a-harness-off-the-base.json)                           | `PctButtonHarness` does not extend `PctHarness`                  | 1     | `set`   |
| [`a-part-named-twice.json`](a-part-named-twice.json)                                   | `PctButtonHarness` lists `label` twice                           | 1     | `set`   |
| [`a-selector-nobody-answers-to.json`](a-selector-nobody-answers-to.json)               | `PctButtonHarness` stands on `pct-phantom`                       | 2     | `host`  |
| [`a-selector-wider-than-the-class.json`](a-selector-wider-than-the-class.json)         | `PctButtonHarness` also answers to `a[pctButton]`                | 2     | `host`  |
| [`two-harnesses-for-one-class.json`](two-harnesses-for-one-class.json)                 | a second harness answers to `button[pctButton]`                  | 2     | `host`  |
| [`a-class-the-package-lost.json`](a-class-the-package-lost.json)                       | `PctButton` is gone from the package and its harness stays       | 2     | `host`  |
| [`a-class-with-no-harness.json`](a-class-with-no-harness.json)                         | `PctChip` draws two parts and has no harness                     | 3     | `every` |
| [`a-part-the-component-does-not-draw.json`](a-part-the-component-does-not-draw.json)   | `PctButtonHarness` offers an `icon` the button never draws       | 4     | `parts` |
| [`a-part-the-harness-forgot.json`](a-part-the-harness-forgot.json)                     | `PctButtonHarness` forgot the `spinner`                          | 4     | `parts` |
| [`no-declarations.json`](no-declarations.json)                                         | the declaration file is not in the package                       | 5     | `types` |
| [`a-type-narrower-than-the-list.json`](a-type-narrower-than-the-list.json)             | the declaration offers `'label'` alone                           | 5     | `types` |
| [`a-type-wider-than-the-list.json`](a-type-wider-than-the-list.json)                   | the declaration offers an `'icon'` the list does not hold        | 5     | `types` |
| [`a-card-with-no-harness-row.json`](a-card-with-no-harness-row.json)                   | the button card has no **Harness** row                           | 6     | `cards` |
| [`a-card-naming-nobody.json`](a-card-naming-nobody.json)                               | the button card names a harness the package does not export      | 6     | `cards` |
| [`a-card-borrowing-another-entrypoint.json`](a-card-borrowing-another-entrypoint.json) | the button card names `PctSelectHarness`                         | 6     | `cards` |
| [`a-harness-on-no-card.json`](a-harness-on-no-card.json)                               | the button card is gone and `PctButtonHarness` stands on no page | 6     | `cards` |
