import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SBX_VIEW_GROUPS, viewsOf } from '../../views';

/** Strona wejściowa — spis widoków prosto z rejestru (`views.ts`). */
@Component({
  selector: 'sbx-index-view',
  imports: [RouterLink],
  templateUrl: './index-view.html',
  styleUrl: './index-view.scss',
})
export class IndexView {
  protected readonly groups = SBX_VIEW_GROUPS.map((group) => ({
    ...group,
    // Bez samej strony wejściowej — nie linkuje się do siebie.
    views: viewsOf(group.id).filter((v) => v.path !== ''),
  }));
}
