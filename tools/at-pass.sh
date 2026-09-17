#!/usr/bin/env bash
# The environment half of the assistive-technology pass (plan 2.2). It puts a screen reader
# on a display of its own and hands the driving to the ONE walk every reader takes,
# `apps/sandbox-e2e/at/walk.ts`, through `apps/sandbox-e2e/at-orca.config.mts`.
#
# Everything here is deliberate isolation, and since 2026-09-17 it is isolation that was
# MEASURED rather than declared (position 4.73, lesson-224): a headless GNOME Shell of its own
# on a throwaway session bus, a keyboard for that compositor's seat through `tools/at-seat.py`,
# a private speech server that synthesises into a null device, a throwaway configuration
# directory — and which socket the browser really connected to is read off `ss(8)` and written
# into the record, because exporting a variable and having the browser honour it are two
# different facts. Until that day `DISPLAY` pointed at an Xvfb nothing ever drew on while the
# browser took the session compositor and opened a real window on the desktop of whoever ran
# the pass. `--replace` is never passed to the reader: one that seizes the real session is a
# machine somebody has to restart by hand.
#
# The reader speaks English regardless of the machine's locale: this repository is written
# in one language (`req-project-language`), and a log of Polish announcements would be both
# untrue of the product and unreadable by the gate that holds the rule.
#
# Usage: tools/at-pass.sh [baseURL]     (default http://localhost:4200 — serve the sandbox first)
#   AT_PASS_ROUTES=/a,/b  walks those views only; the default, and `all`, is every view
#   AT_PASS_TRACE=1     traces the Wayland protocol from the browser side into drive.log
#   AT_PASS_DESKTOP=1  takes the pass on the desktop session instead — NOT isolated, a real
#                      window, and the record says which it was; for a machine whose GNOME
#                      Shell has no `--headless` (47 and later have it).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://localhost:4200}"
WORK="$ROOT/tmp/at"
# The compositor's own Wayland socket, next to the session's `wayland-0` under XDG_RUNTIME_DIR
# and never that one. A speech socket sits there too: a Unix socket path is limited to 108
# bytes and `tmp/at` under a deep checkout is past it.
AT_WL="wayland-at"
# A runner has no XDG_RUNTIME_DIR at all; the compositor needs one, and the sockets need a
# short private path (lesson-224) — a throwaway directory under /tmp is both.
if [ -z "${XDG_RUNTIME_DIR:-}" ]; then
  XDG_RUNTIME_DIR="$(mktemp -d /tmp/at-runtime.XXXXXX)"
  export XDG_RUNTIME_DIR
fi
SPD_SOCK="$XDG_RUNTIME_DIR/at-speechd.sock"

# The reader's state is KEPT between runs, and that is measured rather than tidy. Clearing it
# was tried, to rule out a `RecursionError` inside Orca's own `ax_object.py` that killed one
# run before a single word — and the pass that followed the clearing started the reader,
# attached it to nothing, and produced three utterances in fifteen minutes. The reader wants
# the state it has written for itself.
# A stale record from a previous pass would make a walk that never finished look
# like one that did: the success of this run is decided by the file it leaves.
rm -f "$WORK/drove.ok" "$WORK/steps.json" "$WORK/browser.display" "$WORK/spd.pid"
mkdir -p "$WORK/config/orca" "$WORK/data" "$WORK/spd-log" "$WORK/speechd"

# The reader's own settings, and the one that decides whether this works at all. Orca's caret
# and structural navigation put it BETWEEN the keyboard and the browser: it grabs keys for its
# own walk of the document, swallows the Tab that switches it between browse and focus mode,
# and overrides a focus the page has just set. Measured across five passes — with them on,
# nineteen of thirty-six views read as silence; with them off, the same views read their
# controls out one by one. Nothing here is a preference: it is the difference between driving
# the browser and fighting the reader for the keyboard.
cat > "$WORK/config/orca/user-settings.conf" <<'JSON'
{
  "general": { "speechServerFactory": "speechdispatcherfactory", "enableSpeech": true },
  "profiles": {
    "default": {
      "profile": ["Default", "default"],
      "caretNavigationEnabled": false,
      "structuralNavigationEnabled": false,
      "enableBrailleMonitor": false,
      "speechServerFactory": "speechdispatcherfactory"
    }
  },
  "activeProfile": ["Default", "default"]
}
JSON

