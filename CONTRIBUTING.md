# Contributing

## Licensing

Contributions are accepted **under the MIT License** — the same terms the repository
already carries in [`LICENSE`](LICENSE). Inbound equals outbound: by opening a pull
request you license your contribution under those terms and confirm you have the right
to do so.

**There is no CLA and there will be none.** This is a decision, not an omission — MIT
grants everything a CLA would buy here, so the only thing a CLA would add is friction on
every pull request. The reasoning, and what it costs us, is in
[decision 0015](docs/decisions/0015-license-and-model.md).

Send contributions as pull requests. A patch delivered any other way — email, an issue
comment, a pasted diff — is not covered by the mechanism above, so state explicitly that
you are contributing it under the MIT License.

Do not include code you did not write, or code carrying another copyright notice or
license. The package currently has **no runtime dependencies** and redistributes no
third-party code; keeping it that way is deliberate.

## Working in this repository

The rules — commands, gates, conventions — live in [`AGENTS.md`](AGENTS.md). Every change
runs through the same gates as CI; a pull request that turns one off, or adds one that
cannot fail, will be asked to change.

## Running the gates yourself

Node 24 through nvm; a shell that has not loaded it runs every command through the wrapper:

```bash
scripts/with-node npx nx affected -t lint test build typecheck check-package
```

The whole line CI runs — some thirty gates next to lint, tests, build and typecheck — is the
one `nx affected` command in [`.github/workflows/ci.yml`](.github/workflows/ci.yml); copy it
from there rather than from here, so the two cannot drift. The mutation run and the flake
count are nightly only (`.github/workflows/nightly.yml`): too slow for a push, and a pull
request is not asked to wait for them.

What people run by hand before a commit is a habit, not a list, and the habit omits two
gates that cost a production build: `check-bundle` (byte sizes through the real builder) and
`check-index` (derived directory indexes). Run both before a pull request that touches
`libs/components/*/src` or anything under `docs/`
([`lesson-188`](docs/lessons.md#lesson-188) is what it cost to learn that).

The documentation site is `apps/docs`, on port 4300:

```bash
scripts/with-node npx nx serve docs
```

Its content is generated from the tracked sources by `apps/docs/tools/build-content.mjs` —
the component cards, the snapshots, the library's own JSDoc — so a page is changed where its
source is, never in the site. [`docs/site.md`](docs/site.md) is the design.

## Where things go

- **A question** about using the library — [Discussions](https://github.com/pacit/components/discussions).
- **A defect** — a promise broken — the issue form, which asks for the promise.
- **A proposal** — the other issue form, which asks for the promise it would keep.
- **A vulnerability** — privately, as [`SECURITY.md`](SECURITY.md) describes.
