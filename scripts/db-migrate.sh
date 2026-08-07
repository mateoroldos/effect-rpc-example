#!/usr/bin/env sh
# Create this workspace's database in the shared local Postgres if missing, then
# migrate. DEV_INSTANCE is set by with-instance.sh. Prod sets DATABASE_URL, so
# the create step is skipped and migrations run against it directly.
set -eu

if [ -z "${DATABASE_URL:-}" ]; then
  db="eff_$(printf '%s' "$DEV_INSTANCE" | tr '-' '_')"
  docker compose exec -T postgres psql -U effect_template -d effect_template -tc \
    "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 ||
    docker compose exec -T postgres createdb -U effect_template "$db"
fi

exec bun run apps/server/src/migrate.ts
