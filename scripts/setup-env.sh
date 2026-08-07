#!/usr/bin/env sh
# Seed a real `.env` next to every committed `.env.example` that lacks one.
# Create-if-missing only — never clobbers an existing `.env`, so a workspace's
# custom POSTGRES_PORT (and any other per-workspace override) survives re-runs.
set -eu

find . \
  -path ./node_modules -prune -o \
  -path ./.repos -prune -o \
  -name .env.example -print |
while IFS= read -r example; do
  env="${example%.example}"
  if [ -f "$env" ]; then
    printf 'kept    %s\n' "$env"
  else
    cp "$example" "$env"
    printf 'created %s\n' "$env"
  fi
done
