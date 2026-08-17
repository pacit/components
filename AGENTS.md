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
