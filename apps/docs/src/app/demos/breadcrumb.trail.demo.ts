import { Component } from '@angular/core';
import {
  PctBreadcrumb,
  PctCrumb,
  PctCrumbLink,
} from '@pacit/components/breadcrumb';

/**
 * A long way here
 *
 * The trail is an ordered list of links; only the last crumb carries `aria-current="page"`,
 * and it is a link like the others so the current page is reachable by keyboard too.
 */
@Component({
  selector: 'demo-breadcrumb-trail',
  imports: [PctBreadcrumb, PctCrumb, PctCrumbLink],
  styles: ':host { display: block; }',
  template: `
    <pct-breadcrumb ariaLabel="You are here">
      <pct-crumb><a pctCrumbLink href="#org">Northwind</a></pct-crumb>
      <pct-crumb><a pctCrumbLink href="#projects">Projects</a></pct-crumb>
      <pct-crumb><a pctCrumbLink href="#design">Design system</a></pct-crumb>
      <pct-crumb><a pctCrumbLink href="#tokens">Tokens</a></pct-crumb>
      <pct-crumb>
        <a pctCrumbLink href="#colour" aria-current="page">Colour</a>
      </pct-crumb>
    </pct-breadcrumb>
  `,
})
export class BreadcrumbTrailDemo {}
