# fixture — a task carrying a mark the notation does not declare

## 5. Gaps with no deadline

- [ ] **1 — `req-fixture-unbuilt`**: a gate nobody has built yet

  - this line agrees with its requirement, so nothing but the count can fire here

- [?] **2 — `req-fixture-unbuilt`**: the same task, under a mark somebody invented

  - `[?]` is none of `[ ]`, `[x]`, `[~]`, `[-]`, so the parse walks past this line while
    the box count still sees a box — which is the whole defect
  - a capital `[x]` would be the same defect and cannot be written here: prettier reads a
    list whose other items are tasks as a task list and normalises the mark away
