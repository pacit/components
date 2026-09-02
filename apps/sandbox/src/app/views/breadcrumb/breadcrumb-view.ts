import { Component } from '@angular/core';
import {
  PctBreadcrumb,
  PctCrumb,
  PctCrumbLink,
} from '@pacit/components/breadcrumb';
import { SbxDemo } from '../../ui/demo';

/**
 * Breadcrumb: the way here, told in links. What is worth watching: the anchors are the
 * view's own `<a href>` (the component generates none), `aria-current` is written by the
 * consumer and only styled by the library, and the separator is a drawing nobody hears —
 * every name beside it stays clean. Each trail is its own named landmark, so three demos
 * are three names.
 */
@Component({
  selector: 'sbx-breadcrumb-view',
  imports: [SbxDemo, PctBreadcrumb, PctCrumb, PctCrumbLink],
  templateUrl: './breadcrumb-view.html',
  styleUrl: './breadcrumb-view.scss',
})
export class BreadcrumbView {}
