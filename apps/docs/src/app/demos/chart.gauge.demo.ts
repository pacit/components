import { Component, signal } from '@angular/core';
import { PctGauge, type PctGaugeBand } from '@pacit/components/chart';
import { PctButton } from '@pacit/components/button';

const COMFORT: readonly PctGaugeBand[] = [
  { from: 10, to: 18, tone: 'info', label: 'Cold' },
  { from: 18, to: 24, tone: 'success', label: 'Comfort' },
  { from: 24, to: 30, tone: 'danger', label: 'Hot' },
];

const LOAD: readonly PctGaugeBand[] = [
  { from: 0, to: 70, tone: 'success', label: 'Normal' },
  { from: 70, to: 90, tone: 'warning', label: 'High' },
  { from: 90, to: 100, tone: 'danger', label: 'Overload' },
];

/**
 * Gauges with bands
 *
 * `pct-gauge` is a meter drawn as an arc: the value with its unit, the bands of its range in
 * their tones with a word each, and the word of the band the value falls in under it — what a
 * reader hears too. A needle instead of the arc, and a half arc, are a word away.
 */
@Component({
  selector: 'demo-chart-gauge',
  imports: [PctGauge, PctButton],
  styles: `
    .row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: var(--pct-space-4);
      align-items: end;
    }
    pct-gauge {
      max-inline-size: 280px;
    }
    .actions {
      display: flex;
      gap: var(--pct-space-2);
      margin-block-start: var(--pct-space-3);
    }
  `,
  template: `
    <div class="row">
      <pct-gauge
        ariaLabel="Supply air"
        [value]="supply()"
        [min]="10"
        [max]="30"
        unit="°C"
        [bands]="comfort"
      />
      <pct-gauge
        ariaLabel="Heat pump load"
        [value]="load()"
        unit="%"
        [bands]="loadBands"
        indicator="needle"
      />
      <pct-gauge
        ariaLabel="Battery"
        [value]="battery()"
        unit="%"
        [sweep]="180"
        [bands]="[{ from: 0, to: 20, tone: 'warning', label: 'Low' }]"
      />
    </div>
    <div class="actions">
      <button pctButton type="button" (click)="warmer()">Warmer</button>
      <button pctButton type="button" (click)="busier()">More load</button>
      <button pctButton type="button" (click)="drain()">Drain</button>
    </div>
  `,
})
export class ChartGaugeDemo {
  protected readonly comfort = COMFORT;
  protected readonly loadBands = LOAD;
  protected readonly supply = signal(21.5);
  protected readonly load = signal(62);
  protected readonly battery = signal<number | null>(84);

  protected warmer(): void {
    this.supply.update((v) => (v >= 30 ? 10 : Math.round((v + 2.5) * 10) / 10));
  }

  protected busier(): void {
    this.load.update((v) => (v >= 100 ? 0 : v + 14));
  }

  protected drain(): void {
    this.battery.update((v) => (v === null ? 84 : v <= 10 ? null : v - 25));
  }
}
