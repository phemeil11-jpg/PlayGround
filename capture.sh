#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
CAPTURE_READY_SELECTOR="${CAPTURE_READY_SELECTOR:-html.ui-ready}" \
  /usr/bin/time -p node "${RUNTIME_DIR:?}/scripts/default-capture.mjs"
