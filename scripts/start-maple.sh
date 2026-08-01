#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
data_dir="${project_root}/.data/maple"
dashboard_url="http://127.0.0.1:4318"

if ! command -v maple >/dev/null 2>&1; then
  echo "Maple is not installed. See https://maple.dev/docs/local-mode/" >&2
  exit 1
fi

mkdir -p "$(dirname "${data_dir}")"

(
  for _ in {1..40}; do
    if curl --fail --silent "${dashboard_url}/health" >/dev/null 2>&1; then
      if command -v xdg-open >/dev/null 2>&1; then
        xdg-open "${dashboard_url}" >/dev/null 2>&1
      elif command -v open >/dev/null 2>&1; then
        open "${dashboard_url}" >/dev/null 2>&1
      fi
      exit
    fi
    sleep 0.25
  done
) &

maple start --offline --data-dir "${data_dir}"
