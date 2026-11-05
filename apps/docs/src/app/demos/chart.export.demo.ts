import { Component, signal, viewChild } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctChart, PctLine } from '@pacit/components/chart';

const HOUR = 3_600_000;
/** Midnight in Warsaw on 28 October 2026. */
const START = Date.UTC(2026, 9, 27, 23);

/** Supply and return air every ten minutes through the day; the return sensor drops out at noon. */
const air = Array.from({ length: 24 * 6 + 1 }, (_, i) => {
  const hours = i / 6;
  const supply =
    Math.round((20 + 2.5 * Math.sin(((hours - 9) / 24) * 2 * Math.PI)) * 10) /
    10;
  return {
    at: START + hours * HOUR,
    supply,
    back:
      hours >= 12 && hours < 13 ? null : Math.round((supply + 1.5) * 10) / 10,
  };
});

/**
 * Export and a description
 *
 * `svg()` and `png()` draw the picture again as a file — the layers with their computed
 * colours, the chart's name as the title and its description inside. A chart with no
 * `description` describes its data in words of its own, read out by `describe()`.
 */
@Component({
  selector: 'demo-chart-export',
  imports: [PctButton, PctChart, PctLine],
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
        #chart
        ariaLabel="Air of the air handler on 28 October 2026"
        timeZone="Europe/Warsaw"
        style="height: 220px"
      >
        <pct-line [data]="air" x="at" y="supply" name="Supply" unit="°C" />
        <pct-line [data]="air" x="at" y="back" name="Return" unit="°C" />
      </pct-chart>
      <div>
        <button pctButton variant="soft" size="sm" (click)="saveSvg()">
          Save SVG
        </button>
        <button pctButton variant="soft" size="sm" (click)="savePng()">
          Save PNG
        </button>
        <button pctButton variant="ghost" size="sm" (click)="read()">
          Read the description
        </button>
      </div>
      <p>{{ words() }}</p>
    </section>
  `,
})
export class ChartExportDemo {
  protected readonly air = air;
  protected readonly words = signal('');
  private readonly chart = viewChild.required<PctChart>('chart');

  protected read(): void {
    this.words.set(this.chart().describe());
  }

  protected saveSvg(): void {
    const svg = this.chart().svg();
    if (svg) this.save(new Blob([svg], { type: 'image/svg+xml' }), 'air.svg');
  }

  protected async savePng(): Promise<void> {
    this.save(await this.chart().png(), 'air.png');
  }

  private save(blob: Blob, name: string): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}
