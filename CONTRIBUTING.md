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
