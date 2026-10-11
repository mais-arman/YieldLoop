# YieldLoop

Material Yield & Production Intelligence Platform. Core completion includes job
references and machines, structured scrap reasons, exact-balance completion,
same-machine comparison and explicitly labelled demonstration cases. Django sessions,
audits, cutting safeguards and development database protections remain authoritative.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — Django/Gunicorn API, workflow supplies PORT
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Apply Django migrations only with explicit approval and verified development/test targets. Never run Drizzle schema pushes.
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React, Vite, Tailwind and shadcn/ui
- API: Python 3.12, Django 5.2, Django REST Framework, Gunicorn
- DB: PostgreSQL through Django/psycopg, read-only connectivity checks in Phase 1
- API codegen: Orval (from OpenAPI spec)
- Python dependencies: pyproject.toml and uv.lock

## Where things live

- `artifacts/yieldloop/` — frontend
- `artifacts/api-server/backend/` — Django configuration, health views and tests
- `lib/api-spec/openapi.yaml` — shared API contract
- `infra/` — statically checked Docker configurations, not a verified deployment
- `README.md` — setup, verification, environment and limitations

## Architecture decisions

- Keep the supplied pnpm/artifact routing rather than restructuring the workspace.
- Preserve unused Express/Drizzle scaffold files, but do not build new backend work on them.
- Django owns future domain rules and persistence. No Node backend substitution.
- A missing development database must not prevent API liveness; readiness returns 503.

## Product

Separate real API liveness and database readiness; manual retry; English/Arabic LTR/RTL.

## User preferences

- Phase 5 inventory foundation and migrations are approved only for the positively
  identified development database. The user selected foundation only: reservation
  and consumption stay blocked pending compatibility and receiving-job accounting
  policy. See docs/phase-5.md. Phase 6 read-only dashboard/reporting is approved:
  current balances for source-job creation-date cohorts, exact per-material totals,
  existing role scope, no schema changes. See docs/phase-6.md.
  Phase 7 rectangular Cutting Studio is approved: explicit mm dimensions,
  spacing-only kerf/margins, deterministic shelf heuristic and audited saved proposals.
  Plans never change kg accounting or inventory. See docs/phase-7.md.
  Phase 8 acceptance is documented in docs/phase-8-acceptance.md; production release
  and external recovery remain blocked. Subsequent approved assistant/packaging work
  is documented in docs/ai-packaging.md. Final challenge completion is documented in
  docs/core-completion.md. No publishing or multi-tenant onboarding is authorized.
- Django database-backed sessions supersede JWT. Use exactly Cutting Operator,
  Production Supervisor, and Manager roles; no public registration or tenant onboarding.
- Follow the YieldLoop domain, design-system, and engineering-quality skills.
- Ibn Khaldoun Printing and Publishing is the current single business. Do not hardcode
  factory-specific rules or introduce multi-tenant memberships.

## Gotchas

- The integrated pilot brief supersedes earlier foundation-only scope: backend
  Reports/Comparison now exclude Operators; Operators may register authorized
  offcuts; Supervisors/Managers reserve/release/consume recorded stock with linked
  receiving-job issues. Rework is a pending disposition with traceable resolution.
  See docs/integrated-pilot.md. No production write enablement or deployment.

- Root README describes production configuration gates. Do not publish as production-ready.
- The connection is intentionally read-only in Phase 1.
- Never commit credentials or log database exception details.
- Read `docs/phase-2b.md` for development write guards, tests, and first-Manager setup.
  Development selects `config.session_settings`; `config.schema_settings` is offline only.
- Read `docs/phase-3.md` for the centralized job policy: Managers manage; Supervisors
  open drafts/edit open-job notes. Operators see Open jobs only and, with explicit
  user approval, record/void production and close exactly balanced Open jobs.
  Material catalogue selection is available to all ready roles; catalogue creation
  and job creation remain Manager-only. Inventory movements remain Supervisor/Manager;
  Operators may register offcuts from their authorized Open jobs.
  Completed and cancelled jobs are read-only; cancellation remains Manager-only.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
