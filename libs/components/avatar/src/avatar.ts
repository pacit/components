import {
  Component,
  computed,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { PCT_CONFIG, PctSize } from '@pacit/components/core';
import { PctIcon } from '@pacit/components/icon';

/**
 * An avatar: the picture beside a name — and never the name itself.
 *
 * **There is no ARIA pattern for it, because it is decoration, all the way down.** The host
 * is `aria-hidden="true"` outright — the third component in the library after `pct-icon`
 * and `pct-skeleton` — because where an avatar stands the name is already text a reader
 * says, and a second announcement is noise
 * ([0052](../../../../docs/decisions/0052-an-avatar-is-a-picture-beside-a-name.md)). The
 * consequence is a rule, not a hedge: an avatar is never the only carrier of a name. A
 * control that shows nothing else names itself:
 *
 * @example
 * <button pctButton [attr.aria-label]="'Account: ' + user().name">
 *   <pct-avatar [name]="user().name" [src]="user().photo" />
 * </button>
 *
 * **What it draws is a chain whose every link was measured**: the image while `src` is
 * given and alive; the initials the moment the platform's `error` says it is not (a 404
 * fires it in all three engines, and so does `src=""` — which is why an empty `src` is
 * never bound at all); the silhouette when there is no name to take initials from. A new
 * `src` re-arms the chain, so swapping the picture retries the image instead of
 * remembering the last failure forever.
 */
@Component({
  selector: 'pct-avatar',
  imports: [PctIcon],
  templateUrl: './avatar.html',
  styleUrl: './avatar.scss',
  host: {
    class: 'pct-avatar',
    // Decoration beside the meaning, like the icon it may fall back to drawing. Nothing
    // below it can take focus and the one image is `alt=""`, so hiding the subtree costs a
    // reader nothing and saves them hearing a name twice (`req-a11y-built-in`, 0052).
    'aria-hidden': 'true',
    '[attr.data-pct-size]': 'size()',
  },
})
export class PctAvatar {
  private readonly config = inject(PCT_CONFIG);

  /**
   * The name the initials are taken from. It is a SOURCE FOR A DRAWING, not an accessible
   * name — the host is hidden, and the name a user hears belongs to the text or the
   * control beside the picture (0052).
   */
  readonly name = input<string>('');

  /** The picture's URL. Empty means none — the initials (or the silhouette) stand instead. */
  readonly src = input<string>('');

  /** Size on the shared control axis; from the global configuration by default. */
  readonly size = input<PctSize>(this.config.defaultSize);

  /**
   * Whether the given `src` has failed. Derived FROM the input rather than kept beside it:
   * a new `src` resets it to false by construction, so the chain re-arms on every swap and
   * a failure is remembered exactly as long as the URL that caused it.
   */
  protected readonly broken = linkedSignal<string, boolean>({
    source: this.src,
    computation: () => false,
  });

  /** The image is shown while there is a picture to try — a live `src` nobody saw fail. */
  protected readonly showsImage = computed(
    () => this.src() !== '' && !this.broken(),
  );

  /**
   * First grapheme of the first word, first grapheme of the last — one alone for a
   * one-word name. Graphemes and not `charAt`, off the platform's own segmenter: measured,
   * `charAt` would cut an emoji family or a flag into a broken surrogate half, while the
   * segmenter returns 👩‍👩‍👧, 🇵🇱, आ and 李 whole in all three engines (0052). Not
   * uppercased: without a locale the transform answers with the machine's, and the
   * component would be guessing between `i → I` and `i → İ` on every Turkish name — what
   * the consumer wrote is what is drawn.
   */
  protected readonly initials = computed(() => {
    // One mechanism, not two: `filter(Boolean)` alone is the whole definition of a word —
    // a non-empty piece — and it absorbs leading, trailing and doubled whitespace alike.
    // The first cut had `trim()` BESIDE it, and the mutation run showed what redundancy is
    // made of: either guard could be deleted with the other covering, so neither was
    // observable.
    const words = this.name().split(/\s+/).filter(Boolean);
    if (words.length === 0) return '';
    const first = firstGrapheme(words[0]);
    return words.length === 1
      ? first
      : first + firstGrapheme(words[words.length - 1]);
  });

  protected fail(): void {
    this.broken.set(true);
  }
}

/** The first grapheme of a word — the whole family, flag or matra, never half a pair. */
function firstGrapheme(word: string): string {
  const segments = new Intl.Segmenter(undefined, {
    granularity: 'grapheme',
  }).segment(word);
  for (const { segment } of segments) return segment;
  return '';
}
