# 0075 — The push and the premiere are two moments, and only the second has an audience

**Status:** accepted
**Implements:** [`req-release-metadata`](../requirements/release.md#req-release-metadata),
[`req-project-package`](../requirements/project.md#req-project-package)
**Evidence:** the push of 2026-09-01, read back rather than assumed — `pacit/components`
**private** off the API, `main` the default branch, the remote head equal to the local one,
three workflows active — and the two runs that followed it, which are what it was for

## Context

[0016](0016-mit-irreversibility.md) settles that a release under MIT cannot be taken back, so
the order components go out in is a decision. It says nothing about the repository itself, and
the repository had been carrying a rule of its own: **no remote until the documentation site
exists**, because a first visitor landing on a project with nothing to read is a first
impression spent.

That rule bound one fear to two different events. It cost the project every day it held:

- no copy of the work anywhere but one disk,
- no run of `ci.yml` in any environment other than the one that wrote it,
- no provenance, because npm issues it only against a repository that exists,
- no rehearsal of the release path.

The fear is real and it is about the **first look**. An unannounced repository has no first
look: nobody arrives at an address nobody has been given. So the fear does not reach the push
— it reaches publication, which is a different act on a different day.

## Decision

**The push and the premiere are separated. The push goes to a private remote and waits for
nothing. The premiere — public plus npm — waits for the documentation site and for an explicit
sentence from the maintainer.**

1. **The private stage is invisible by construction**, which honours the fear rather than
   arguing with it. What the old rule protected — no half-public limbo, no second-class launch
   — survives, because the flip is binary and everything a stranger can read is finished before
   it.
2. **The premiere's trigger is a sentence, not a state.** The site going green does not start
   it, no run turning green starts it, and standing next in a task list is not a start either.
   A session that reaches it passes over it and takes the next item.
3. **An accidental `git push` stops being a hazard**, which is what the empty remote used to
   protect against. On a private stage it is harmless, so that argument dissolves instead of
   being overruled.
4. **A private repository meters Actions minutes**, so the two heaviest gates — the mutation
   pair and the browser suite — move off the push line into a nightly run. There are no
   external contributors on a private stage whose expectations a weaker push gate could
   betray, so the cheapest arrangement is available here and nowhere later.

## Consequences

- **The copy off this machine exists**, and with it the first real measurement of CI. The two
  runs after the push are the whole argument for taking it: one died in four minutes on a gate
  that reads the system word lists, which a runner does not ship — the gate failing loudly in
  the first environment that ever lacked its input; the second took 48 minutes and went red
  four ways at once, of which two were the environment and not the code.
- **`repository` becomes true before it becomes public.** Provenance still refuses a private
  repository, so the guard in `check-package --release` stays exactly where it stood.
- **The push is no longer the announcement.** The second `README.md` of the premiere, the
  documentation site and the step names in Actions all become the product at the flip, which is
  the moment they were always about.
- **A pushed branch is not a pushed repository.** What this decision buys is a _continuous_
  property, and a repository whose remote head is weeks behind has none of it: no copy, and a
  CI line that describes what would happen rather than what did
  ([`lesson-191`](../lessons.md#lesson-191)).

## What this costs us

- **A private stage is a stage nobody reviews.** Every argument for publishing early — outside
  eyes, an issue tracker that catches what the author cannot see — is deferred with the flip,
  and the deferral is open-ended because its trigger is a sentence.
- **Two environments instead of one**, and they disagree: font metrics, worker counts and the
  system dictionaries all differ between this machine and a runner. Some of that is a finding;
  some of it is tax.
- **The nightly is a report nobody is obliged to read.** Moving the heavy gates off the push
  line buys minutes and loses the one property a push gate has — that somebody is standing
  there when it goes red.

## Alternatives considered

- **Keep the single moment.** The status quo, and its price is the four lines in "Context" —
  paid daily, against a fear that only the second half of the moment can actually trigger.
- **Push to a public repository and rely on obscurity.** Rejected: obscurity is not a property
  anybody controls, and under [0016](0016-mit-irreversibility.md) a public repository is a
  release whether or not anything reaches npm.
- **A `git bundle` to a second disk instead of a remote.** It buys the copy and nothing else —
  no CI, no provenance, no rehearsal — and it is a cadence somebody has to keep by hand.