# The speech server's configuration: the system's own, with the samples sent to ALSA's null
# device. The synthesis still runs at its own pace — Orca writes `SPEECH OUTPUT` when it hands
# a phrase to the server, and a server that is not there would change what the log measures —
# so this is the same instrument, muted. Nobody's speakers say a word for twenty-five minutes.
cp -r /etc/speech-dispatcher/. "$WORK/speechd/"
cat >> "$WORK/speechd/speechd.conf" <<'CONF'

# Appended by tools/at-pass.sh: the samples go to the null device (position 4.73).
AudioOutputMethod "alsa"
AudioALSADevice "null"
DefaultModule espeak-ng
LogLevel 3
CONF

ISOLATED=1
if [ "${AT_PASS_DESKTOP:-0}" = "1" ]; then
  ISOLATED=0
  echo
  echo "  !! AT_PASS_DESKTOP=1: THE BROWSER OPENS A REAL WINDOW ON YOUR DESKTOP for the next"
  echo "     few minutes. Clicking in it, or typing into it, goes into the measurement — a theme"
  echo "     switched and switched back is two announcements the reader attributes to a Tab"
  echo "     press. The record says which surface the reading was taken on. (position 4.73)"
  echo
else
  # What the isolated path needs, checked before anything starts, each with its remedy.
  gnome-shell --help 2>/dev/null | grep -q -- '--headless' || {
    echo "X this GNOME Shell has no --headless (47 and later have it); AT_PASS_DESKTOP=1 takes" >&2
    echo "  the pass on your desktop instead, and the record says so" >&2
    exit 1
  }
  python3 -c 'import gi' 2>/dev/null || {
    echo "X python3-gi is missing — tools/at-seat.py gives the compositor its keyboard through it" >&2
    exit 1
  }
  command -v speech-dispatcher >/dev/null 2>&1 || {
    echo "X speech-dispatcher is missing — the reader logs what it hands to a speech server" >&2
    exit 1
  }
fi

export XDG_CONFIG_HOME="$WORK/config"
export XDG_DATA_HOME="$WORK/data"
export GTK_MODULES=gail:atk-bridge
export GNOME_ACCESSIBILITY=1
export NO_AT_BRIDGE=0
export LANG=C.UTF-8 LANGUAGE=en_US:en LC_ALL=C.UTF-8
export AT_WL SPD_SOCK ISOLATED

