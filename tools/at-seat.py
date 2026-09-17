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

import json
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
        if "ServiceUnknown" not in error.message or attempt == 59:
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

# The compositor's own account of the windows, every two seconds: which exist, which has the
# focus. On a desktop the browser's window is focused as it maps; the first run on a runner
# mapped it and withheld the focus, and a window without the focus never hears
# `wl_keyboard.enter` — so the reader never heard of it (lesson-224). When a window stands
# unfocused, the compositor is told to activate it, which is what a click would have done.
# `org.gnome.Shell.Eval` answers only in unsafe mode; the pass starts the shell with it, on
# a throwaway bus nobody else can reach.
shell = Gio.DBusProxy.new_sync(
    bus, Gio.DBusProxyFlags.NONE, None, "org.gnome.Shell", "/org/gnome/Shell", "org.gnome.Shell", None
)


def ask(code):
    ok, result = shell.call_sync("Eval", GLib.Variant("(s)", (code,)), Gio.DBusCallFlags.NONE, -1, None).unpack()
    return result if ok else None


ACCOUNT = "JSON.stringify(global.display.list_all_windows().map(w => [w.get_title(), w.has_focus()]))"
ACTIVATE = "const w = global.display.list_all_windows()[0]; w.activate(global.get_current_time()); w.get_title()"
nudged = 0
for _ in range(90):
    time.sleep(2)
    raw = ask(ACCOUNT)
    if raw is None:
        print("the shell refused Eval — not in unsafe mode; the windows go unwitnessed", flush=True)
        break
    windows = json.loads(raw) if raw else []
    focused = [title for title, has_focus in windows if has_focus]
    if windows and not focused and nudged < 3:
        nudged += 1
        print(f"windows: {windows} — none focused; activating: {ask(ACTIVATE)!r}", flush=True)
        continue
    if windows:
        print(f"windows: {windows}", flush=True)
    if focused:
        print(f"the compositor focuses {focused[0]!r}", flush=True)
        break
GLib.MainLoop().run()
