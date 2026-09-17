#!/usr/bin/env python3
"""The keyboard of the headless compositor the reader pass runs on (position 4.73).

`gnome-shell --headless` brings a virtual monitor and no input device at all, and a seat
without a keyboard never sends `wl_keyboard.enter`: mutter names the browser's window as
its focus window, the browser never learns it, never announces `window:activate`, and Orca —
which follows the active window and nothing else — keeps its default script and says
nothing about the page. Measured on 2026-09-17: the same walk, the same reader, `0` phrases
about the page without this and a reading with it (lesson-224).

The keyboard comes through mutter's own remote-desktop interface: a session, started, and
one press-and-release of a key that types nothing (Shift alone) — the first key is what makes
mutter create the virtual device. The session lives as long as this process, which is why it
stays in a loop rather than exiting: a closed session takes its devices with it.

Usage: python3 tools/at-seat.py   (on the throwaway session bus of tools/at-pass.sh)
"""

import time

import gi

gi.require_version("Gio", "2.0")
from gi.repository import Gio, GLib  # noqa: E402

KEY_LEFTSHIFT = 42  # evdev keycode; a Shift alone types nothing into the focused window

bus = Gio.bus_get_sync(Gio.BusType.SESSION, None)
remote_desktop = Gio.DBusProxy.new_sync(
    bus,
    Gio.DBusProxyFlags.NONE,
    None,
    "org.gnome.Mutter.RemoteDesktop",
    "/org/gnome/Mutter/RemoteDesktop",
    "org.gnome.Mutter.RemoteDesktop",
    None,
)
# The Wayland socket is there before the name is: a helper started the moment the socket
# appeared found "org.gnome.Mutter.RemoteDesktop was not provided by any .service files", and
# the pass that followed had a seat with no keyboard. So the name is waited for, up to 30 s.
path = None
for attempt in range(60):
    try:
        path = remote_desktop.call_sync("CreateSession", None, Gio.DBusCallFlags.NONE, -1, None).unpack()[0]
        break
    except GLib.GError as error:
        if "ServiceUnknown" not in str(error) or attempt == 59:
            raise
        time.sleep(0.5)
session = Gio.DBusProxy.new_sync(
    bus,
    Gio.DBusProxyFlags.NONE,
    None,
    "org.gnome.Mutter.RemoteDesktop",
    path,
    "org.gnome.Mutter.RemoteDesktop.Session",
    None,
)
session.call_sync("Start", None, Gio.DBusCallFlags.NONE, -1, None)
for pressed in (True, False):
    session.call_sync(
        "NotifyKeyboardKeycode",
        GLib.Variant("(ub)", (KEY_LEFTSHIFT, pressed)),
        Gio.DBusCallFlags.NONE,
        -1,
        None,
    )
print(f"the seat has a keyboard: remote-desktop session {path}", flush=True)
GLib.MainLoop().run()
