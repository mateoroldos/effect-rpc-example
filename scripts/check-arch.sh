#!/bin/sh
# Enforce the architecture arrows with dependency-cruiser.
#
# depcruise receives concrete source files instead of directories or recursive
# globs. Its initial file gatherer otherwise descends into Bun's node_modules
# workspace symlinks, which are self-referential (core -> database -> core ...)
# and cause an ELOOP. find starts at each workspace's source root, does not
# follow symlinks, and prunes nested node_modules explicitly.
set -eu

find_sources() {
  find packages/*/src apps/*/src \
    -type d -name node_modules -prune -o \
    -type f -name '*.ts' -print0
}

if ! find packages/*/src apps/*/src \
  -type d -name node_modules -prune -o \
  -type f -name '*.ts' -print -quit | grep -q .; then
  echo "No TypeScript source files found under packages or apps" >&2
  exit 1
fi

find_sources | xargs -0 node_modules/.bin/depcruise "$@"
