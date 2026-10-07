<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

## Commits

Conventional commits, **in English** — the title and the body alike, like everything else
here ([`req-project-language`](docs/requirements/project.md#req-project-language)). The type
and the scope are read by the release, not only by people: the type decides whether the commit
reaches the CHANGELOG at all and `!` marks a breaking change (`release.conventionalCommits`
in `nx.json`), and the scope names the part that moved — `feat(tokens)!:`, `fix(select):`,
`docs(plan):`.

## This file and CLAUDE.md

This file is the **source of truth**. `CLAUDE.md` is three sentences and an `@AGENTS.md`
import that Claude Code expands on load. Two independent copies would be a drift waiting for
the first edit of either, so write changes here.

A symlink would be cleaner but **breaks `nx format:check`**: prettier rejects a symlink
handed to it as an explicit path (`Explicitly specified pattern is a symbolic link`), and
that is exactly how Nx passes it the changed files. `.prettierignore` does not save it —
the refusal happens before filtering.

## Node / nvm in non-interactive shells

This repo uses nvm to manage Node (v24). A non-interactive shell (e.g. spawned by an AI agent)
does not load `~/.nvm/nvm.sh`, so `node`/`npx` may not be on `PATH`.

Use the wrapper: `scripts/with-node <command>`. Example:

```bash
scripts/with-node npx nx serve sandbox
```

## Vendored agent skills

The skills of **this** repository are tracked, under `.opencode/skills/`. The Angular ones
installed from `angular/skills` are **not**: only `skills-lock.json` is, and it restores them
([0040](docs/decisions/0040-a-lockfile-is-material-the-tree-it-locks-is-not.md) — the same
split as `package-lock.json` and `node_modules`).

A fresh clone gets them back with:

```bash
scripts/with-node npx skills experimental_install
```

Do not commit the trees. `check-reach` fires on a tracked file nothing reaches, but a mention
is an edge and prose about a defect is a mention — the gate is the second line here, not the
first ([`lesson-113`](docs/lessons.md#lesson-113)).

## Heavy runs stay off the desk

Measured over the seventeen days to 2026-10-07: the two Playwright suites and the mutation
run took 52 hours of the desk this repository is developed on, 15 of them in runs stopped or
red, while CI answers a push in fifteen minutes on nine machines and the nightly measures the
mutants in seventy on one
([0088](docs/decisions/0088-a-row-is-measured-by-its-own-run-and-the-whole-at-night.md)).
So, before a push:

- `scripts/before-push` — the gates CI runs, without `e2e`: minutes.
- The spec of the component the change touches, on one engine — CI is the verdict on the
  whole suite, eight machines with retries and no neighbour's load:

  ```bash
  scripts/with-node npx playwright test --config apps/sandbox-e2e/playwright.config.mts slider --project=chromium
  ```

- The mutants of the files the change touches, from the workspace root, then the merge: a
  narrow run rewrites its own rows and TOTAL, and the nightly holds every row to the
  tolerance. A full run is for a record that is not there yet.

  ```bash
  scripts/with-node npx stryker run libs/components/stryker.config.json --mutate libs/components/slider/src/slider.ts
  ```

  ```bash
  scripts/with-node node tools/check-mutation.mjs --write
  ```

- Anything heavier than a gate runs inside a memory ceiling, so that the kernel kills the run
  and not the editor (2026-10-06, 10:56: the whole editor's scope, 2.6 GB, killed by
  `systemd-oomd`):

  ```bash
  systemd-run --user --scope -p MemoryMax=6G -- scripts/with-node npx stryker run libs/components/stryker.config.json --mutate libs/components/slider/src/slider.ts
  ```

## What a mutant survives on

Read off the full run of 2026-10-06 (6745 mutants, 914 alive — surviving or uncovered): the
shapes a spec misses, by count, and the case that kills each.

| Mutant                | Alive       | The code                            | The case                                                                     |
| --------------------- | ----------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| ConditionalExpression | 282 of 1854 | `if (gutter > 0) …`                 | both branches, the one in which nothing happens included                     |
| StringLiteral         | 214 of 1161 | `return ''`, `?? ''`, a style value | the exact text or style, not "truthy"                                        |
| BooleanLiteral        | 80 of 454   | `input(false)`                      | one case reads the default without setting it                                |
| OptionalChaining      | 60 of 151   | `event?.preventDefault()`           | a receiver that cannot be null loses the `?.`; one that can gets a null case |
| EqualityOperator      | 49 of 666   | `>=` for `>`                        | the boundary value and its neighbours on both sides                          |
| LogicalOperator       | 43 of 398   | `??` for `&&`                       | the null operand and the empty one                                           |
| ArrayDeclaration      | 39 of 156   | `['alert', 'log'].includes(…)`      | one member of the list                                                       |
| Regex                 | 30 of 122   | `^` and `$`                         | the string only the anchor refuses                                           |

Most of the survivors sit in `select.base.ts`, `tooltip.ts`, `date.ts`, `menu.ts`,
`popover.ts` and `toaster.ts`, and nearly all of them are an effect on the DOM — a style, the
focus, a `preventDefault` — that the spec never reads back.
