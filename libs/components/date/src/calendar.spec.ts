import {
  Component,
  provideZonelessChangeDetection,
  signal,
  Type,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { providePctTexts } from '@pacit/components/core';

import { PctCalendar } from './calendar';
import { PctDay, pctToday } from './day';

const partOf = (f: ComponentFixture<unknown>, part: string) =>
  f.nativeElement.querySelector(`[data-pct-part="${part}"]`) as HTMLElement;

const partsOf = (f: ComponentFixture<unknown>, part: string) =>
  [
    ...f.nativeElement.querySelectorAll(`[data-pct-part="${part}"]`),
  ] as HTMLElement[];

const cursorOf = (f: ComponentFixture<unknown>) =>
  f.nativeElement.querySelector(
    '[data-pct-part="day"][tabindex="0"]',
  ) as HTMLElement;

async function render<T>(type: Type<T>) {
  const fixture = TestBed.createComponent(type);
  fixture.detectChanges();
  await fixture.whenStable();
  return fixture;
}

async function press(
  fixture: ComponentFixture<unknown>,
  key: string,
  init: KeyboardEventInit = {},
) {
  partOf(fixture, 'grid').dispatchEvent(
    new KeyboardEvent('keydown', { key, bubbles: true, ...init }),
  );
  fixture.detectChanges();
  await fixture.whenStable();
}

@Component({
  imports: [PctCalendar],
  template: `<pct-calendar
    [(value)]="value"
    [min]="min()"
    [max]="max()"
    [locale]="locale()"
    [firstDayOfWeek]="firstDayOfWeek()"
    [dateDisabled]="dateDisabled()"
    [disabled]="disabled()"
    (dayPicked)="picked.set($event)"
  />`,
})
class Host {
  readonly value = signal<PctDay | null>('2026-08-27');
  readonly min = signal<string | undefined>(undefined);
  readonly max = signal<string | undefined>(undefined);
  readonly locale = signal('en-GB');
  readonly firstDayOfWeek = signal(0);
  readonly dateDisabled = signal<((day: PctDay) => boolean) | null>(null);
  readonly disabled = signal(false);
  readonly picked = signal<PctDay | null>(null);
}

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
});

describe('PctCalendar — the grid', () => {
  it('draws six whole weeks and seven headings', async () => {
    const f = await render(Host);
    expect(partsOf(f, 'week')).toHaveLength(6);
    expect(partsOf(f, 'day')).toHaveLength(42);
    expect(partsOf(f, 'weekday')).toHaveLength(7);
  });

  it('names the month over it, in the locale it was given', async () => {
    const f = await render(Host);
    expect(partOf(f, 'caption').textContent?.trim()).toBe('August 2026');

    // Spanish rather than Polish: this repository measures itself for Polish words
    // (`req-project-language`), and what the case is about is the caption speaking whatever
    // language it was given.
    f.componentInstance.locale.set('es-ES');
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'caption').textContent?.trim()).toBe('agosto de 2026');
  });

  it('starts the week where the locale starts it, and where it is told to', async () => {
    const f = await render(Host);
    // en-GB: Monday.
    expect(partOf(f, 'weekday').textContent?.trim()).toContain('Monday');

    f.componentInstance.locale.set('en-US');
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'weekday').textContent?.trim()).toContain('Sunday');

    // The input wins over the locale — a consumer with a house rule about it.
    f.componentInstance.firstDayOfWeek.set(6);
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'weekday').textContent?.trim()).toContain('Saturday');
  });

  it('marks the chosen day and today with two different attributes', async () => {
    const f = await render(Host);
    const selected = partsOf(f, 'day').filter((d) =>
      d.hasAttribute('data-pct-chosen'),
    );
    expect(selected).toHaveLength(1);
    expect(selected[0].getAttribute('aria-selected')).toBe('true');
    expect(selected[0].textContent?.trim()).toBe('27');

    // Today is a different fact, and it is drawn where today is — which is not August 2026,
    // so the grid on that month carries none.
    const today = pctToday();
    const marked = partsOf(f, 'day').filter((d) =>
      d.hasAttribute('data-pct-today'),
    );
    expect(marked.length).toBe(today.startsWith('2026-08') ? 1 : 0);
    for (const cell of marked)
      expect(cell.getAttribute('aria-current')).toBe('date');
  });

  it('gives every cell the whole date as its name — `27` is not one', async () => {
    const f = await render(Host);
    const cell = partsOf(f, 'day').find(
      (d) => d.getAttribute('data-pct-chosen') !== null,
    );
    // Asserted by its pieces rather than as one string: the punctuation between them is
    // ICU's and differs between a browser and node, and what this case is about is that the
    // whole date is there.
    const name = cell?.getAttribute('aria-label') ?? '';
    expect(name).toContain('Thursday');
    expect(name).toContain('27 August 2026');
  });

  it('draws the days of the neighbouring months and says which they are', async () => {
    const f = await render(Host);
    const outside = partsOf(f, 'day').filter((d) =>
      d.hasAttribute('data-pct-outside'),
    );
    // August 2026 starts on a Saturday and has 31 days: five leading and six trailing.
    expect(outside).toHaveLength(11);
    expect(outside[0].getAttribute('aria-label')).toContain('July');
  });
});

