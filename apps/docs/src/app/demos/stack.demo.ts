import { Component } from '@angular/core';
import { PctStack } from '@pacit/components/stack';

/** Vertical rhythm from the spacing scale — nobody hand-rolls margins between siblings. */
@Component({
  selector: 'demo-stack',
  imports: [PctStack],
  // A column shrink-wrapped by the stage is three words wide; the host gives the rhythm a
  // readable width and the stage centres it (lesson-146).
  styles:
    ':host { display: block; inline-size: min(100%, 22rem); } div { border: 1px solid var(--pct-border); border-radius: 8px; padding: 8px 12px; }',
  template: `
    <pct-stack gap="lg">
      <div>First</div>
      <div>Second</div>
      <div>Third</div>
    </pct-stack>
  `,
})
export class StackDemo {}