# Which surface the browser REALLY took, sampled rather than assumed. Matched by process NAME
# and then by the executable behind it: `pgrep -f` on a path also matches any shell whose
# command line happens to contain that path, and the first version of this sampler reported
# the wrong answer because it had found the very command asking it the question. Then the
# browser's own socket inodes, from /proc, against the server rows of `ss -x`: a display socket
# whose peer is one of them is the display the browser is drawing on, whatever its environment
# says — the defect this replaced was exactly a variable exported and not honoured.
(
  tries=0
  while [ "$tries" -lt 240 ]; do
    tries=$((tries + 1))
    for pid in $(pgrep -x firefox 2>/dev/null); do
      case "$(readlink -f "/proc/$pid/exe" 2>/dev/null)" in
      */ms-playwright/*) ;;
      *) continue ;;
      esac
      inodes="$(ls -l "/proc/$pid/fd" 2>/dev/null | grep -o 'socket:\[[0-9]*\]' | tr -dc '0-9\n' | sort -u)"
      [ -n "$inodes" ] || continue
      paths="$(ss -x 2>/dev/null | grep -E 'wayland|X11' \
        | awk -v want="$inodes" 'BEGIN { n = split(want, a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") w[a[i]] = 1 } ($8 in w) { print $5 }' \
        | sort -u | tr '\n' ' ')"
      [ -n "$paths" ] || continue
      case "$paths" in
      *"/$AT_WL "*)
        echo "gnome-shell $(gnome-shell --version 2>/dev/null | awk '{ print $3 }') headless, virtual monitor 1280x900, its own Wayland socket ($AT_WL) — the browser's connection to it read off ss(8); speech synthesised into a null device" \
          > "$WORK/browser.display"
        ;;
      *wayland*)
        echo "the desktop session of whoever ran the pass ($paths), NOT an isolated display (4.73)" \
          > "$WORK/browser.display"
        ;;
      *)
        echo "an X11 display ($paths), not the compositor this pass starts (4.73)" > "$WORK/browser.display"
        ;;
      esac
      exit 0
    done
    sleep 1
  done
  echo "not sampled" > "$WORK/browser.display"
) &

if ! curl -sf -o /dev/null "$BASE"; then
  echo "X nothing is serving at $BASE — start the sandbox first" >&2
  exit 1
fi

dbus-run-session -- bash -c '
  set -u
  WORK="'"$WORK"'"; ROOT="'"$ROOT"'"; BASE="'"$BASE"'"
  trap "kill \$ORCA \$SPD \$SEAT \$SHELL_PID 2>/dev/null || true" EXIT
  # Empty, not 0: `kill 0` is the whole process group, this script and its caller included
  # (measured: a run that failed at the seat took the terminal it was echoing to down with it).
  ORCA=; SPD=; SEAT=; SHELL_PID=
  if [ "$ISOLATED" = "1" ]; then
    # The compositor: a headless GNOME Shell with a virtual monitor and no X server at all, so
    # a browser that could not find Wayland would fail to start rather than find the desktop.
    # A socket a killed compositor left behind — three runs in one evening each found the one
    # of the run before — is removed, and only when nothing listens on it.
    if [ -S "$XDG_RUNTIME_DIR/$AT_WL" ] && ! ss -xl 2>/dev/null | grep -q "/$AT_WL "; then
      rm -f "$XDG_RUNTIME_DIR/$AT_WL" "$XDG_RUNTIME_DIR/$AT_WL.lock"
    fi
    # `MUTTER_DEBUG=focus,startup` makes the compositor say whether it focused a window and
    # why; the `window-state` and `wayland` topics were the witnesses of lesson-227 and are
    # too loud to keep, and AT_PASS_TRACE=1 below is the browser-side one.
    # A fresh profile opens the welcome tour on the first start, and the tour is a modal: a
    # keyboard focus the browser never gets. The profile says it has seen a tour newer than
    # any, so none opens (tools/at-seat.py measures what holds the stage regardless).
    gsettings set org.gnome.shell welcome-dialog-last-shown-version 99.0 >>"$WORK/gsettings.log" 2>&1 || true
    MUTTER_DEBUG=focus,startup gnome-shell --unsafe-mode --headless --no-x11 --wayland-display="$AT_WL" --virtual-monitor=1280x900 >"$WORK/shell.log" 2>&1 &
    SHELL_PID=$!
    for ((i = 0; i < 30; i++)); do [ -S "$XDG_RUNTIME_DIR/$AT_WL" ] && break; sleep 1; done
    [ -S "$XDG_RUNTIME_DIR/$AT_WL" ] || { echo "X the compositor did not come up — see $WORK/shell.log" >&2; exit 1; }
    # Its keyboard, without which no window is ever told it has focus, and its witness of
    # which window the compositor focuses — activating the browser window when it did not
    # (tools/at-seat.py, through the Eval that `--unsafe-mode` opens on this private bus).
    python3 "$ROOT/tools/at-seat.py" >"$WORK/seat.out" 2>&1 &
    SEAT=$!
    for ((i = 0; i < 40; i++)); do grep -q "keyboard" "$WORK/seat.out" && break; kill -0 "$SEAT" 2>/dev/null || break; sleep 1; done
    grep -q "keyboard" "$WORK/seat.out" || { echo "X the seat got no keyboard — see $WORK/seat.out" >&2; exit 1; }
    export WAYLAND_DISPLAY="$AT_WL" GDK_BACKEND=wayland
    unset DISPLAY
    # AT_PASS_TRACE=1: the protocol as the browser sees it — every wl_seat capability, every
    # wl_keyboard.enter or its absence — through the browser stderr Playwright otherwise
    # keeps to itself. Loud, and only for a reading nobody can otherwise explain.
    if [ "${AT_PASS_TRACE:-0}" = "1" ]; then
      export WAYLAND_DEBUG=client DEBUG=pw:browser
    fi
    # What the seat advertises to a client, read by one: the keyboard capability is what turns
    # the focus the compositor set into the wl_keyboard.enter the browser acts on.
    if command -v wayland-info >/dev/null 2>&1; then
      wayland-info > "$WORK/wayland-info.log" 2>&1 || true
    fi
    echo "  compositor: gnome-shell headless on $AT_WL, with a keyboard"
  fi
  rm -f "$SPD_SOCK"
  if [ -S "$SPD_SOCK" ] && ! ss -xl 2>/dev/null | grep -q "$SPD_SOCK "; then rm -f "$SPD_SOCK"; fi
  speech-dispatcher -s -S "$SPD_SOCK" -P "$WORK/spd.pid" -C "$WORK/speechd" -L "$WORK/spd-log" >"$WORK/spd.out" 2>&1 &
  SPD=$!
  for ((i = 0; i < 10; i++)); do [ -S "$SPD_SOCK" ] && break; sleep 1; done
  [ -S "$SPD_SOCK" ] || { echo "X the speech server did not come up — see $WORK/spd.out" >&2; exit 1; }
  export SPEECHD_ADDRESS="unix_socket:$SPD_SOCK"
  echo "  speech: a private server, muted"
  gsettings set org.gnome.desktop.interface toolkit-accessibility true >"$WORK/gsettings.log" 2>&1 || true
  export AT_PASS_DEBUG="$WORK/orca.debug"
  orca --debug-file="$WORK/orca.debug" >"$WORK/orca.out" 2>&1 &
  ORCA=$!
  sleep 6
  kill -0 $ORCA 2>/dev/null || { echo "X the reader did not start — see $WORK/orca.out" >&2; exit 1; }
  cd "$ROOT"
  BASE_URL="$BASE" scripts/with-node npx playwright test \
    --config apps/sandbox-e2e/at-orca.config.mts 2>&1 | tee "$WORK/drive.log"
  # NO APOSTROPHE MAY APPEAR BELOW, comments included: this whole block is one single-quoted
  # argument to `bash -c`, so one closes it and hands the rest of the block to the OUTER
  # shell. Measured, not feared — the word "record`s`" in this very comment did exactly that,
  # and the walk it broke had already run for 21 minutes.
  #
  # The walk writes its record before the runner tears the browser down, and tearing down a
  # browser with a reader attached to it rejects late and asynchronously — that took a
  # completed fifteen-minute pass with it once. So what decides here is the file on disk and
  # not the exit code; whether the pass is any GOOD is decided by the guard in the record.
  if command -v wayland-info >/dev/null 2>&1; then
    wayland-info > "$WORK/wayland-info-after.log" 2>&1 || true
  fi
  [ -s "$WORK/steps.json" ] || exit 1
  touch "$WORK/drove.ok"
  sleep 2
  kill $ORCA 2>/dev/null || true
  sleep 2
' 2>&1 | grep -vE 'dbus-daemon|Activating service|Successfully activated|Activated service|GNOME_KEYRING|xdg-desktop-portal|WARNING \*\*|Gtk-WARNING|Gdk-Message|goa-daemon|discover_other|libedbus|fusermount|SpiRegistry|calendar-server|connection to the bus|^$' || true

# The reader is started inside a subshell, so its failure has to be carried out by hand: a
# `exit 1` in there ends the subshell and nothing else. Without this the script went on to
# RENDER a pass in which the reader never spoke — a record of thirty-six unread views, which
# is a plausible-looking file and a lie about a measurement that never happened.
# The driver's OWN output is the first place to look, and for a day and a half this line did
# not mention it: it named the reader's log and the display's, both of which were empty, while
# the driver was throwing `ReferenceError` into a pipe (`lesson-210`). The remedy a guard
# prints is part of the guard.

# What the browser really drew on, carried into the record. The line it replaces was a
# CONSTANT saying "driven on Xvfb", which was false on every Linux desktop this has ever run
# on — a fabricated bullet in the one file whose whole purpose is to be quotable, and the same
# defect as the version bullet before it.
AT_PASS_SURFACE="$(cat "$WORK/browser.display" 2>/dev/null || echo "not sampled")"
export AT_PASS_SURFACE
echo "  surface: $AT_PASS_SURFACE"

if [ ! -f "$WORK/drove.ok" ]; then
  echo "X the walk did not complete. The driver's own output is $WORK/drive.log; the" >&2
  echo "  reader's is $WORK/orca.out and the compositor's is $WORK/shell.log." >&2
  exit 1
fi

cd "$ROOT"
# `--disable-warning` by NAME, and only that name: the renderer imports the Orca log parser
# from the e2e app by its `.ts` path, and Node warns once per run that the file has no
# package.json saying which module system it is in. The warning is true, the answer would be
# `"type": "module"` in the workspace root, and that is a change to every `.js` file here for
# one line of output. A tool that prints noise teaches people to stop reading it.
scripts/with-node node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON tools/at-pass.mjs --render \
  "$WORK/steps.json" "$WORK/orca.debug" "orca-firefox-linux" "Orca with Firefox on Linux"
