import { Component } from '@angular/core';
import {
  PctBreadcrumb,
  PctCrumb,
  PctCrumbLink,
} from '@pacit/components/breadcrumb';

/** A trail of real links; the current page says so with `aria-current`. */
@Component({
  selector: 'demo-breadcrumb',
  imports: [PctBreadcrumb, PctCrumb, PctCrumbLink],
  template: `
    <pct-breadcrumb ariaLabel="You are here">
      <pct-crumb><a pctCrumbLink href="#home">Home</a></pct-crumb>
      <pct-crumb><a pctCrumbLink href="#library">Library</a></pct-crumb>
      <pct-crumb>
        <a pctCrumbLink href="#data" aria-current="page">Data</a>
      </pct-crumb>
    </pct-breadcrumb>
  `,
})
export class BreadcrumbDemo {}
