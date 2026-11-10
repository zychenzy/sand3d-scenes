#!/bin/sh
# Shared GLBs and Three.js live outside this folder. Serve the repo root.
cd "$(dirname "$0")/../../.." || exit 1
exec python3 -m http.server "${PORT:-8794}" --bind 127.0.0.1
