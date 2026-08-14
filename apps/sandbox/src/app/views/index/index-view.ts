import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SBX_VIEW_GROUPS, viewsOf } from '../../views';

/** The index page — the list of views straight from the registry (`views.ts`). */
@Component({
  selector: 'sbx-index-view',
  imports: [RouterLink],
  templateUrl: './index-view.html',
  styleUrl: './index-view.scss',
})
export class IndexView {
  protected readonly groups = SBX_VIEW_GROUPS.map((group) => ({
    ...group,
    // Without the index page itself — it does not link to itself.
    views: viewsOf(group.id).filter((v) => v.path !== ''),
  }));
}
