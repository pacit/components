/**
 * The arithmetic of a radial picture: the slices of a pie, the path of a ring's sector, the
 * place of a label beside the rim and the angle of a gauge's value
 * ([0115](../../../../../docs/decisions/0115-a-pie-is-a-scene-of-shares-and-a-gauge-is-a-meter-drawn-as-an-arc.md)).
 * Angles are radians from twelve o'clock, clockwise, as the eye reads a clock.
 */

/**
 * A slice of a pie: its share of the total and the angles it spans.
 *
 * @since next
 */
export interface PctSliceAngles {
  readonly share: number;
  readonly start: number;
  readonly end: number;
}

const TURN = 2 * Math.PI;

/**
 * The slices of a pie from the values, in order, from `start`: each takes its share of the
 * whole turn. A value that is not a positive finite number takes no angle and a share of zero;
 * with no positive value there are no slices.
 *
 * @since next
 */
export function pctSlices(
  values: readonly number[],
  start = 0,
): readonly PctSliceAngles[] {
  const sizes = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const total = sizes.reduce((a, b) => a + b, 0);
  if (total <= 0) return [];
  let at = start;
  return sizes.map((size) => {
    const share = size / total;
    const from = at;
    at += share * TURN;
    return { share, start: from, end: at };
  });
}

/**
 * Which of the values stand on their own and which fold into one slice of the rest: the
 * `most` largest stand; the rest fold where they are two or more, since a slice of the rest
 * that holds one value would only lose its name. The indices come back in the order given.
 *
 * @since next
 */
export function pctFoldOthers(
  values: readonly number[],
  most: number,
): { readonly kept: readonly number[]; readonly folded: readonly number[] } {
  const indices = values.map((_, i) => i);
  if (!(most >= 0) || indices.length <= most + 1)
    return { kept: indices, folded: [] };
  const byValue = [...indices].sort((a, b) => values[b] - values[a]);
  const kept = new Set(byValue.slice(0, most));
  return {
    kept: indices.filter((i) => kept.has(i)),
    folded: indices.filter((i) => !kept.has(i)),
  };
}

/**
 * The point at `angle` on a circle of `radius` around (`cx`, `cy`).
 *
 * @since next
 */
export function pctArcPoint(
  cx: number,
  cy: number,
  radius: number,
  angle: number,
): { readonly x: number; readonly y: number } {
  return { x: cx + radius * Math.sin(angle), y: cy - radius * Math.cos(angle) };
}

/**
 * The SVG path of a sector of a ring from `start` to `end`, between `inner` and `outer`: a
 * wedge when `inner` is zero. A sector of the whole turn or more is the whole ring, drawn as
 * two half arcs since one arc of a full turn draws nothing.
 *
 * @since next
 */
export function pctArcPath(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  start: number,
  end: number,
): string {
  const sweep = Math.min(TURN, end - start);
  if (!(sweep > 0) || !(outer > 0)) return '';
  const f = (n: number) => String(Math.round(n * 100) / 100);
  const point = (r: number, a: number) => {
    const p = pctArcPoint(cx, cy, r, a);
    return `${f(p.x)} ${f(p.y)}`;
  };
  const arc = (r: number, from: number, to: number, forward: boolean) => {
    const large = Math.abs(to - from) > Math.PI ? 1 : 0;
    return `A ${f(r)} ${f(r)} 0 ${large} ${forward ? 1 : 0} ${point(r, to)}`;
  };
  const whole = sweep >= TURN - 1e-9;
  const mid = start + sweep / 2;
  const stop = whole ? start + TURN : end;
  const outerArc = whole
    ? `${arc(outer, start, mid, true)} ${arc(outer, mid, stop, true)}`
    : arc(outer, start, stop, true);
  if (!(inner > 0)) {
    return whole
      ? `M ${point(outer, start)} ${outerArc} Z`
      : `M ${f(cx)} ${f(cy)} L ${point(outer, start)} ${outerArc} Z`;
  }
  const innerArc = whole
    ? `${arc(inner, stop, mid, false)} ${arc(inner, mid, start, false)}`
    : arc(inner, stop, start, false);
  return `M ${point(outer, start)} ${outerArc} L ${point(inner, stop)} ${innerArc} Z`;
}

/**
 * A label asked for beside the rim: where its slice's middle is and how wide its text.
 *
 * @since next
 */
export interface PctPieLabelAsk {
  readonly angle: number;
  readonly width: number;
}

/**
 * A label placed: the start of its text and its anchor, and the leader from the rim through
 * an elbow to the text.
 *
 * @since next
 */
export interface PctPieLabel {
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly anchor: 'start' | 'end';
  readonly leader: readonly (readonly [number, number])[];
}

/**
 * Where the labels of a pie stand: each beside its slice's middle, `leader` pixels out from the
 * rim, on the side of the picture its slice faces, and then down the side in order — a label
 * that would cover the one before it moves below it, by `lineHeight`, and one that would leave
 * the box, below or beside, is dropped; the table and the legend hold what the picture does
 * not write. The `box` is the picture's, with the circle at (`cx`, `cy`).
 *
 * @since next
 */
export function pctPieLabels(
  asks: readonly PctPieLabelAsk[],
  cx: number,
  cy: number,
  radius: number,
  leader: number,
  lineHeight: number,
  box: { readonly width: number; readonly height: number },
): readonly PctPieLabel[] {
  const half = lineHeight / 2;
  const round = (n: number) => Math.round(n * 100) / 100;
  const point = (r: number, a: number) => {
    const p = pctArcPoint(cx, cy, r, a);
    return { x: round(p.x), y: round(p.y) };
  };
  const sides: [right: PctPieLabel[], left: PctPieLabel[]] = [[], []];
  asks.forEach((ask, index) => {
    const angle = ((ask.angle % TURN) + TURN) % TURN;
    const right = angle < Math.PI;
    const rim = point(radius, angle);
    const elbow = point(radius + leader, angle);
    const x = round(right ? elbow.x + leader / 2 : elbow.x - leader / 2);
    sides[right ? 0 : 1].push({
      index,
      x,
      y: elbow.y,
      anchor: right ? 'start' : 'end',
      leader: [
        [rim.x, rim.y],
        [elbow.x, elbow.y],
        [x, elbow.y],
      ],
    });
  });
  const placed: PctPieLabel[] = [];
  for (const side of sides) {
    side.sort((a, b) => a.y - b.y);
    let floor = -Infinity;
    for (const label of side) {
      const y = Math.max(label.y, floor + lineHeight);
      const width = asks[label.index].width;
      const fits =
        y - half >= 0 &&
        y + half <= box.height &&
        (label.anchor === 'start'
          ? label.x + width <= box.width
          : label.x - width >= 0);
      if (!fits) continue;
      floor = y;
      const last = label.leader[label.leader.length - 1];
      placed.push({
        ...label,
        y,
        leader: [...label.leader.slice(0, -1), [last[0], y]],
      });
    }
  }
  return placed.sort((a, b) => a.index - b.index);
}

/**
 * The angle of a value on a gauge whose arc sweeps `sweep` radians around twelve o'clock, from
 * `min` at the left end to `max` at the right, the value held at the ends.
 *
 * @since next
 */
export function pctGaugeAngle(
  value: number,
  min: number,
  max: number,
  sweep: number,
): number {
  const span = max - min;
  const t = span > 0 ? Math.min(1, Math.max(0, (value - min) / span)) : 0;
  return -sweep / 2 + t * sweep;
}
