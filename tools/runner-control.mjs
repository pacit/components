const MODULE = 'tools/runner-control.mjs';

/** What a variant replaces, in the words of a finding. */
const shape = (variant) =>
  [
    ...(variant?.case === undefined ? [] : [`played over \`${variant.case}\``]),
    ...(variant?.without ?? []).map((field) => `without \`${field}\``),
    ...Object.entries(variant?.set ?? {}).map(
      ([field, value]) => `with \`${field}\` set to ${JSON.stringify(value)}`,
    ),
  ].join(', ') || 'as written';

/** A case's declaration as a variant plays it: fields taken out, then fields set. */
const varied = (fx, variant) => {
  const out = { ...fx };
  for (const field of variant.without ?? []) delete out[field];
  return { ...out, ...variant.set };
};

/**
 * What the control finds, as `{ rule, … }`. `unreadable`: the declaration or its case cannot be
 * read. `no-case`: a `case` the tree does not hold. `unclean`: the runner reported the case as
 * written, or pinned to its own value — the variants then differ from a play that is not clean,
 * and what they report proves nothing. Where the gate hands over a `pin`: `no-pins`, `pins` that
 * are no list of values; `no-own-pin`, a case that pins nothing itself, so no play of it can
 * stand clean beside a pinned one; `unheard`, a value the runner reported nothing of. For every
 * rule the gate `holds`: `no-variant`, a rule no variant is `for`; `unplayable`, a variant whose
 * play throws; `unheard`, a variant the runner reported nothing of. `gate.play(name, fx)` plays
 * a declaration over the input named and returns the lines the runner reported; it is asked
 * only of a sound declaration — the case as written first, then pinned to its own value and to
 * every pin, then every variant — and each play gets a copy of the case of its own, so a pin or
 * a runner that writes into what it is handed cannot change the plays after it.
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
  const pinned = gate.pin !== undefined;
  if (pinned && (!Array.isArray(control.pins) || control.pins.length === 0))
    return [{ rule: 'no-pins' }];
  let fx;
  let mine;
  try {
    fx = gate.read(control.case);
    if (pinned) mine = gate.own(fx);
  } catch (error) {
    return [{ rule: 'unreadable', error, of: control.case }];
  }
  if (pinned && mine === undefined) return [{ rule: 'no-own-pin', control }];
  const copy = () => structuredClone(fx);
  const clean = [
    ...(await gate.play(control.case, copy())),
    ...(pinned ? await gate.play(control.case, gate.pin(copy(), mine)) : []),
  ];
  if (clean.length) return [{ rule: 'unclean', control, lines: clean }];
  const found = [];
  for (const value of pinned ? control.pins : [])
    if ((await gate.play(control.case, gate.pin(copy(), value))).length === 0)
      found.push({ rule: 'unheard', control, value });
  const variants = Array.isArray(control.variants) ? control.variants : [];
  for (const key of gate.holds)
    if (!variants.some((variant) => variant?.for === key))
      found.push({ rule: 'no-variant', control, key });
  for (const variant of variants) {
    let lines;
    try {
      lines = await gate.play(
        variant.case ?? control.case,
        varied(copy(), variant),
      );
    } catch (error) {
      found.push({ rule: 'unplayable', control, variant, error });
      continue;
    }
    if (lines.length === 0) found.push({ rule: 'unheard', control, variant });
  }
  return found;
};

/**
 * The verdict held on prepared declarations and reports — a control of the control, as
 * `check-coverage` holds its own (`ownControl`). Without these rows a rule here that stopped
 * refusing would stay green for as long as every gate's runner works, which is all of the time
 * this control exists for. The prepared runner plays `CASE` as the case `a`, and as `c`, an input
 * of the same defect: it reports a play over `b`, or without the defect, as one that passed, a
 * `check` or a `rule` other than the case's, and what `said` maps the pin to — unless the row
 * makes it `deaf` to one of them. A declaration
 * is `CONTROL` and the gate's `pin` writes the value in place unless the row says otherwise;
 * `pin: null` is a gate that pins nothing.
 */
