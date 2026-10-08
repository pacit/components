import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { PctField } from '@pacit/components/field';
import { PctTime, PctTimeColumns, PctTimeOfDay } from '@pacit/components/time';
import { SbxDemo } from '../../ui/demo';

/**
 * Time: a text field the library formats and parses per locale, with columns of hours and
 * minutes in a panel beside it — and a value that is a wall-clock time rather than an instant.
 */
@Component({
  selector: 'sbx-time-view',
  imports: [SbxDemo, PctTime, PctTimeColumns, PctField, FormField],
  templateUrl: './time-view.html',
  styleUrl: './time-view.scss',
})
export class TimeView {
  protected readonly model = signal<{ startsAt: PctTimeOfDay | null }>({
    startsAt: '09:30',
  });

  protected readonly meetingForm = form(this.model, (p) => {
    required(p.startsAt, { message: 'Pick the time it starts' });
  });

  protected readonly time = signal<PctTimeOfDay | null>('13:05');
  protected readonly american = signal<PctTimeOfDay | null>('13:05');
  protected readonly polish = signal<PctTimeOfDay | null>('13:05');
  protected readonly korean = signal<PctTimeOfDay | null>('13:05');
  protected readonly quarter = signal<PctTimeOfDay | null>('13:15');
  protected readonly precise = signal<PctTimeOfDay | null>('13:05:30');
  protected readonly office = signal<PctTimeOfDay | null>('13:00');
  protected readonly night = signal<PctTimeOfDay | null>('23:30');
  protected readonly inline = signal<PctTimeOfDay | null>('13:05');

  /**
   * The thirty-eight locales 0086 measured the hour cycle over (C1), for the round trip the e2e
   * suite reads in each engine's own `Intl` — node's is not the browsers' (0086, D4 and C5).
   */
  protected readonly sweepLocales = [
    'en-US',
    'en-GB',
    'pl-PL',
    'de-DE',
    'fr-FR',
    'fi-FI',
    'da-DK',
    'ja-JP',
    'ko-KR',
    'zh-CN',
    'ar-EG',
    'hi-IN',
    'th-TH',
    'my-MM',
    'fa-IR',
    'he-IL',
    'zh-TW',
    'en-IN',
    'en-CA',
    'fr-CA',
    'es-ES',
    'es-MX',
    'pt-BR',
    'ru-RU',
    'tr-TR',
    'vi-VN',
    'bn-BD',
    'mr-IN',
    'ta-IN',
    'ur-PK',
    'nb-NO',
    'sv-SE',
    'it-IT',
    'nl-NL',
    'el-GR',
    'en-AU',
    'ne-NP',
    'ar-SA',
  ];

  protected readonly sweepLocale = signal('en-US');
  protected readonly sweep = signal<PctTimeOfDay | null>('19:58:39');

  protected pickLocale(event: Event): void {
    this.sweepLocale.set((event.target as HTMLSelectElement).value);
  }

  protected readonly errors = [
    { kind: 'demo', message: 'Not inside office hours' },
  ];
}
