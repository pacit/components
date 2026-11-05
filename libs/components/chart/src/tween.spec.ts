import { Component, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import type { PctColumns } from './model/columns';
import { pctTweened } from './tween';

const of = (xs: number[], ys: number[]): PctColumns => ({
  xs: Float64Array.from(xs),
  ys: Float64Array.from(ys),
  length: xs.length,
});

@Component({ selector: 'pct-tween-host', template: '' })
class Host {
  readonly readings = signal(of([0, 1], [0, 10]));
  readonly animate = signal(true);
  readonly drawn: Signal<PctColumns> = pctTweened(this.readings, this.animate);
}

describe('pctTweened', () => {
  let progress: number | null;
  let state: AnimationPlayState;
  let frames: FrameRequestCallback[];
  let made: { duration: unknown; easing: unknown; fill: unknown }[];
  let cancelled: number;

  function setup(duration = '150ms', easing = 'linear') {
    const fixture = TestBed.createComponent(Host);
    const host = fixture.nativeElement as HTMLElement;
    host.style.setProperty('--pct-motion-transition-duration', duration);
    host.style.setProperty('--pct-motion-transition-easing', easing);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  const ys = (c: PctColumns) => [...c.ys.subarray(0, c.length)];
  // A frame runs whatever waits for it: Angular's scheduler asks for frames too.
  const frame = () => frames.splice(0).forEach((callback) => callback(0));

  beforeEach(() => {
    progress = 0;
    state = 'running';
    frames = [];
    made = [];
    cancelled = 0;
    // jsdom runs no animations: the browser's timing, stood in for here
    vi.stubGlobal(
      'KeyframeEffect',
      class {
        constructor(
          _: unknown,
          __: unknown,
          options: { duration: unknown; easing?: unknown; fill: unknown },
        ) {
          if (options.easing === 'nonsense') throw new TypeError('bad easing');
          made.push({
            duration: options.duration,
            easing: options.easing,
            fill: options.fill,
          });
        }
        getComputedTiming() {
          return { progress };
        }
      },
    );
    vi.stubGlobal(
      'Animation',
      class {
        play() {
          // runs on the stubbed progress
        }
        cancel() {
          cancelled++;
        }
        get playState() {
          return state;
        }
      },
    );
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback);
        return frames.length;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
  });

  afterEach(() => vi.unstubAllGlobals());

  it('eases values that moved, frame by frame, at twice the transition and its easing', () => {
    const host = setup('150ms', 'ease-out');
    const from = host.drawn();
    host.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    expect(host.drawn()).toBe(from);
    expect(made).toEqual([
      { duration: 300, easing: 'ease-out', fill: 'forwards' },
    ]);
    progress = 0.5;
    frame();
    expect(ys(host.drawn())).toEqual([5, 20]);
    state = 'finished';
    frame();
    expect(host.drawn()).toBe(host.readings());
    // and asks for no frame after it
    progress = 0.25;
    frame();
    expect(host.drawn()).toBe(host.readings());
  });

  it('reads a transition written in seconds', () => {
    const host = setup('0.2s');
    host.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    expect(made[0].duration).toBe(400);
  });

  it('reads tokens around their spaces, and the easing of CSS when there is none', () => {
    const host = setup(' 150ms ', ' steps(2) ');
    host.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    const plain = setup('150ms', '');
    plain.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    expect(made).toEqual([
      { duration: 300, easing: 'steps(2)', fill: 'forwards' },
      { duration: 300, easing: 'ease', fill: 'forwards' },
    ]);
  });

  it('eases a way of a millisecond, the shortest there is to see', () => {
    const host = setup('0.5ms');
    host.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    expect(made).toEqual([{ duration: 1, easing: 'linear', fill: 'forwards' }]);
  });

  it('takes up a change on the way from where it stands', () => {
    const host = setup();
    host.readings.set(of([0, 1], [10, 30]));
    TestBed.tick();
    progress = 0.5;
    frame();
    host.readings.set(of([0, 1], [20, 40]));
    TestBed.tick();
    expect(cancelled).toBe(1);
    progress = 0.5;
    frame();
    // from 5, 20 halfway to 20, 40
    expect(ys(host.drawn())).toEqual([12.5, 30]);
  });

  it('draws at once readings added, a scene that does not animate, and no motion', () => {
    const host = setup();
    host.readings.set(of([0, 1, 2], [1, 2, 3]));
    TestBed.tick();
    expect(host.drawn()).toBe(host.readings());
    host.animate.set(false);
    host.readings.set(of([0, 1, 2], [4, 5, 6]));
    TestBed.tick();
    expect(host.drawn()).toBe(host.readings());
    expect(made).toHaveLength(0);
    const still = setup('0.01ms');
    still.readings.set(of([0, 1], [4, 5]));
    TestBed.tick();
    expect(still.drawn()).toBe(still.readings());
    const unread = setup('none');
    unread.readings.set(of([0, 1], [4, 5]));
    TestBed.tick();
    expect(unread.drawn()).toBe(unread.readings());
    expect(made).toHaveLength(0);
  });

  it('draws at once where the browser runs no animations', () => {
    vi.stubGlobal('KeyframeEffect', undefined);
    const host = setup();
    host.readings.set(of([0, 1], [3, 4]));
    TestBed.tick();
    expect(host.drawn()).toBe(host.readings());
  });

  it('falls back to the default easing for one the browser does not read', () => {
    const host = setup('150ms', 'nonsense');
    host.readings.set(of([0, 1], [3, 4]));
    TestBed.tick();
    expect(made).toEqual([
      { duration: 300, easing: undefined, fill: 'forwards' },
    ]);
  });

  it('stops its frame and its timing when the mark goes', () => {
    const fixture = TestBed.createComponent(Host);
    (fixture.nativeElement as HTMLElement).style.setProperty(
      '--pct-motion-transition-duration',
      '150ms',
    );
    fixture.detectChanges();
    fixture.componentInstance.readings.set(of([0, 1], [3, 4]));
    TestBed.tick();
    fixture.destroy();
    expect(cancelled).toBe(1);
    expect(cancelAnimationFrame).toHaveBeenCalledWith(1);
  });
});