const CASE = { pin: 'o', check: 'c', rule: 'r', defect: 'd' };
const CONTROL = {
  case: 'a',
  pins: ['x', 'y'],
  variants: [
    { for: 'passed', case: 'b' },
    { for: 'check', set: { check: 'e' } },
    { for: 'rule', set: { rule: 's' } },
  ],
};
const SAID = { x: ['x'], y: ['y'] };
const OWN = [
  {
    why: 'a runner reporting both pins of two, every variant, and its case clean',
    finds: [],
  },
  {
    why: 'a runner reporting the first pin of two and not the second',
    said: { x: ['x'] },
    finds: ['unheard "y"'],
  },
  {
    why: 'a runner reporting the second pin of two and not the first',
    said: { y: ['y'] },
    finds: ['unheard "x"'],
  },
  {
    why: 'a runner reporting the case pinned to its own value',
    said: { ...SAID, o: ['o'] },
    finds: ['unclean'],
  },
  {
    why: 'a runner reporting the case as written, in a gate that pins nothing',
    pin: null,
    said: { o: ['o'] },
    finds: ['unclean'],
  },
  {
    why: 'a runner reporting the case pinned to its own value and not as written',
    pin: (fx) => ({ ...fx, pin: 'p' }),
    said: { ...SAID, p: ['p'] },
    finds: ['unclean'],
  },
  {
    why: 'a case that pins nothing itself',
    fx: { check: 'c', rule: 'r', defect: 'd' },
    finds: ['no-own-pin'],
  },
  {
    why: 'a gate that pins nothing, and a case that pins nothing either',
    pin: null,
    fx: { check: 'c', rule: 'r', defect: 'd' },
    control: { ...CONTROL, pins: undefined },
    finds: [],
  },
  {
    why: 'a control naming a case the tree does not hold',
    control: { ...CONTROL, case: 'b' },
    finds: ['no-case'],
  },
  {
    why: 'a control that is no object',
    control: null,
    finds: ['no-case'],
  },
  {
    why: 'a control with an empty list of pins',
    control: { ...CONTROL, pins: [] },
    finds: ['no-pins'],
  },
  {
    why: 'a control whose pins are no list',
    control: { ...CONTROL, pins: 'x' },
    finds: ['no-pins'],
  },
  {
    why: 'a declaration that cannot be read',
    load: () => JSON.parse('{'),
    finds: ['unreadable'],
  },
  {
    why: 'a case that cannot be read',
    fx: null,
    finds: ['unreadable'],
  },
  {
    why: 'a runner deaf to a case that passed',
    deaf: ['passed'],
    finds: ['unheard passed'],
  },
  {
    why: 'a runner deaf to another check',
    deaf: ['check'],
    finds: ['unheard check'],
  },
  {
    why: 'a runner deaf to another rule',
    deaf: ['rule'],
    finds: ['unheard rule'],
  },
  {
    why: 'a variant that passes by taking the defect out, and a runner reporting it',
    control: {
      ...CONTROL,
      variants: [{ for: 'passed', without: ['defect'] }, ...CONTROL.variants],
    },
    finds: [],
  },
  {
    why: 'a variant that takes the defect out and sets it again, which is the case as written',
    control: {
      ...CONTROL,
      variants: [
        ...CONTROL.variants,
        { for: 'passed', without: ['defect'], set: { defect: 'd' } },
      ],
    },
    finds: ['unheard passed'],
  },
  {
    why: 'a variant that is no object',
    control: { ...CONTROL, variants: [null, ...CONTROL.variants] },
    finds: ['unplayable'],
  },
  {
    why: 'variants over another input that take fields out and set them too',
    control: {
      ...CONTROL,
      variants: [
        ...CONTROL.variants,
        { for: 'passed', case: 'c', without: ['defect'] },
        { for: 'check', case: 'c', set: { check: 'e' } },
      ],
    },
    finds: [],
  },
  {
    why: 'variants taking out two fields, in either order',
    control: {
      ...CONTROL,
      variants: [
        ...CONTROL.variants,
        { for: 'passed', without: ['pin', 'defect'] },
        { for: 'passed', without: ['defect', 'pin'] },
      ],
    },
    finds: [],
  },
  {
    why: 'a pin that writes into the case it is handed, and a runner deaf to another check',
    pin: (fx, value) => Object.assign(fx, { pin: value }),
    deaf: ['check'],
    finds: ['unheard check'],
  },
  {
    why: 'a control with no variant for a rule the gate holds',
    control: { ...CONTROL, variants: CONTROL.variants.slice(0, 2) },
    finds: ['no-variant rule'],
  },
  {
    why: 'a control whose variants are no list',
    control: { ...CONTROL, variants: { for: 'passed', case: 'b' } },
    finds: ['no-variant passed', 'no-variant check', 'no-variant rule'],
  },
  {
    why: 'a variant whose play throws',
    control: {
      ...CONTROL,
      variants: [...CONTROL.variants, { for: 'passed', case: 'z' }],
    },
    finds: ['unplayable'],
  },
];

