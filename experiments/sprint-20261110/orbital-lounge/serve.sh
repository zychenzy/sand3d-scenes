#!/bin/sh
# Serve the repository root so /lounge, /cafe, /restaurant and /museum GLBs resolve.
ROOT="$(CDPATH= cd -- "$(dirname "$0")/../../.." && pwd)"
PORT="${1:-8788}"
echo "Orbital lounge: http://127.0.0.1:${PORT}/experiments/sprint-20261110/orbital-lounge/index.html"
echo "Views: ?cam=corner   ?cam=close   ?mode=unlit   ?hud=0"
cd "$ROOT"
exec python3 -m http.server "$PORT" --bind 127.0.0.1