describe('PctCalendar — the keyboard', () => {
  it('walks a day, a week, a month and a year', async () => {
    const f = await render(Host);
    expect(cursorOf(f).getAttribute('aria-label')).toContain('27 August 2026');

    await press(f, 'ArrowRight');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('28 August 2026');

    await press(f, 'ArrowDown');
    expect(cursorOf(f).getAttribute('aria-label')).toContain(
      '4 September 2026',
    );

    await press(f, 'ArrowUp');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('28 August 2026');

    await press(f, 'ArrowLeft');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('27 August 2026');

    await press(f, 'PageDown');
    expect(partOf(f, 'caption').textContent?.trim()).toBe('September 2026');

    await press(f, 'PageUp', { shiftKey: true });
    expect(partOf(f, 'caption').textContent?.trim()).toBe('September 2025');
  });

  it('goes to the ends of the week it is standing in, not of the row it is drawn in', async () => {
    const f = await render(Host);
    await press(f, 'Home');
    // 27 August 2026 is a Thursday; the week starts on Monday in en-GB.
    expect(cursorOf(f).getAttribute('aria-label')).toContain('24 August 2026');
    await press(f, 'End');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('30 August 2026');
  });

  it('does not move the value — a walk is not a choice', async () => {
    const f = await render(Host);
    await press(f, 'ArrowRight');
    await press(f, 'PageDown');
    expect(f.componentInstance.value()).toBe('2026-08-27');
    expect(f.componentInstance.picked()).toBeNull();
  });

  it('takes the day it is standing on with Enter and with the space bar', async () => {
    const f = await render(Host);
    await press(f, 'ArrowRight');
    await press(f, 'Enter');
    expect(f.componentInstance.value()).toBe('2026-08-28');
    expect(f.componentInstance.picked()).toBe('2026-08-28');

    await press(f, 'ArrowRight');
    await press(f, ' ');
    expect(f.componentInstance.value()).toBe('2026-08-29');
  });

  it('takes the CURSOR and not the cell the key landed on', async () => {
    // They are the same in every resting state and differ for exactly one frame: a move
    // writes the cursor and focus follows it after the render. A press sent in that window
    // reaches the cell being LEFT — measured in a browser, where it picked the day it had
    // just walked off.
    const f = await render(Host);
    const before = cursorOf(f);
    await press(f, 'ArrowRight');
    // The key is sent to the cell the cursor has left, which is what a race delivers.
    before.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.value()).toBe('2026-08-28');
  });

  it('is one tab stop, wherever the cursor stands', async () => {
    const f = await render(Host);
    const stops = partsOf(f, 'day').filter(
      (d) => d.getAttribute('tabindex') === '0',
    );
    expect(stops).toHaveLength(1);
    await press(f, 'ArrowRight');
    expect(
      partsOf(f, 'day').filter((d) => d.getAttribute('tabindex') === '0'),
    ).toHaveLength(1);
  });
});

