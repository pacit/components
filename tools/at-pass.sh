#!/usr/bin/env bash
# The environment half of the assistive-technology pass (plan 2.2). It puts a screen reader
# on a display of its own and hands the driving to `tools/at-pass.mjs`.
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
export DISPLAY="$SCREEN"
export XDG_CONFIG_HOME="$WORK/config"
export XDG_DATA_HOME="$WORK/data"
export GTK_MODULES=gail:atk-bridge
export GNOME_ACCESSIBILITY=1
export NO_AT_BRIDGE=0
export LANG=C.UTF-8 LANGUAGE=en_US:en LC_ALL=C.UTF-8

if ! curl -sf -o /dev/null "$BASE"; then
  echo "X nothing is serving at $BASE — start the sandbox first" >&2
  exit 1
fi

Xvfb "$SCREEN" -screen 0 1280x1024x24 -nolisten tcp >"$WORK/xvfb.log" 2>&1 &
XVFB=$!
trap 'kill $XVFB 2>/dev/null || true' EXIT
sleep 2

dbus-run-session -- bash -c '
  set -u
  WORK="'"$WORK"'"; ROOT="'"$ROOT"'"; BASE="'"$BASE"'"
  gsettings set org.gnome.desktop.interface toolkit-accessibility true 2>/dev/null || true
  orca --debug-file="$WORK/orca.debug" >"$WORK/orca.out" 2>&1 &
  ORCA=$!
  sleep 6
  kill -0 $ORCA 2>/dev/null || { echo "X the reader did not start — see $WORK/orca.out" >&2; exit 1; }
  cd "$ROOT"
  scripts/with-node node tools/at-pass.mjs --drive "$BASE" "$WORK/steps.json"
  sleep 2
  kill $ORCA 2>/dev/null || true
  sleep 2
' 2>&1 | grep -vE 'dbus-daemon|Activating service|Successfully activated|GNOME_KEYRING|xdg-desktop-portal|WARNING \*\*|^$' || true

cd "$ROOT"
scripts/with-node node tools/at-pass.mjs --render \
  "$WORK/steps.json" "$WORK/orca.debug" "orca-firefox-linux" "Orca with Firefox on Linux"
