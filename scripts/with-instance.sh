#!/usr/bin/env sh
# Run a command with DEV_INSTANCE set — the workspace id that names portless URLs
# and the OTel service. Defaults to this directory's name (VCS-agnostic: a git
# worktree, jj workspace, or extra clone each differ), lowercased and sanitized
# so it is safe as a DNS label. Override by exporting DEV_INSTANCE.
raw="${DEV_INSTANCE:-$(basename "$PWD")}"
export DEV_INSTANCE="$(printf '%s' "$raw" | tr 'A-Z' 'a-z' | tr -c 'a-z0-9-' '-' | sed 's/--*/-/g; s/^-//; s/-$//')"
exec "$@"
