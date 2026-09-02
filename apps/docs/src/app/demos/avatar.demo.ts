import { Component } from '@angular/core';
import { PctAvatar } from '@pacit/components/avatar';

/** A name becomes initials; a portrait takes over when you hand one in via `src`. */
@Component({
  selector: 'demo-avatar',
  imports: [PctAvatar],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <pct-avatar name="Ada Lovelace" size="sm" />
    <pct-avatar name="Grace Hopper" />
    <pct-avatar name="Margaret Hamilton" size="lg" />
  `,
})
export class AvatarDemo {}
