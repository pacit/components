# fixture — two tasks, each claiming the state of the other's requirement

<!--
  No case: the input the runner's own control plays (`_runner-plans.json`). Point 8 fires two
  rules on it, the first of them the one `plan-claims-work-with-no-gate` declares, so only the
  runner's rule that a case fires one rule alone can report it.
-->

## 5. Gaps with no deadline

- [x] **1 — `req-fixture-unbuilt`**: built, closed and ticked

  - the requirement's state in `_reference/requirements.md` is `gap`, so nothing was
    recorded where the gate would be

- [ ] **2 — `req-fixture-shipped`**: build the gate this requirement is missing

  - the requirement's state in `_reference/requirements.md` is `enforced`, and this line
    still offers the work as something left to do
