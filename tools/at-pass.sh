#!/usr/bin/env bash
# The environment half of the assistive-technology pass (plan 2.2). It puts a screen reader
# on a display of its own and hands the driving to the ONE walk every reader takes,
# `apps/sandbox-e2e/at/walk.ts`, through `apps/sandbox-e2e/at-orca.config.mts`.
#
# Everything here is deliberate isolation. A second X display, a second session bus and a
# throwaway configuration directory, so the pass never touches the reader, the preferences
# or the desktop of whoever runs it — a screen reader that seizes the real session is a
# machine somebody has to restart by hand. `--replace` is never passed for the same reason.
#
# The reader speaks English regardless of the machine's locale: this repository is written
# in one language (`req-project-language`), and a log of Polish announcements would be both
# untrue of the product and unreadable by the gate that holds the rule.
#
# Usage: tools/at-pass.sh [baseURL]     (default http://localhost:4200 — serve the sandbox first)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${1:-http://localhost:4200}"
WORK="$ROOT/tmp/at"
SCREEN=":99"

# The reader's state is KEPT between runs, and that is measured rather than tidy. Clearing it
# was tried, to rule out a `RecursionError` inside Orca's own `ax_object.py` that killed one
# run before a single word — and the pass that followed the clearing started the reader,
# attached it to nothing, and produced three utterances in fifteen minutes. The reader wants
# the state it has written for itself.
# A stale record from a previous pass would make a walk that never finished look
# like one that did: the success of this run is decided by the file it leaves.
rm -f "$WORK/drove.ok" "$WORK/steps.json" "$WORK/browser.display"
mkdir -p "$WORK/config/orca" "$WORK/data"

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
echo
echo "  !! THE BROWSER OPENS A REAL WINDOW ON YOUR DESKTOP for the next few minutes."
echo "     Clicking in it, or typing into it, goes into the measurement — a theme switched"
echo "     and switched back is two announcements the reader attributes to a Tab press."
echo "     Everything else on this machine is safe: editing a file in this repository is"
echo "     the one thing that reloads the page under the walk. (position 4.73)"
echo
export DISPLAY="$SCREEN"
# THE LINE ABOVE DOES NOT MOVE THE BROWSER, and everything this file said about isolating it
# was false until 2026-09-16. GTK reads `GDK_BACKEND` and `WAYLAND_DISPLAY` first and Firefox
# follows: in a Wayland session it ignores `DISPLAY`, connects to the compositor of whoever
# started the pass, and opens a REAL WINDOW on their desktop. The maintainer found it by
# saying so — a `firefox` on his taskbar, Tab walking the application inside it — and then
# proved it by clicking the theme switch in the middle of a reading. Xvfb has been running
# this whole time with nothing ever drawing on it.
#
# The obvious repair is measured and REFUSED. `unset WAYLAND_DISPLAY` with `GDK_BACKEND=x11`
# does put the browser on `:99` — and Orca then reads almost nothing: **7 utterances against
# 1969** for the same walk, and the first view fails the guard the record carries. This pass works
# BECAUSE it is not isolated. Isolating it properly wants a headless Wayland compositor and
# none is installed here (position 4.73).
#
# So the window is real, the operator is told so above, and the record says which surface the
# reading was taken on instead of claiming this one.
export XDG_CONFIG_HOME="$WORK/config"
export XDG_DATA_HOME="$WORK/data"
export GTK_MODULES=gail:atk-bridge
export GNOME_ACCESSIBILITY=1
export NO_AT_BRIDGE=0
export LANG=C.UTF-8 LANGUAGE=en_US:en LC_ALL=C.UTF-8

# Which surface the browser REALLY took, sampled rather than assumed — the whole defect was
# that exporting a variable and having the browser honour it are two different facts. Matched
# by process NAME and then by the executable behind it: `pgrep -f` on a path also matches any
# shell whose command line happens to contain that path, and the first version of this sampler
# reported the wrong answer because it had found the very command asking it the question.
(
  tries=0
  while [ "$tries" -lt 180 ]; do
    tries=$((tries + 1))
    for pid in $(pgrep -x firefox 2>/dev/null); do
      case "$(readlink -f "/proc/$pid/exe" 2>/dev/null)" in
      */ms-playwright/*) ;;
      *) continue ;;
      esac
      if tr "\0" "\n" < "/proc/$pid/environ" 2>/dev/null | grep -q "^WAYLAND_DISPLAY="; then
        echo "the desktop session of whoever ran the pass, NOT an isolated display (4.73)" \
          > "$WORK/browser.display"
      else
        echo "Xvfb at 1280x900, window manager: ${AT_PASS_WM:-none}" > "$WORK/browser.display"
      fi
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

Xvfb "$SCREEN" -screen 0 1280x1024x24 -nolisten tcp >"$WORK/xvfb.log" 2>&1 &
XVFB=$!
trap 'kill $XVFB 2>/dev/null || true; kill ${WM:-0} 2>/dev/null || true' EXIT
sleep 2

# A window manager, if there is one. Without it nothing ever sets `_NET_ACTIVE_WINDOW`, so
# Firefox does not believe it is the active window: keyboard focus wanders to its own chrome,
# and on some navigations the accessible document is lost outright — nineteen of thirty-six
# views read as silence in the pass of 2026-09-14. It is optional on purpose: the reading is
# worth taking without one, and the record says which it was taken with.
WM=0
WM_NAME="none"
for candidate in openbox matchbox-window-manager fluxbox icewm twm; do
  if command -v "$candidate" >/dev/null 2>&1; then
    "$candidate" >"$WORK/wm.log" 2>&1 &
    WM=$!
    WM_NAME="$candidate"
    sleep 2
    break
  fi
done
export AT_PASS_WM="$WM_NAME"
echo "  window manager: $WM_NAME"

dbus-run-session -- bash -c '
  set -u
  WORK="'"$WORK"'"; ROOT="'"$ROOT"'"; BASE="'"$BASE"'"
  gsettings set org.gnome.desktop.interface toolkit-accessibility true 2>/dev/null || true
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
  [ -s "$WORK/steps.json" ] || exit 1
  touch "$WORK/drove.ok"
  sleep 2
  kill $ORCA 2>/dev/null || true
  sleep 2
' 2>&1 | grep -vE 'dbus-daemon|Activating service|Successfully activated|GNOME_KEYRING|xdg-desktop-portal|WARNING \*\*|^$' || true

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

if [ ! -f "$WORK/drove.ok" ]; then
  echo "X the walk did not complete. The driver's own output is $WORK/drive.log; the" >&2
  echo "  reader's is $WORK/orca.out and the display's is $WORK/xvfb.log." >&2
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
