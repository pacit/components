const MODULE = 'tools/runner-control.mjs';

/**
 * What the control finds, as `{ rule, value }`: `no-case` for a `case` the tree does not hold —
 * the loop over the cases never held it clean, so what the runner says of it proves nothing
 * about a pin — `no-pins` for `pins` that are no list of values, and `unheard` for each value
 * the runner reported nothing of. `say(value)` plays the case pinned to the value and returns
 * the lines the runner reported; it is asked only of a sound declaration, every value in turn.
 */
const verdict = async (control, cases, say) => {
  if (!cases.includes(control?.case)) return [{ rule: 'no-case' }];
  if (!Array.isArray(control.pins) || control.pins.length === 0)
    return [{ rule: 'no-pins' }];
  const found = [];
  for (const value of control.pins)
    if ((await say(value)).length === 0) found.push({ rule: 'unheard', value });
  return found;
};

/**
 * The verdict held on prepared declarations and reports — a control of the control, as
 * `check-coverage` holds its own (`ownControl`). Without these rows a rule here that stopped
 * refusing would stay green for as long as every gate's runner works, which is all of the time
 * this control exists for. `said` maps a pin to the lines a runner reports of it.
 */
const OWN = [
  {
    why: 'a runner reporting both pins of two',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { x: ['x'], y: ['y'] },
    finds: [],
  },
  {
    why: 'a runner reporting the first pin of two and not the second',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { x: ['x'], y: [] },
    finds: ['unheard "y"'],
  },
  {
    why: 'a runner reporting the second pin of two and not the first',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { x: [], y: ['y'] },
    finds: ['unheard "x"'],
  },
  {
    why: 'a control naming a case the tree does not hold',
    control: { case: 'b', pins: ['x'] },
    said: { x: ['x'] },
    finds: ['no-case'],
  },
  {
    why: 'a control that is no object',
    control: null,
    said: {},
    finds: ['no-case'],
  },
  {
    why: 'a control with an empty list of pins',
    control: { case: 'a', pins: [] },
    said: {},
    finds: ['no-pins'],
  },
  {
    why: 'a control whose pins are no list',
    control: { case: 'a', pins: 'x' },
    said: { x: ['x'] },
    finds: ['no-pins'],
  },
];

const shown = (f) =>
  f.rule === 'unheard' ? `unheard ${JSON.stringify(f.value)}` : f.rule;

const ownControl = async () => {
  const problems = [];
  for (const { why, control, said, finds } of OWN) {
    const found = (await verdict(control, ['a'], (v) => said[v])).map(shown);
    if (found.join('; ') !== finds.join('; '))
      problems.push(
        `${MODULE}: the control misjudges ${why} — it finds ` +
          `${found.join('; ') || 'nothing'}, and ${finds.join('; ') || 'nothing'} was meant`,
      );
  }
  return problems;
};

/**
 * The runner's own control. A gate's negative control runs each prepared case and holds the
 * refusal to what the case declares: the check it fires on, and — where the case pins one — a
 * phrase or a name the refusal has to carry (`message`, `says`, `names`). No prepared case
 * proves that second comparison is made: every case pins what its refusal carries, so a runner
 * that stopped comparing passes all of them, and every pinned refusal is free to drift onto a
 * neighbouring one in silence. Measured 2026-10-27 on a copy of each gate: switching the
 * comparison off left all eleven of them green (`runner-message-off`, PR #130's second review).
 *
 * So each of those gates keeps `_runner.json` beside its cases, `{ case, pins }`: a case of the
 * tree, and values to pin it to in place of its own — a phrase of a neighbouring refusal of the
 * same check, the drift the comparison exists to catch, and, where the runner refuses a pin it
 * cannot compare (`check-parts`, `check-files`, `check-tools`, `check-reach`), the shapes it
 * refuses. The gate's `pin(fx, value)` writes a value where its cases write theirs, and its
 * `run(name, fx)` is the very function its loop plays every case through, returning the lines
 * it reports. Each value has to be reported. A case's pin is read by the runner alone — the
 * input a check judges is built from the rest of the declaration — and the loop has already
 * held the case clean as written, so what the runner reports of the variant is the pin's doing.
 * Played apart from the loop, the control counts as no case.
 *
 * Not held here: that a gate calls this at all, as nothing holds that its loop runs.
 */
export const runnerControl = async ({
  where,
  control,
  cases,
  read,
  run,
  pin,
}) => {
  const found = await verdict(control, cases, (value) =>
    run(control.case, pin(read(control.case), value)),
  );
  return [
    ...(await ownControl()),
    ...found.map(({ rule, value }) =>
      rule === 'no-case'
        ? `${where}: \`case\` names ${JSON.stringify(control?.case)}, which is no case of ` +
          `the tree — only a case the loop holds clean as written makes what the runner says ` +
          `of it, pinned otherwise, the pin's doing`
        : rule === 'no-pins'
          ? `${where}: \`pins\` is no list of values — a control that pins nothing plays ` +
            `the runner on nothing`
          : `${where}: the runner reported nothing of \`${control.case}\` pinned to ` +
            `${JSON.stringify(value)} — either it no longer holds a case to what the case ` +
            `pins, and a pinned refusal drifts in silence, or the refusal carries this value, ` +
            `and the control needs one it does not`,
    ),
  ];
};
