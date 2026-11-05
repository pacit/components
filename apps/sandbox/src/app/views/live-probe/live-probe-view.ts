import {
  afterNextRender,
  Component,
  inject,
  Injector,
  OnDestroy,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { PctChart, PctLine, PctWindow } from '@pacit/components/chart';

interface Reading {
  readonly at: number;
  readonly value: number;
}

/** Probe (0121, never merged): live readings appended to eight long series under `follow`. */
@Component({
  selector: 'sbx-live-probe-view',
  imports: [PctChart, PctLine],
  template: `
    <pct-chart
      ariaLabel="Live probe"
      timeZone="Europe/Warsaw"
      locale="en-GB"
      follow
      [(window)]="window"
      style="display:block;inline-size:900px;block-size:400px"
      data-testid="chart-live"
    >
      @for (s of series; track $index) {
        <pct-line [data]="s()" x="at" y="value" [name]="'S' + $index" unit="W" />
      }
    </pct-chart>
  `,
})
export class LiveProbeView implements OnDestroy {
  private readonly injector = inject(Injector);
  private readonly browser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly params = new URLSearchParams(
    inject(DOCUMENT).location?.search ?? '',
  );
  private readonly count = Number(this.params.get('series') ?? 8);
  private readonly points = Number(this.params.get('points') ?? 60000);
  private readonly rate = Number(this.params.get('rate') ?? 10);
  private readonly mode = this.params.get('mode') ?? 'set';
  private readonly spanMs = Number(this.params.get('span') ?? 600) * 1000;
  private readonly start = Date.now();
  protected readonly series = Array.from({ length: this.count }, (_, s) =>
    signal<readonly Reading[]>(
      Array.from({ length: this.browser ? this.points : 0 }, (_, i) => ({
        at: this.start - (this.points - i) * 1000,
        value: 500 + 300 * Math.sin(i / 300 + s),
      })),
    ),
  );
  protected readonly window = signal<PctWindow | null>({
    from: this.start - this.spanMs,
    to: this.start,
  });
  private timer: ReturnType<typeof setInterval> | undefined;
  private n = 0;
  readonly results = {
    build: [] as number[],
    render: [] as number[],
    frames: [] as number[],
    heapStart: 0,
    heapEnd: 0,
  };

  constructor() {
    (globalThis as unknown as { __probe: LiveProbeView }).__probe = this;
  }

  run(seconds: number): Promise<void> {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number } })
      .memory;
    this.results.heapStart = memory?.usedJSHeapSize ?? 0;
    let last = performance.now();
    let running = true;
    const frame = (t: number) => {
      this.results.frames.push(t - last);
      last = t;
      if (running) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    if (this.mode !== 'idle')
      this.timer = setInterval(() => this.tick(), 1000 / this.rate);
    return new Promise((resolve) =>
      setTimeout(() => {
        clearInterval(this.timer);
        running = false;
        this.results.heapEnd = memory?.usedJSHeapSize ?? 0;
        resolve();
      }, seconds * 1000),
    );
  }

  private tick(): void {
    const t0 = performance.now();
    const at = Date.now();
    this.n++;
    for (let s = 0; s < this.series.length; s++) {
      const value = 500 + 300 * Math.sin((this.points + this.n) / 300 + s);
      this.series[s].update((rows) => [...rows.slice(1), { at, value }]);
    }
    const t1 = performance.now();
    this.results.build.push(t1 - t0);
    afterNextRender(() => this.results.render.push(performance.now() - t1), {
      injector: this.injector,
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
