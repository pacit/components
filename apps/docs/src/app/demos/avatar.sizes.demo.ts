import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';

/**
 * Sizes, and what fills them
 *
 * A `name` becomes initials; a `src` becomes the picture; neither becomes a silhouette.
 * The three sizes ride the library's own axis, so an avatar beside a field lines up.
 */
@Component({
  selector: 'demo-avatar-sizes',
  imports: [PctAvatar],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-avatar name="Ada Lovelace" size="sm" />
    <pct-avatar name="Grace Hopper" />
    <pct-avatar name="Margaret Hamilton" size="lg" />
    <pct-avatar size="lg" />
  `,
})
export class AvatarSizesDemo {}
