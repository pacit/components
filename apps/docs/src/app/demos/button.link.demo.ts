import { Component } from '@angular/core';
import { PctButton } from '@pacit/components/button';

/**
 * Links wearing the face
 *
 * A control that goes somewhere is an `<a>`, whatever it looks like: the middle click, the
 * address bar's preview and a crawler's road through the site all come with the element and
 * with nothing else. `pctButton` paints it and leaves the role alone — only the underline
 * goes, because the face answers a pointer with its own background. A disabled link is the
 * one thing HTML has no mechanism for, so the component says `aria-disabled` and refuses the
 * press itself.
 */
@Component({
  selector: 'demo-button-link',
  imports: [PctButton],
  styles:
    ':host { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }',
  template: `
    <a pctButton variant="hero" href="#start">Get started</a>
    <a pctButton variant="outline" href="#components">Browse components</a>
    <a pctButton variant="ghost" href="#changelog" disabled>Changelog</a>
  `,
})
export class ButtonLinkDemo {}
