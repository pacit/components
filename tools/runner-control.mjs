const MODULE = 'tools/runner-control.mjs';

/**
 * What the control finds, as `{ rule, … }`. `unreadable`: the declaration or its case cannot be
 * read. `no-case`: a `case` the tree does not hold. `no-pins`: `pins` that are no list of values.
 * `no-own-pin`: a case that pins nothing itself, so no play of it can stand clean beside a
 * variant. `unclean`: the runner reported the case pinned to its own value — the variants then
 * differ from a play that is not clean, and what they report proves nothing. `unheard`: a value
 * the runner reported nothing of. `gate.say(name, value)` plays the case pinned to the value and
 * returns the lines the runner reported; it is asked only of a sound declaration, the case's own
 * value first and then every pin in turn.
 */
const verdict = async (gate) => {
  let control;
  try {
    control = gate.load();
  } catch (error) {
    return [{ rule: 'unreadable', error }];
  }
  if (!gate.cases.includes(control?.case))
    return [{ rule: 'no-case', control }];
  if (!Array.isArray(control.pins) || control.pins.length === 0)
    return [{ rule: 'no-pins' }];
  let mine;
  try {
    mine = gate.own(gate.read(control.case));
  } catch (error) {
    return [{ rule: 'unreadable', error, of: control.case }];
  }
  if (mine === undefined) return [{ rule: 'no-own-pin', control }];
  const clean = await gate.say(control.case, mine);
  if (clean.length) return [{ rule: 'unclean', control, lines: clean }];
  const found = [];
  for (const value of control.pins)
    if ((await gate.say(control.case, value)).length === 0)
      found.push({ rule: 'unheard', control, value });
  return found;
};

/**
 * The verdict held on prepared declarations and reports — a control of the control, as
 * `check-coverage` holds its own (`ownControl`). Without these rows a rule here that stopped
 * refusing would stay green for as long as every gate's runner works, which is all of the time
 * this control exists for. A row's case is `a`, pinned to `o` unless `fx` says otherwise, and
 * `said` maps a value to the lines a runner reports of it — none, unless the row says so.
 */
const OWN = [
  {
    why: 'a runner reporting both pins of two, and its case clean',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { x: ['x'], y: ['y'] },
    finds: [],
  },
  {
    why: 'a runner reporting the first pin of two and not the second',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { x: ['x'] },
    finds: ['unheard "y"'],
  },
  {
    why: 'a runner reporting the second pin of two and not the first',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { y: ['y'] },
    finds: ['unheard "x"'],
  },
  {
    why: 'a runner reporting the case pinned to its own value',
    control: { case: 'a', pins: ['x', 'y'] },
    said: { o: ['o'], x: ['x'] },
    finds: ['unclean'],
  },
  {
    why: 'a case that pins nothing itself',
    control: { case: 'a', pins: ['x'] },
    fx: {},
    said: { x: ['x'] },
    finds: ['no-own-pin'],
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
    finds: ['no-case'],
  },
  {
    why: 'a control with an empty list of pins',
    control: { case: 'a', pins: [] },
    finds: ['no-pins'],
  },
  {
    why: 'a control whose pins are no list',
    control: { case: 'a', pins: 'x' },
    said: { x: ['x'] },
    finds: ['no-pins'],
  },
  {
    why: 'a declaration that cannot be read',
    load: () => JSON.parse('{'),
    finds: ['unreadable'],
  },
  {
    why: 'a case that cannot be read',
    control: { case: 'a', pins: ['x'] },
    fx: null,
    said: { x: ['x'] },
    finds: ['unreadable'],
  },
];

const shown = (f) =>
  f.rule === 'unheard' ? `unheard ${JSON.stringify(f.value)}` : f.rule;

