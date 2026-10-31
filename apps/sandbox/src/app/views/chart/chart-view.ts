import { Component, computed, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import {
  PctArea,
  PctAxis,
  PctBand,
  type PctBandState,
  PctBars,
  pctBin,
  PctBox,
  PctChart,
  PctChartLegend,
  PctChartSync,
  PctChartTable,
  PctChartTooltip,
  pctIntervalStart,
  PctLine,
  PctNote,
  PctNow,
  type PctPick,
  PctPoints,
  PctRange,
  PctReference,
  PctSpan,
  type PctThreshold,
} from '@pacit/components/chart';
import { SbxDemo } from '../../ui/demo';

interface Reading {
  readonly at: number;
  readonly value: number | null;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** Midnight in Warsaw on 25 October 2026, the day of twenty-five hours: 22:00 UTC the day before. */
const START = Date.UTC(2026, 9, 24, 22);

/** mulberry32: the same readings in every engine and every run, so a screenshot can hold them. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Supply air through the day: a slow swing, noise, and an hour the device did not answer. */
function supplyAir(): Reading[] {
  const random = seeded(7);
  const rows: Reading[] = [];
  for (let at = START; at <= START + 25 * HOUR; at += 10 * MINUTE) {
    const hours = (at - START) / HOUR;
    const gap = hours >= 13 && hours < 14;
    const value =
      20 +
      2.5 * Math.sin((hours / 25) * 2 * Math.PI - 1) +
      (random() - 0.5) * 0.4;
    rows.push({ at, value: gap ? null : Math.round(value * 10) / 10 });
  }
  return rows;
}

/** The fan's power, written when it changes. */
const fanPower: Reading[] = [
  { at: START, value: 380 },
  { at: START + 6 * HOUR, value: 520 },
  { at: START + 9 * HOUR, value: 640 },
  { at: START + 17 * HOUR, value: 450 },
  { at: START + 22 * HOUR, value: 380 },
];

/** The heat pump's mode through the day: what it was doing, from when to when. */
const modes = [
  ['off', 0, 5],
  ['heating', 5, 7.5],
  ['defrost', 7.5, 8],
  ['heating', 8, 9],
  ['standby', 9, 16],
  ['heating', 16, 20],
  ['defrost', 20, 20.25],
  ['heating', 20.25, 22],
  ['off', 22, 25],
].map(([mode, from, to]) => ({
  mode: mode as string,
  from: START + (from as number) * HOUR,
  to: START + (to as number) * HOUR,
}));

/** The heater, on and off. */
const heater: Reading[] = [
  { at: START, value: 0 },
  { at: START + 5 * HOUR, value: 1 },
  { at: START + 8 * HOUR, value: 0 },
  { at: START + 19 * HOUR, value: 1 },
  { at: START + 21 * HOUR, value: 0 },
];

/** The days of a month in Warsaw, each with the heat pump's energy. */
function daysOf(
  year: number,
  monthIndex: number,
  seed: number,
  gap = 0,
): { at: number; energy: number | null }[] {
  const random = seeded(seed);
  const rows: { at: number; energy: number | null }[] = [];
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  for (let day = 1; day <= days; day++) {
    // Midnight of the day in Warsaw, whichever side of the change of clocks it stands on.
    const at = pctIntervalStart(
      Date.UTC(year, monthIndex, day, 12),
      'day',
      'Europe/Warsaw',
    );
    const energy =
      day === gap ? null : Math.round((8 + random() * 10) * 10) / 10;
    rows.push({ at, energy });
  }
  return rows;
}

/** Eight rooms through the day, each its own swing, named so the legend has eight names. */
function rooms(): { name: string; rows: Reading[] }[] {
  const names = [
    'Kitchen',
    'Hall',
    'Bedroom',
    'Study',
    'Bathroom',
    'Loft',
    'Garage',
    'Cellar',
  ];
  return names.map((name, i) => {
    const random = seeded(20 + i);
    const rows: Reading[] = [];
    for (let at = START; at <= START + 25 * HOUR; at += 30 * MINUTE) {
      const hours = (at - START) / HOUR;
      const value =
        16 +
        i * 0.8 +
        2 * Math.sin((hours / 25) * 2 * Math.PI - i * 0.7) +
        (random() - 0.5) * 0.3;
      rows.push({ at, value: Math.round(value * 10) / 10 });
    }
    return { name, rows };
  });
}

/** A week of one reading every ten seconds. */
function aWeek(): (readonly [number, number])[] {
  const random = seeded(11);
  const rows: (readonly [number, number])[] = [];
  let value = 50;
  for (let i = 0; i < 60_480; i++) {
    value += (random() - 0.5) * 0.8;
    rows.push([START + i * 10_000, Math.round(value * 100) / 100]);
  }
  return rows;
}

/** A response curve: a value along a number, not along time. */
/** A point of the heating curve: the power drawn against the outdoor temperature. */
interface HeatingPoint {
  readonly outdoor: number;
  readonly power: number | null;
}

/**
 * Eighty days of the heating season, in no order: the colder the day, the more the heat pump
 * drew — with a few days it was off, which are gaps.
 */
function heatingPoints(): HeatingPoint[] {
  const random = seeded(11);
  const rows: HeatingPoint[] = [];
  for (let i = 0; i < 80; i++) {
    const outdoor = Math.round((random() * 26 - 12) * 10) / 10;
    const off = random() < 0.05;
    const power = 5.5 - 0.28 * outdoor + (random() - 0.5) * 1.6;
    rows.push({ outdoor, power: off ? null : Math.round(power * 100) / 100 });
  }
  return rows;
}

/** A room: how warm, how damp, and how large. */
interface Room {
  readonly name: string;
  readonly temperature: number;
  readonly humidity: number;
  readonly area: number;
}

const roomClimate: Room[] = [
  { name: 'Living room', temperature: 21.4, humidity: 44, area: 32 },
  { name: 'Kitchen', temperature: 22.8, humidity: 58, area: 14 },
  { name: 'Bedroom', temperature: 19.2, humidity: 48, area: 16 },
  { name: 'Study', temperature: 20.6, humidity: 41, area: 11 },
  { name: 'Bathroom', temperature: 23.5, humidity: 71, area: 6 },
  { name: 'Hall', temperature: 19.8, humidity: 46, area: 9 },
  { name: 'Cellar', temperature: 15.1, humidity: 66, area: 24 },
];

/** Fifty thousand readings of a sensor against another: a cloud along a curve, thinned to the pixel. */
function cloud(): (readonly [number, number])[] {
  const random = seeded(23);
  const rows: (readonly [number, number])[] = [];
  for (let i = 0; i < 50_000; i++) {
    const x = random() * 100;
    // two uniform draws make a bell of sorts: enough of one for a cloud
    const noise = (random() + random() - 1) * 6;
    rows.push([x, 20 + 0.4 * x + 8 * Math.sin(x / 12) + noise] as const);
  }
  return rows;
}

/** A device's power through a day, from standby to full, over four decades. */
function deviceWatts(): Reading[] {
  const random = seeded(5);
  const rows: Reading[] = [];
  for (let at = START; at <= START + 25 * HOUR; at += 15 * MINUTE) {
    const hours = (at - START) / HOUR;
    const on = (hours >= 6 && hours < 8) || (hours >= 17 && hours < 22);
    const heating = hours >= 18 && hours < 20;
    const value = heating
      ? 1800 + random() * 300
      : on
        ? 60 + random() * 40
        : 0.8 + random() * 0.4;
    rows.push({ at, value: Math.round(value * 10) / 10 });
  }
  return rows;
}

/** Phase 10: a day's energy by source, every quarter of an hour, in kilowatts. */
interface Sourced {
  readonly at: number;
  readonly gas: number | null;
  readonly pump: number;
  readonly solar: number;
}

function energyBySource(): Sourced[] {
  const random = seeded(11);
  const rows: Sourced[] = [];
  for (let at = START; at <= START + 25 * HOUR; at += 15 * MINUTE) {
    const hours = ((at - START) / HOUR + 22) % 24;
    const sun = Math.max(0, Math.sin(((hours - 6) / 12) * Math.PI));
    const cold = 1 + 0.5 * Math.cos(((hours - 4) / 24) * 2 * Math.PI);
    rows.push({
      at,
      // the boiler's meter was offline for an hour in the afternoon
      gas:
        hours >= 14 && hours < 15
          ? null
          : Math.round((1.2 * cold + random() * 0.4) * 100) / 100,
      pump: Math.round((0.8 * cold + random() * 0.3) * 100) / 100,
      solar: Math.round(sun * (2.4 + random() * 0.6) * 100) / 100,
    });
  }
  return rows;
}

/** Four hundred response times in milliseconds: most quick, a long tail. */
function latencies(): number[] {
  const random = seeded(17);
  return Array.from({ length: 400 }, () => {
    const base = 40 + random() * 60;
    return Math.round(random() < 0.12 ? base + random() * 400 : base);
  });
}

/** A day's temperatures outside, low and high, over March 2026, with the mean beside them. */
interface DayRange {
  readonly at: number;
  readonly low: number;
  readonly high: number;
  readonly mean: number;
}

function marchRanges(): DayRange[] {
  const random = seeded(29);
  return Array.from({ length: 31 }, (_, i) => {
    const at = Date.UTC(2026, 2, i + 1);
    const trend = 2 + i * 0.25;
    const low = Math.round((trend - 3 - random() * 3) * 10) / 10;
    const high = Math.round((trend + 4 + random() * 4) * 10) / 10;
    return { at, low, high, mean: Math.round(((low + high) / 2) * 10) / 10 };
  });
}

/** Thirty sessions of a share: its open, high, low and close, in euro. */
interface Session {
  readonly at: number;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
}

function sessions(): Session[] {
  const random = seeded(31);
  let close = 42;
  return Array.from({ length: 30 }, (_, i) => {
    const open = close;
    close = Math.round((open + (random() - 0.48) * 3) * 100) / 100;
    const high =
      Math.round((Math.max(open, close) + random() * 1.5) * 100) / 100;
    const low =
      Math.round((Math.min(open, close) - random() * 1.5) * 100) / 100;
    return { at: Date.UTC(2026, 8, 1 + i), open, high, low, close };
  });
}

/** Each hour's response times of the day: a distribution per hour. */
interface HourBatch {
  readonly at: number;
  readonly times: readonly number[];
}

function hourlyLatencies(): HourBatch[] {
  const random = seeded(37);
  return Array.from({ length: 24 }, (_, h) => {
    const busy = h >= 9 && h <= 17 ? 1.6 : 1;
    const times = Array.from({ length: 40 }, () => {
      const base = (35 + random() * 50) * busy;
      return Math.round(random() < 0.08 ? base + random() * 300 : base);
    });
    return { at: START + 2 * HOUR + h * HOUR, times };
  });
}

const curve: Reading[] = Array.from({ length: 41 }, (_, i) => ({
  at: i * 2.5,
  value: Math.round(100 * (1 - Math.exp(-i / 9)) * 10) / 10,
}));

/**
 * Chart: a scene of scales and the marks drawn on them. What is worth watching: the units take
 * an axis each and keep it; the time axis reads the wall clock of Warsaw on the day of
 * twenty-five hours and still ticks 00:00, 06:00, 12:00 and 18:00; a gap stays a gap; sixty
 * thousand readings draw as fast as a hundred; the data stand beside the picture as a table.
 */
@Component({
  selector: 'sbx-chart-view',
  imports: [
    SbxDemo,
    PctChart,
    PctLine,
    PctAxis,
    PctChartTable,
    PctChartTooltip,
    PctChartSync,
    PctChartLegend,
    PctBars,
    PctReference,
    PctSpan,
    PctNote,
    PctNow,
    PctBand,
    PctPoints,
    PctArea,
    PctRange,
    PctBox,
    PctButton,
  ],
  templateUrl: './chart-view.html',
  styleUrl: './chart-view.scss',
})
export class ChartView {
  protected readonly supply = supplyAir();
  protected readonly fan = fanPower;
  protected readonly heater = heater;
  protected readonly week = aWeek();
  protected readonly curve = curve;
  protected readonly end = START + 25 * HOUR;
  protected readonly hidden = signal<readonly string[]>([]);
  protected readonly cursor = signal<number | null>(null);
  protected readonly rooms = signal(rooms());
  protected readonly marchDays = daysOf(2026, 2, 31, 14);
  protected readonly februaryDays = daysOf(2026, 1, 28);
  protected readonly selectedDay = signal<{ from: number; to: number } | null>(
    null,
  );
  protected readonly pickedDay = signal<number | null>(null);
  /** The picked day written in Warsaw's calendar: the app's locale has no date data of its own. */
  protected readonly pickedText = computed(() => {
    const at = this.pickedDay();
    if (at === null) return 'Nothing picked';
    const text = new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Warsaw',
    }).format(at);
    return `Picked ${text}`;
  });
  protected readonly roomNames = ['Kitchen', 'Hall', 'Study'];
  protected readonly roomEnergy = [
    { room: 0, pump: 12.4, solar: -3.1, lastYear: 14 },
    { room: 1, pump: 6.2, solar: -1.5, lastYear: 7.5 },
    { room: 2, pump: 9.8, solar: -4, lastYear: 8.1 },
  ];
  protected dropRoom(name: string): void {
    this.rooms.update((all) => all.filter((room) => room.name !== name));
  }
  /** 10:00 on the wall clock of Warsaw, on the day of twenty-five hours (the clocks went back at 03:00). */
  protected readonly ten = START + 11 * HOUR;
  /** The night tariff: midnight to six in Warsaw. */
  protected readonly night = { from: START, to: START + 6 * HOUR };
  protected readonly opened = START + 9 * HOUR;
  protected readonly reported = START + 16 * HOUR;
  protected readonly hot: PctThreshold[] = [{ at: 22, color: 'tomato' }];
  /** The heat pump's mode, and how each is drawn and named. */
  protected readonly modes = modes;
  protected readonly modeStates: Record<string, PctBandState> = {
    heating: { color: 1, label: 'Heating' },
    defrost: { color: 'tomato', label: 'Defrost' },
    standby: { color: 3, label: 'Standby' },
    off: { color: 'lightgray', label: 'Off' },
  };
  protected readonly first = (row: readonly [number, number]) => row[0];
  protected readonly second = (row: readonly [number, number]) => row[1];
  /** Phase 9: points, bubbles, a cloud, a log axis, a zoom on both axes. */
  protected readonly heating = heatingPoints();
  protected readonly rooms2 = roomClimate;
  protected readonly cloud = cloud();
  protected readonly watts = deviceWatts();
  protected readonly pickedPoint = signal<PctPick<HeatingPoint> | null>(null);
  protected readonly pickedPointText = computed(() => {
    const pick = this.pickedPoint();
    if (!pick) return 'Nothing picked.';
    return `Picked: ${pick.row.outdoor} °C outside, ${pick.row.power} kW drawn.`;
  });
  /** Phase 10: stacked areas, a monotone curve, a histogram, a range, candles, boxes. */
  protected readonly sources = energyBySource();
  protected readonly bins = pctBin(latencies());
  protected readonly binLabels = this.bins.map((b) => `${b.from}–${b.to} ms`);
  protected readonly binRows = this.bins.map((b, i) => ({
    bin: i,
    count: b.count,
  }));
  protected readonly march = marchRanges();
  protected readonly sessions = sessions();
  protected readonly hourly = hourlyLatencies();
  protected readonly yWindow = signal<{ from: number; to: number } | null>(
    null,
  );
  protected readonly yWindowText = computed(() => {
    const w = this.yWindow();
    if (!w) return 'Every value';
    const two = (v: number) => Math.round(v * 100) / 100;
    return `Values ${two(w.from)} to ${two(w.to)} kW`;
  });
}
