// A prepared input to `check-tools`, carrying the defect the gate was built for and spelled
// the way it was actually spelled: `at-pass.mjs` held a dwell of `CEILING_TAB` and declared
// it nowhere, so the pass threw on its first view of every run for a day and a half.
// Exactly one name here resolves to nothing, and the gate holds the reader to that count.
export const dwell = (floor) => [floor, CEILING_TAB];
