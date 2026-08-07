#!/usr/bin/env sh
# Drop this workspace's database from the shared local Postgres. The shared
# server keeps running for other workspaces. DEV_INSTANCE is set by with-instance.sh.
set -eu

db="eff_$(printf '%s' "$DEV_INSTANCE" | tr '-' '_')"
docker compose exec -T postgres dropdb -U effect_template --if-exists --force "$db"
printf 'dropped %s\n' "$db"
