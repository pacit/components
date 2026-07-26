import {
  afterNextRender,
  ApplicationRef,
  Component,
  inject,
} from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SbxControls } from './ui/controls';
import { SbxSettings } from './ui/settings';
import { SBX_VIEW_GROUPS, viewsOf } from './views';

/**
 * Powłoka sandboxa: nawigacja po widokach + globalne ustawienia osi
 * przekrojowych (motyw, skórka, wielkość).
 *
 * Motyw siedzi na hoście powłoki, a nie na `:root` — cała strona jest więc
 * takim samym scoped theme jak każda karta (wym-theme-4), a `:root` zostaje
 * czystym punktem odniesienia dla testów.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SbxControls],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '[attr.data-theme]': 'settings.scheme()',
    '[attr.data-skin]': 'settings.skin()',
  },
})
export class App {
  protected readonly settings = inject(SbxSettings);

  protected readonly groups = SBX_VIEW_GROUPS.map((group) => ({
    ...group,
    views: viewsOf(group.id),
  }));

  constructor() {
    const appRef = inject(ApplicationRef);

    // Znacznik „strona jest interaktywna" dla testów e2e. Do czasu hydracji
    // w DOM stoi HTML z serwera: da się w niego kliknąć i wpisać, ale nic tego
    // nie słucha, a hydracja i tak nadpisze wartość stanem z modelu. Odkąd
    // widoki ładują się leniwie, okno między „element widoczny" a „element
    // podłączony" trwa tyle, co pobranie chunka — dość, by test zdążył wejść
    // w środek (wym-real-30).
    afterNextRender(async () => {
      await appRef.whenStable();
      document.documentElement.setAttribute('data-sbx-ready', '');
    });
  }
}