describe('PctCalendar — the bounds and the holes in them', () => {
  it('clamps the walk to the bounds', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-08-26');
    f.componentInstance.max.set('2026-08-28');
    f.detectChanges();
    await f.whenStable();

    await press(f, 'ArrowLeft');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('26 August');
    await press(f, 'ArrowLeft');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('26 August');

    await press(f, 'PageDown');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('28 August');
  });

  it('marks the days outside the bounds and refuses a press on them', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-08-10');
    f.componentInstance.max.set('2026-08-20');
    f.detectChanges();
    await f.whenStable();

    const disabled = partsOf(f, 'day').filter((d) =>
      d.hasAttribute('data-pct-disabled'),
    );
    expect(disabled).toHaveLength(42 - 11);
    expect(disabled[0].getAttribute('aria-disabled')).toBe('true');

    disabled[0].click();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.value()).toBe('2026-08-27');
  });

  it('stops the nav button that would leave the bounds', async () => {
    const f = await render(Host);
    f.componentInstance.min.set('2026-08-01');
    f.componentInstance.max.set('2026-08-31');
    f.detectChanges();
    await f.whenStable();
    const [back, forward] = partsOf(f, 'nav') as HTMLButtonElement[];
    expect(back.disabled).toBe(true);
    expect(forward.disabled).toBe(true);
  });

  it('refuses a day a predicate refuses, and leaves the walk over it', async () => {
    const f = await render(Host);
    // Every Saturday and Sunday.
    f.componentInstance.dateDisabled.set((day) => {
      const at = new Date(`${day}T00:00:00Z`).getUTCDay();
      return at === 0 || at === 6;
    });
    f.detectChanges();
    await f.whenStable();

    const refused = partsOf(f, 'day').filter((d) =>
      d.hasAttribute('data-pct-disabled'),
    );
    expect(refused).toHaveLength(12);

    refused[0].click();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.value()).toBe('2026-08-27');

    // The bounds clamp the walk; a hole in them does not — the cursor reaches a refused day,
    // announces it, and simply cannot take it.
    await press(f, 'ArrowRight');
    await press(f, 'ArrowRight');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('29 August');
    expect(cursorOf(f).hasAttribute('data-pct-disabled')).toBe(true);
  });
});

describe('PctCalendar — the nav and the disabled state', () => {
  it('names both buttons from the texts channel', async () => {
    // The names are the only thing a reader has to tell the two apart by — the drawing is one
    // chevron turned a quarter each way — so their VALUE is asserted here. `check-aria` sees
    // that a name exists; only a case sees what it says.
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        providePctTexts({
          datePreviousMonth: 'Mois précédent',
          dateNextMonth: 'Mois suivant',
        }),
      ],
    });
    const f = await render(Host);
    const [back, forward] = partsOf(f, 'nav');
    expect(back.getAttribute('aria-label')).toBe('Mois précédent');
    expect(forward.getAttribute('aria-label')).toBe('Mois suivant');
  });

  it('falls back to the library defaults when nothing translates them', async () => {
    const f = await render(Host);
    const [back, forward] = partsOf(f, 'nav');
    expect(back.getAttribute('aria-label')).toBe('Previous month');
    expect(forward.getAttribute('aria-label')).toBe('Next month');
  });

  it('steps the month and carries the cursor with it', async () => {
    const f = await render(Host);
    const [back, forward] = partsOf(f, 'nav') as HTMLButtonElement[];
    forward.click();
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'caption').textContent?.trim()).toBe('September 2026');

    back.click();
    back.click();
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'caption').textContent?.trim()).toBe('July 2026');
  });

  it('takes nothing while disabled', async () => {
    const f = await render(Host);
    f.componentInstance.disabled.set(true);
    f.detectChanges();
    await f.whenStable();

    expect(partOf(f, 'grid').getAttribute('aria-disabled')).toBe('true');
    for (const button of partsOf(f, 'nav') as HTMLButtonElement[])
      expect(button.disabled).toBe(true);

    await press(f, 'ArrowRight');
    expect(cursorOf(f).getAttribute('aria-label')).toContain('27 August');

    cursorOf(f).click();
    f.detectChanges();
    await f.whenStable();
    expect(f.componentInstance.picked()).toBeNull();
  });

  it('starts on today when there is no value, held inside the bounds', async () => {
    const f = await render(Host);
    f.componentInstance.value.set(null);
    f.detectChanges();
    await f.whenStable();
    expect(cursorOf(f)).not.toBeNull();
    expect(
      partsOf(f, 'day').filter((d) => d.hasAttribute('data-pct-chosen')),
    ).toHaveLength(0);

    f.componentInstance.min.set('2030-05-10');
    f.detectChanges();
    await f.whenStable();
    expect(partOf(f, 'caption').textContent?.trim()).toBe('May 2030');
  });

  it('ignores a value the interop wrote that is not a day', async () => {
    const f = await render(Host);
    // `lesson-117`: the bridge writes what the model's type forbids and nothing reports it.
    f.componentInstance.value.set('' as PctDay);
    f.detectChanges();
    await f.whenStable();
    expect(
      partsOf(f, 'day').filter((d) => d.hasAttribute('data-pct-chosen')),
    ).toHaveLength(0);
    expect(cursorOf(f)).not.toBeNull();
  });
});
