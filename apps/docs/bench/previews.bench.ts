import { afterEveryRender, Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { cpus } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, test } from 'vitest';
import { DEMOS } from '../src/app/demos';

/**
 * The cost run (plan 2.3): what every component page's preview costs to render, measured
 * on the very demo the page shows, and written to `tmp/bench/report.json` for
 * `tools/check-bench.mjs` to hold against `apps/docs/bench.snapshot.md`.
 *
 * Four of the readings are COUNTS and one is a CLOCK, and that split is the whole design
 * ([0023](../../../docs/decisions/0023-a-tolerance-is-for-a-wobbling-measurement.md)): the
 * counts come out the same on every machine and in every run, so the gate holds them
 * exactly and in both directions; the microseconds move with the machine, the load and the
 * JIT's mood, so they are published with the date and the machine they were read on, and
 * compared by nobody.
 *
 *   elements  — the nodes the scene puts in the document, the host excluded: the number
 *               every layout and every style recalculation scales with,
 *   depth     — the longest path from the host downwards: wrapper creep shows up here
 *               before it shows up anywhere else,
 *   listeners — what the scene registers through `addEventListener` and has not taken back
 *               once it is stable, on elements, the document and the window alike,
 *   renders   — how many passes the application made before the scene held still: one is
 *               the answer, and a second means something wrote a signal a template had
 *               already read,
 *   micros    — creation to stable, the median of fifteen rounds after three warm-ups.
 *
 * jsdom on purpose, and not a browser: there is no layout here, so the clock reads the
 * library's own work — the compiled templates, the signals, the listeners it wires — and
 * not the engine's. That is the part this repository can change, and the part a consumer
 * cannot measure from the outside.
 */
const ROOT = join(import.meta.dirname, '../../..');
const REPORT = join(ROOT, 'tmp/bench/report.json');
const WARM_UP = 3;
const ROUNDS = 15;

interface Reading {
  readonly elements: number;
  readonly depth: number;
  readonly listeners: number;
  readonly renders: number;
  readonly micros: number;
}

/** The longest path from the host downwards, in elements; a childless host is 0. */
const depthOf = (root: Element): number => {
  let deepest = 0;
  const walk = (node: Element, level: number): void => {
    if (level > deepest) deepest = level;
    for (const child of Array.from(node.children)) walk(child, level + 1);
  };
  walk(root, 0);
  return deepest;
};

/**
 * Counts what a scene registers and has not taken back. Every target in jsdom — an element,
 * the document, the window — inherits the two methods from one prototype, so patching it
 * there sees the `document:keydown` a directive listens on as well as the click on a button.
 */
const listening = () => {
  const proto = EventTarget.prototype;
  const add = proto.addEventListener;
  const remove = proto.removeEventListener;
  let open = 0;
  proto.addEventListener = function (
    this: EventTarget,
    ...args: Parameters<typeof add>
  ) {
    open++;
    return add.apply(this, args);
  };
  proto.removeEventListener = function (
    this: EventTarget,
    ...args: Parameters<typeof remove>
  ) {
    open--;
    return remove.apply(this, args);
  };
  return {
    open: () => open,
    restore: () => {
      proto.addEventListener = add;
      proto.removeEventListener = remove;
    },
  };
};

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** One scene: the counts from the first creation — the one a visitor gets — and the clock from the rounds after it. */
const measure = async (type: Type<unknown>): Promise<Reading> => {
  let renders = 0;
  TestBed.runInInjectionContext(() => afterEveryRender(() => renders++));

  const meter = listening();
  const first = TestBed.createComponent(type);
  first.autoDetectChanges();
  await first.whenStable();
  const host = first.nativeElement as Element;
  const counts = {
    elements: host.querySelectorAll('*').length,
    depth: depthOf(host),
    listeners: meter.open(),
    renders,
  };
  first.destroy();
  meter.restore();

  const times: number[] = [];
  for (let round = 0; round < WARM_UP + ROUNDS; round++) {
    const started = performance.now();
    const fixture = TestBed.createComponent(type);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    const took = performance.now() - started;
    fixture.destroy();
    if (round >= WARM_UP) times.push(took);
  }
  return { ...counts, micros: Math.max(1, Math.round(median(times) * 1000)) };
};

const scenes: Record<string, Reading> = {};

describe('The cost of every preview', () => {
  for (const [id, load] of Object.entries(DEMOS)) {
    test(id, async () => {
      const reading = await measure(await load());
      // A scene that put nothing in the document, or one that never rendered, is not a
      // measurement of anything — the run says so here rather than recording a zero.
      expect(reading.elements).toBeGreaterThan(0);
      expect(reading.renders).toBeGreaterThan(0);
      scenes[id] = reading;
    });
  }
});

afterAll(() => {
  const require = createRequire(import.meta.url);
  const machine = {
    cpu: cpus()[0]?.model.trim() ?? 'unknown',
    cores: cpus().length,
    node: process.version,
    dom: `jsdom ${require('jsdom/package.json').version}`,
  };
  mkdirSync(join(ROOT, 'tmp/bench'), { recursive: true });
  writeFileSync(
    REPORT,
    JSON.stringify(
      {
        measured: new Date().toISOString().slice(0, 10),
        machine,
        scenes: Object.fromEntries(
          Object.entries(scenes).sort(([a], [b]) => a.localeCompare(b)),
        ),
      },
      null,
      2,
    ) + '\n',
  );
});
