# 0078 — The site has an address, and it deploys behind a green CI

**Status:** accepted
**Implements:** [`req-project-apps`](../requirements/project.md#req-project-apps)
**Evidence:** three readings taken on 2026-09-16 before a line was written — `curl -sI` on a
GitHub Pages site answering `301` for a directory asked for without its slash, and
`cache-control: max-age=600` on every response; OVH's own community threads on redirections
that cannot carry a certificate; the Angular SSR guide naming `"**"` as the parameter of a
catch-all's `getPrerenderParams`. The files: `.github/workflows/pages.yml`,
`apps/docs/public/CNAME`, `apps/docs/src/app/seo.ts`

## Context

[0060](0060-the-site-is-static-by-construction.md) made `apps/docs` finished HTML per route
and deferred the host to the day of the premiere: a private repository had nowhere public to
deploy to. The flip to public came on 2026-09-15 and with it the questions that the deferral
had parked, all of them one question — **where does the site live** — and the things that
hang off the answer: what `<link rel="canonical">` says, what the sitemap lists, what the
public `.d.ts` cite for a `req-*`, and how a visitor who mistypes a path is answered.

Four constraints stood at the decision:

- **no standing secret in the repository's workflows.** The release path is moving from a
  stored token to OIDC ([0079](0079-the-first-release-is-a-measurement-and-the-history-stays.md)),
  and a deploy path that needed an FTP password would reintroduce what that removes,
- **nothing paid.** Actions is unbilled on a public repository; a host with a subscription is
  a dependency the site's existence should not carry,
- **the maintainer owns `pacit.pl`**, with its DNS at OVH and a small shared hosting there
  that already serves an unrelated application,
- **one repository is one Pages domain.** Whatever the site's address is, the apex has to be
  answered by something else.

## Decision

**The site lives at `https://components.pacit.pl`, served by GitHub Pages from this
repository, and deploys only from a commit on `main` whose CI run concluded green.**

1. **The origin is stated once**, in `apps/docs/public/CNAME`. The content pass reads that
   file into a generated constant, and canonical links, `og:url`, `og:image`, `sitemap.xml`
   and `robots.txt` all derive from it. A wrong address fails the deploy, not a meta tag.
2. **The address the host serves is the address the page claims.** Pages answers a directory
   without its slash with a `301` to the slash, so every canonical URL, sitemap entry and
   `og:url` carries the trailing slash — the root excepted — because a canonical that
   points at a redirect is a canonical that points away.
3. **The trigger is `workflow_run`**: `pages.yml` starts when `CI` completes on `main`, builds
   nothing unless that run's conclusion is `success`, and checks out that run's `head_sha`
   rather than the head of the branch. A deploy in progress is never cancelled — one site,
   one queue — and the first run is a manual dispatch, because `workflow_run` cannot fire for
   a workflow file that is not on the default branch yet.
   _Read 2026-09-25, the release of `0.2.0`: the release commit is pushed by the bot with
   `GITHUB_TOKEN`, and a push made with that token starts no workflow — so `CI` never ran on
   it, `workflow_run` never fired, and the site stayed at the commit before the release,
   `unreleased` still on the button's `tone`. The pull request that wrote the release into
   0079 merged that evening, seven and a quarter hours after the tag, and its push run went
   red too — at `format:check`, on the CHANGELOG the release had written — so the site was
   still a release behind when the release path was repaired
   ([`lesson-243`](../lessons.md#lesson-243)). From the next release
   `release.yml` dispatches `CI` on `main` after its push — a dispatch is one of the two
   events the token may raise — and the site follows that run the way it follows every
   other._
4. **The 404 is a page of the site.** A `not-found` page is prerendered under `/404` through
   the catch-all's `getPrerenderParams` — `{ '**': '404' }`, the parameter name Angular
   documents for a catch-all — and the workflow copies it to the root `404.html` that Pages
   serves with a real `404` status. The copy lives in the workflow and not in an Nx target,
   because a root `404.html` is a fact about the host's convention, not about the build.
5. **The apex is answered from the maintainer's OVH hosting**: `pacit.pl` attached as a
   multisite entry with a Let's Encrypt certificate, and one `.htaccess` answering `301` to
   `https://components.pacit.pl/` with the path kept. OVH's own redirection service speaks
   HTTP only, so it could not do this. The site's existence does not depend on the hosting:
   `components.pacit.pl` needs the domain and this repository, nothing else.

## Consequences

- **The site can be live before npm**, which is the order the premiere needs: the public
  `.d.ts` can cite a `req-*` by an address that answers.
- **0060's open cost closes** — "the 404 story" has an answer, and it is a prerendered page
  the axe sweep and the three engines read like any other.
- **`robots.txt` moves from a tracked file to the content pass**, because its `Sitemap:` line
  has to be absolute and the origin has one home. The `public/` copy goes; two asset roots
  holding the same name would resolve by build order.
- **`og:title` comes from the route's own title**, read off the activated route's snapshot,
  which is already there at construction — `Title.getTitle()` is not, it still holds the
  previous page.
- **Deployments are visible where the commits are**: every push that goes green produces a
  deployment on the commit, in the repository's own Deployments view.

## What this costs us

- **A `301` per internal link, for a crawler.** `routerLink` renders `/start` and the host
  redirects it to `/start/`; the canonical on the target resolves it. Rewriting every link
  with a slash would remove the hop and touch every template; not worth it today.
- **No headers of our own.** Pages sends `max-age=600` to everything and accepts no `CSP`,
  no `HSTS`, no `immutable` for the hashed chunks. A returning visitor revalidates after ten
  minutes — conditional requests, answered `304` from the CDN, not downloads.
- **The root `404.html` exists only in the deployed tree.** `nx serve-static` serves the SPA
  fallback and never exercises it; the first deploy and a `curl` are the proof.
- **The site follows `main` by one CI run**, about forty-five minutes on the current line.
- **The apex is a subscription.** When the hosting lapses the redirect dies with it and
  nothing else does; a repository named `pacit.github.io` holding one redirecting page is the
  replacement that costs nothing.
- **`github.io` appears once**, as the target of a DNS record nobody reads in a browser.

## Alternatives considered

- **Deploy on every push to `main`, without waiting for CI.** Rejected: a red commit would be
  live for the length of a run — the same defect the release path was faulted for, on the
  surface a stranger reads first.
- **Cloudflare, as Pages' front or as DNS.** Rejected: an external account and a secret in
  CI, and moving the domain's name servers touches every record the domain has, mail
  included. It would have bought headers and an HTTPS apex redirect.
- **A project page, `pacit.github.io/components/`.** Rejected: `--base-href` at build time,
  and every citation in a published `.d.ts` carrying that address for good.
- **The whole site on the OVH hosting over FTPS.** Rejected: a password as a standing secret
  in CI, an upload file by file rather than an atomic swap, no CDN, and a subscription as the
  site's dependency. It would have bought custom headers and slashless URLs.
- **A `.nojekyll` file.** Not added: Jekyll runs on branch deploys, and an Actions deploy
  publishes the artifact as it is. The day deploys come from a branch, the file comes back.
- **A hand-written sitemap.** Rejected under
  [0021](0021-an-index-is-derived-or-measured.md): 36 of the 41 routes are cards, and a list of
  them kept by hand is the index the gate exists to catch.
- **A post-build step reading `prerendered-routes.json`.** The most truthful source, and
  rejected: it writes into `dist/apps/docs/browser` after `build`, a second owner of an
  output directory — the shape of defect the cache note in `apps/docs/project.json` records.
