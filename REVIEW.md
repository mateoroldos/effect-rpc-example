# Code review guidelines

Review semantic risks that deterministic tooling cannot prove. Prefer a few
high-confidence findings; a review with no findings is valid.

## Priorities

Report concrete problems involving:

- incorrect behavior, regressions, edge cases, or data integrity
- typed failure handling, defects, interruption, concurrency, or resource safety
- security, authorization, trust boundaries, or sensitive telemetry
- public contracts and assumptions between modules
- missing behavioral tests for changed policy or failure paths

Before reporting a finding, read the surrounding code, callers, tests, and
repository guidelines. Confirm that the pull request introduced the problem and
that CI does not already report it.

## Effect architecture

Enforce the dependency direction and composition rules in `AGENTS.md` and
`.dependency-cruiser.cjs`. In particular, flag changes that:

- throw expected failures instead of preserving typed Effect failures
- collapse expected failures, defects, and interruptions into one error path
- provide concrete adapters outside a deployable composition root
- make application code depend on an adapter instead of its port
- yield stable dependencies per request instead of once during Layer construction

Treat `packages/domain` as pure shared vocabulary. Domain types belong there only
when they cross boundaries or have independent consumers. Keep service-local
contracts beside their port.

## Tests and persistence

Request tests only when they demonstrate changed behavior, an important failure
path, or a regression. Tests use substitute Layers through public interfaces;
do not recommend module mocks or arbitrary sleeps.

Do not recommend hand-editing generated migrations under
`packages/database/drizzle`. Review their behavior, but propose changing the
schema and regenerating the migration.

## Leave to deterministic checks

Do not report formatting, import ordering, unused code, naming preferences,
compiler diagnostics, lint findings, dependency direction already caught by
`check-arch`, dead exports caught by Knip, build failures, audit findings, or
workflow findings caught by Zizmor.

Do not propose speculative refactors. If a repeated finding can become a static
rule or focused test, recommend automating it rather than repeating review
comments.
