import { Component, signal } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';
import { PctButton } from '@pacit/components/button';
import { SbxDemo } from '../../ui/demo';

/**
 * Avatar: the picture beside a name, and never the name itself. What is worth watching is
 * the chain — image, initials, silhouette, exactly one standing — and that the dead-image
 * demo breaks over a REAL network answer: the `src` below points nowhere, the platform's
 * `error` fires, and the initials stand up with no code of the page's involved.
 */
@Component({
  selector: 'sbx-avatar-view',
  imports: [SbxDemo, PctAvatar, PctButton],
  templateUrl: './avatar-view.html',
  styleUrl: './avatar-view.scss',
})
export class AvatarView {
  /** A picture that exists: a drawing carried by the page itself, no network involved. */
  protected readonly photo = PHOTO;

  /** Swapped by the retry demo: a dead URL, then a live one — the chain re-arms. */
  protected readonly source = signal(DEAD);

  protected retry(): void {
    this.source.update((current) => (current === DEAD ? PHOTO : DEAD));
  }

  /** The five scripts of the probe (0052) — every one a value `charAt` would cut. */
  protected readonly names = [
    'Ada Lovelace',
    'Øyvind',
    '👩‍👩‍👧 Team',
    'आर्या शर्मा',
    '李小龙',
  ];
}

const DEAD = '/definitely-not-here.png';

const PHOTO =
  'data:image/svg+xml,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
      `<rect width="64" height="64" fill="#4a5d7e"/>` +
      `<circle cx="32" cy="24" r="11" fill="#e8edf5"/>` +
      `<path d="M10 58c3-13 12-19 22-19s19 6 22 19z" fill="#e8edf5"/>` +
      `</svg>`,
  );
