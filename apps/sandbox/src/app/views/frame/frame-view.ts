import { NgTemplateOutlet } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PctButton } from '@pacit/components/button';
import {
  PctDescription,
  PctDescriptionList,
} from '@pacit/components/description';
import { PctDrawer, PctDrawerTrigger } from '@pacit/components/drawer';
import { PctIcon } from '@pacit/components/icon';
import { PctNav, PctNavItem, PctNavLink } from '@pacit/components/nav';
import { PctSwitch } from '@pacit/components/switch';
import { PctTopbar, PctTopbarTitle } from '@pacit/components/topbar';
import { SbxDemo } from '../../ui/demo';

interface Screen {
  readonly id: string;
  readonly title: string;
}

/**
 * The application's breakpoint, the one place a width is named: the application's own, read
 * after the first render so the server's markup and the client's first one agree (a branch
 * the server never took would be a hydration mismatch).
 */
const WIDE = '(min-width: 64rem)';

/**
 * An application's frame: a top bar, a navigation and a description list, arranged by the
 * view and not by the library. What is worth watching: at a wide window the navigation stands
 * in a column at the side; at a narrow one the view moves the same navigation into a drawer and
 * puts the button that opens it at the start of the bar — the library picks no width (0110).
 */
@Component({
  selector: 'sbx-frame-view',
  imports: [
    SbxDemo,
    NgTemplateOutlet,
    RouterLink,
    PctButton,
    PctDescription,
    PctDescriptionList,
    PctDrawer,
    PctDrawerTrigger,
    PctIcon,
    PctNav,
    PctNavItem,
    PctNavLink,
    PctSwitch,
    PctTopbar,
    PctTopbarTitle,
  ],
  templateUrl: './frame-view.html',
  styleUrl: './frame-view.scss',
})
export class FrameView {
  protected readonly screens: readonly Screen[] = [
    { id: 'rooms', title: 'Rooms' },
    { id: 'devices', title: 'Devices' },
    { id: 'energy', title: 'Energy' },
    { id: 'settings', title: 'Settings' },
  ];

  protected readonly currentId = signal('devices');
  protected readonly current = computed(
    () =>
      this.screens.find((s) => s.id === this.currentId()) ?? this.screens[0],
  );
  /** Wide on the server and on the first render; the window answers after it. */
  protected readonly wide = signal(true);
  protected readonly heating = signal(true);
  protected readonly signedOut = signal(false);

  private readonly drawer = viewChild.required<PctDrawer>('menu');
  private readonly menuButton = viewChild('menuButton', {
    read: ElementRef<HTMLElement>,
  });
  private readonly side = viewChild<ElementRef<HTMLElement>>('side');
  private readonly injector = inject(Injector);

  constructor() {
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const query = matchMedia(WIDE);
      const sync = () => {
        // Widening: the drawer's content is about to go, so the drawer shuts first — an open
        // panel with nothing in it and no button would stay — and gives the keyboard back to
        // its button while the button still stands; the column then takes the navigation.
        if (query.matches) this.drawer().close('api');
        // Narrowing: the column is about to go with the focus in it, so the keyboard is
        // handed to the button that now opens the navigation, once it stands.
        const held = this.side()?.nativeElement.contains(
          document.activeElement,
        );
        this.wide.set(query.matches);
        if (held)
          afterNextRender(() => this.menuButton()?.nativeElement.focus(), {
            injector: this.injector,
          });
      };
      sync();
      query.addEventListener('change', sync);
      destroyRef.onDestroy(() => query.removeEventListener('change', sync));
    });
  }

  /** A screen chosen: it becomes the current one, and a drawer it was chosen in shuts. */
  protected go(screen: Screen, drawer: PctDrawer): void {
    this.currentId.set(screen.id);
    drawer.close('api');
  }
}