const shown = (f) =>
  f.rule === 'no-variant'
    ? `no-variant ${f.key}`
    : f.rule !== 'unheard'
      ? f.rule
      : f.variant
        ? `unheard ${f.variant.for}`
        : `unheard ${JSON.stringify(f.value)}`;

const ownControl = async () => {
  const problems = [];
  for (const row of OWN) {
    const fx = 'fx' in row ? row.fx : CASE;
    const control = 'control' in row ? row.control : CONTROL;
    const said = row.said ?? SAID;
    const deaf = row.deaf ?? [];
    const pin =
      'pin' in row
        ? (row.pin ?? undefined)
        : (prepared, value) => ({ ...prepared, pin: value });
    const found = await verdict({
      load: row.load ?? (() => control),
      cases: ['a'],
      read: () => fx ?? JSON.parse('{'),
      own: (prepared) => prepared.pin,
      pin,
      holds: ['passed', 'check', 'rule'],
      play: async (name, played) => {
        if (name === 'z') throw new Error('no such input');
        if (name === 'b' || !('defect' in played))
          return deaf.includes('passed') ? [] : ['passed'];
        return [
          ...['check', 'rule'].filter(
            (key) => played[key] !== CASE[key] && !deaf.includes(key),
          ),
          ...(said[played.pin] ?? []),
        ];
      },
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

/** What a rule of the runner reports, in the words of a finding; a rule not named is a field. */
const HELD = {
  passed: 'a case that passed',
  check: 'a case that fired another check',
  rule: 'a case that fired another rule',
  built: 'a case that cannot be built',
  undeclared: 'a case that fired more than it declares',
  unread: 'a case declaring what no reading of it reads',
  unsaid: 'a case with two modes that does not say what its third reading does',
  ordinary: 'a case with two modes that an ordinary run refuses',
  rehearsal: 'a case whose rehearsal does not do what the case says',
  silent: 'a case a declared rule of which stayed silent',
  hides: 'a case that names in `hides` a rule nothing keeps silent',
  stops: 'a case that keeps a rule silent and does not name it in `hides`',
};
const heldAs = (key) => HELD[key] ?? `a case at odds with its \`${key}\``;

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
        `pinned or played otherwise, the variant's doing`
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
        `${where}: the runner reported ${name} as written, or pinned to its own value — a ` +
        `variant then differs from a play that is not clean, and what the runner reports of ` +
        `it proves nothing about the variant:\n    ${f.lines.join('\n    ')}`
      );
    case 'no-variant':
      return (
        `${where}: no variant is \`for\` \`${f.key}\` — the runner reports ` +
        `${heldAs(f.key)}, no prepared case is one, and a rule nothing plays is switched off ` +
        `in silence`
      );
    case 'unplayable':
      return (
        `${where}: ${name} ${shape(f.variant)} cannot be played ` +
        `(${f.error.message.split('\n')[0]}) — a variant that builds no input proves nothing`
      );
    default:
      return f.variant
        ? `${where}: the runner reported nothing of ${name} ${shape(f.variant)} — either it ` +
            `no longer reports ${heldAs(f.variant.for)}, and one passes in silence, or the ` +
            `variant is not one, and the control needs one that is`
        : `${where}: the runner reported nothing of ${name} pinned to ` +
            `${JSON.stringify(f.value)} — either it no longer holds a case to what the case ` +
            `pins, and a pinned refusal drifts in silence, or the refusal carries this value, ` +
            `and the control needs one it does not`;
  }
};

/**
 * The runner's own control. A gate's negative control runs each prepared case and holds the
 * play to what the case declares: that it was refused at all, on the check it declares, on the
 * rule where it declares one, and — where the case pins one — with a phrase, a name or a word
 * the refusal or the rendering has to carry (`message`, `says`, `names`, `status`). No prepared
 * case proves any of these comparisons is made: every case is built to fire its own check, on
 * its own rule, with what it pins, so a runner that stopped comparing passes all of them.
 * Measured 2026-10-27 on a copy of each gate: switching off the pinned comparison left all
 * eleven gates that make one green (PR #140), and switching off the rule comparison left
 * `check-styles`, `check-files` and `check-tools` green, and `check-flake`'s three comparisons
 * of what a run fires with `beside` and `hides` (PR #140's review).
 *
 * So each gate keeps `_runner.json` beside its cases, `{ case, pins?, variants }`: a case of the
 * tree, played as written, which has to come out clean, and the plays the runner has to report.
 * A pin replaces the value the case pins — a phrase of a neighbouring refusal of the same check,
 * the drift the comparison exists to catch, and, where the runner refuses a pin it cannot
 * compare (`check-parts`, `check-files`, `check-tools`, `check-reach`), the shapes it refuses.
 * A variant, `{ for, case?, without?, set? }`, plays the case's declaration over the input
 * `case` names, with the fields `without` lists taken out and those `set` names replaced: the
 * declaration over the reference, or with its defect taken out, for a case that passed;
 * `check` or `rule` set to another, for another check or rule; the field a rule compares, for
 * the rest. `for` names the rule of the runner the variant proves, and every rule the gate
 * `holds` needs one, so a variant cannot leave the declaration without the control saying so.
 *
 * The gate hands over `load()`, which reads the declaration, `read(name)`, which returns a case as
 * its loop plays it, `run(name, fx)`, the very function its loop plays every case through,
 * returning the lines it reports, and `holds`, the rules of that runner no case proves; and, where
 * its cases pin, `own(fx)`, the value the case pins, and `pin(fx, value)`, which writes a value
 * where its cases write theirs. A case's pin, its check and its rule are read by the runner alone
 * — the input a check judges is built from the rest, and `check-mutation`, whose runner picks the
 * reading a case goes through by a `check` of `write`, sets another — so a variant that differs
 * from a clean play in one of them alone is reported for it, and the mutants of each gate's runner
 * say which rule each variant proves. Played apart from the loop, the control counts as no case.
 *
 * Not held here: that a gate calls this at all, as nothing holds that its loop runs, and that
 * `holds` names every rule its runner has.
 */
export const runnerControl = async ({
  where,
  load,
  cases,
  read,
  run,
  holds,
  own,
  pin,
}) => {
  const found = await verdict({
    load,
    cases,
    read,
    own,
    pin,
    holds,
    play: run,
  });
  return [...(await ownControl()), ...found.map((f) => said(where, f))];
};
