import { Component, DestroyRef, inject, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctBars, PctChart, PctLine } from '@pacit/components/chart';

const MINUTE = 60_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

interface Reading {
  readonly at: number;
  readonly value: number;
}

/** The meter's reading at minute `k`: a slow swing around 21 °C. */
const meter = (k: number): Reading => ({
  at: START + k * MINUTE,
  value: Math.round((21 + 1.5 * Math.sin(k / 9)) * 10) / 10,
});

/**
 * Live readings and a change eased
 *
 * A reading added at the end and the oldest dropped is all a live series costs: the chart keeps
 * the columns of the rows it already read and reads the new one alone. With `animate`, a change
 * that only moves the values eases into place; readings added are drawn at once, and a reader
 * who asks for reduced motion sees every change at once.
 */
@Component({
  selector: 'demo-chart-live',
  imports: [PctButton, PctChart, PctLine, PctBars],
  styles: `
    section {
      display: grid;
      gap: var(--pct-space-2);
    }
    div {
      display: flex;
      gap: var(--pct-space-2);
    }
  `,
  template: `
    <section>
      <pct-chart
        ariaLabel="Supply air read each minute on 28 October 2026"
        timeZone="Europe/Warsaw"
        follow
        [now]="clock"
        [(window)]="window"
        style="height: 180px"
      >
        <pct-line
          [data]="readings()"
          x="at"
          y="value"
          name="Supply"
          unit="°C"
        />
      </pct-chart>
      <pct-chart
        ariaLabel="Energy by room"
        x="band"
        [categories]="rooms"
        animate
        style="height: 180px"
      >
        <pct-bars [data]="energy()" x="room" y="kWh" name="Energy" unit="kWh" />
      </pct-chart>
      <div>
        <button pctButton variant="soft" size="sm" (click)="toggle()">
          {{ timer === null ? 'Stream' : 'Stop' }}
        </button>
        <button pctButton variant="ghost" size="sm" (click)="recount()">
          Recount
        </button>
      </div>
    </section>
  `,
})
export class ChartLiveDemo {
  protected readonly readings = signal(
    Array.from({ length: 120 }, (_, k) => meter(k)),
  );
  protected readonly clock = () => this.readings().at(-1)?.at ?? START;
  protected readonly window = signal<{ from: number; to: number } | null>({
    from: START + 89 * MINUTE,
    to: START + 119 * MINUTE,
  });
  protected readonly rooms = ['Kitchen', 'Hall', 'Study'];
  protected readonly energy = signal([
    { room: 0, kWh: 4.5 },
    { room: 1, kWh: 7 },
    { room: 2, kWh: 2.5 },
  ]);
  protected timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stop());
  }

  /** A reading a second, each the next minute of the meter. */
  protected toggle(): void {
    if (this.timer !== null) return this.stop();
    this.timer = setInterval(() => {
      this.readings.update((rows) => [
        ...rows.slice(1),
        meter((rows.at(-1)!.at - START) / MINUTE + 1),
      ]);
    }, 1000);
  }

  /** The same rooms counted again: only the values move. */
  protected recount(): void {
    this.energy.update((rows) =>
      rows.map((row) => ({
        ...row,
        kWh: Math.round(Math.random() * 100) / 10,
      })),
    );
  }

  private stop(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}
