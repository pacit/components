import { Component, signal } from '@angular/core';
import { PctButton } from '@pacit/components/button';
import { PctSparkline } from '@pacit/components/sparkline';
import { SbxDemo } from '../../ui/demo';

interface Room {
  readonly id: string;
  readonly room: string;
  readonly hours: readonly (number | null)[];
}

/**
 * Sparklines: one series drawn small, where the values already stand beside it — a table's
 * row, a card. Worth looking at: the picture is an image named by its row's header and described
 * by its lowest, highest and last value, and nothing of it is a stop for the keyboard.
 */
@Component({
  selector: 'sbx-sparkline-view',
  imports: [SbxDemo, PctSparkline, PctButton],
  templateUrl: './sparkline-view.html',
  styleUrl: './sparkline-view.scss',
})
export class SparklineView {
  /** The last eight hours of three rooms, in kWh; the attic's meter missed an hour. */
  protected readonly rooms = signal<readonly Room[]>([
    {
      id: 'hall',
      room: 'Hall',
      hours: [1.2, 1.4, 1.1, 1.8, 2.2, 1.9, 1.6, 1.7],
    },
    {
      id: 'attic',
      room: 'Attic',
      hours: [0.4, 0.6, null, 0.9, 1.3, 1.1, 0.8, 0.7],
    },
    {
      id: 'kitchen',
      room: 'Kitchen',
      hours: [0.3, 0.2, 2.6, 0.4, 0.3, 3.1, 0.5, 0.4],
    },
  ]);
  /** A week of a meter's daily balance: what it sent back is below nought. */
  protected readonly balance = [4, 2, -1, 3, -2, 5, 1];
  /** The heater's state, hour by hour: on is one, off nought. */
  protected readonly heater = [0, 1, 1, 0, 1, 1, 1, 0, 0, 1];
  /** Nothing read yet. */
  protected readonly nothing: readonly (number | null)[] = [null, null];

  protected last(room: Room): string {
    const value = [...room.hours].reverse().find((v) => v !== null);
    return value === undefined ? '' : `${value} kWh`;
  }

  /** A new hour for every room: the series moves under the eye. */
  protected tick(): void {
    this.rooms.update((rooms) =>
      rooms.map((r, i) => ({
        ...r,
        hours: [
          ...r.hours.slice(1),
          Math.round((1 + i + Math.sin(r.hours.length + i)) * 10) / 10,
        ],
      })),
    );
  }
}
