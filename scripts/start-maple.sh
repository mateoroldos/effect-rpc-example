#!/usr/bin/env bash
set -euo pipefail

dashboard_url="http://127.0.0.1:4318"

if ! curl --fail --silent "${dashboard_url}/health" >/dev/null 2>&1; then
  maple start --offline --background
fi

printf 'Maple: %s\n' "${dashboard_url}"