const ownControl = async () => {
  const problems = [];
  for (const row of OWN) {
    const fx = 'fx' in row ? row.fx : { pin: 'o' };
    const found = await verdict({
      load: row.load ?? (() => row.control),
      cases: ['a'],
      read: () => fx ?? JSON.parse('{'),
      own: (prepared) => prepared.pin,
      say: async (_, value) => row.said?.[value] ?? [],
    });
    const got = found.map(shown).join('; ');
    if (got !== row.finds.join('; '))
      problems.push(
        `${MODULE}: the control misjudges ${row.why} — it finds ${got || 'nothing'}, ` +
          `and ${row.finds.join('; ') || 'nothing'} was meant`,
      );
  }
  return problems;
};

/** The words of a finding, said of the control at `where`. */
const said = (where, f) => {
  const name = `\`${f.control?.case}\``;
  switch (f.rule) {
    case 'unreadable':
      return (
        `${where}: ${f.of ? `its case \`${f.of}\`` : 'the declaration'} cannot be read ` +
        `(${f.error.message.split('\n')[0]}) — a control that reads nothing proves nothing`
      );
    case 'no-case':
      return (
        `${where}: \`case\` names ${JSON.stringify(f.control?.case)}, which is no case of the ` +
        `tree — only a case the loop holds clean as written makes what the runner says of it, ` +
        `pinned otherwise, the pin's doing`
      );
    case 'no-pins':
      return (
        `${where}: \`pins\` is no list of values — a control that pins nothing plays the ` +
        `runner on nothing`
      );
    case 'no-own-pin':
      return (
        `${where}: ${name} pins nothing itself — the control replaces a case's pin, and a case ` +
        `without one gives it no clean play to stand a variant beside`
      );
    case 'unclean':
      return (
        `${where}: the runner reported ${name} pinned to its own value — a variant then ` +
        `differs from a play that is not clean, and what the runner reports of it proves ` +
        `nothing about the pin:\n    ${f.lines.join('\n    ')}`
      );
    default:
      return (
        `${where}: the runner reported nothing of ${name} pinned to ` +
        `${JSON.stringify(f.value)} — either it no longer holds a case to what the case ` +
        `pins, and a pinned refusal drifts in silence, or the refusal carries this value, ` +
        `and the control needs one it does not`
      );
  }
};

/**
 * The runner's own control. A gate's negative control runs each prepared case and holds the
 * refusal to what the case declares: the check it fires on, and — where the case pins one — a
 * phrase, a name or a word the refusal or the rendering has to carry (`message`, `says`,
 * `names`, `status`). No prepared case proves that second comparison is made: a case that pins
 * one pins what its refusal carries, so a runner that stopped comparing passes all of them, and
 * every pinned refusal is free to drift onto a neighbouring one in silence. Measured 2026-10-27
 * on a copy of each gate: switching the comparison off left all eleven of them green
 * (`runner-message-off`, PR #130's second review).
 *
 * So each of those gates keeps `_runner.json` beside its cases, `{ case, pins }`: a case of the
 * tree that pins a value itself, and values to pin it to in place of that one — a phrase of a
 * neighbouring refusal of the same check, the drift the comparison exists to catch, on either
 * side of the case's own where a pin is a list, and, where the runner refuses a pin it cannot
 * compare (`check-parts`, `check-files`, `check-tools`, `check-reach`), the shapes it refuses.
 * The gate hands over `load()`, which reads the declaration, `read(name)`, which returns a case
 * as its loop plays it, `own(fx)`, the value the case pins, `pin(fx, value)`, which writes a
 * value where its cases write theirs, and `run(name, fx)`, the very function its loop plays every
 * case through, returning the lines it reports. The case pinned to its own value has to come out
 * clean, and every pin has to be reported. A case's pin is read by the runner alone — the input
 * a check judges is built from the rest of the declaration — so a variant that differs from a
 * clean play in its pin alone is reported for the pin. Played apart from the loop, the control
 * counts as no case.
 *
 * Not held here: that a gate calls this at all, as nothing holds that its loop runs.
 */
export const runnerControl = async ({
  where,
  load,
  cases,
  read,
  own,
  run,
  pin,
}) => {
  const found = await verdict({
    load,
    cases,
    read,
    own,
    say: (name, value) => run(name, pin(read(name), value)),
  });
  return [...(await ownControl()), ...found.map((f) => said(where, f))];
};
