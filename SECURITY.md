# Security

## Reporting a vulnerability

Report it **privately**, through GitHub's own channel:
[Report a vulnerability](https://github.com/pacit/components/security/advisories/new) — the
form under the repository's Security tab. Not as an issue, not in a discussion, not in a pull
request: a public report is a disclosure, and the fix has to exist before the disclosure does.

What to include: the package version, the entry point, and steps that reproduce it. A
proof-of-concept application is ideal; a description of the input and the effect is enough.

What to expect: an acknowledgement within seven days, a fix or a decision within thirty, and
credit in the advisory unless you ask otherwise. There is no bounty programme.

## Scope

- the package `@pacit/components` as published on npm,
- the `ng add` and `ng update` schematics it ships,
- the documentation site at [components.pacit.pl](https://components.pacit.pl/).

The library has **no runtime dependencies** beyond Angular's own packages, and a gate refuses
any that would be added (`libs/components/check-package.mjs`, point 7). What the dependency
tree cannot bring in, a report need not cover.

## Supported versions

The [support policy](docs/support.md) states which versions receive fixes; before 1.0 that is
the latest minor, and a security fix ships as a patch of it.
