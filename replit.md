# YieldLoop

Material Yield & Production Intelligence Platform. Phase 3 provides persisted
Production Jobs alongside Django sessions, employee roles, and the original
bilingual health screen/API, all in verified development.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — Django/Gunicorn API, workflow supplies PORT
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Do not apply migrations or run Drizzle schema pushes without separate approval.
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

- Phase 3 Production Jobs and their migrations are approved only for the
  positively identified development database. Stop at Phase 3; no materials,
  yield/scrap, dashboards, reports, cutting optimization, AI, or publishing.
- Django database-backed sessions supersede JWT. Use exactly Cutting Operator,
  Production Supervisor, and Manager roles; no public registration or tenant onboarding.
- Follow the YieldLoop domain, design-system, and engineering-quality skills.
- Ibn Khaldoun Printing and Publishing is the current single business. Do not hardcode
  factory-specific rules or introduce multi-tenant memberships.

## Gotchas

- Root README describes production configuration gates. Do not publish as production-ready.
- The connection is intentionally read-only in Phase 1.
- Never commit credentials or log database exception details.
- Read `docs/phase-2b.md` for development write guards, tests, and first-Manager setup.
  Development selects `config.session_settings`; `config.schema_settings` is offline only.
- Read `docs/phase-3.md` for the centralized job policy: Managers manage; Supervisors
  open drafts/edit open-job notes; Operators read Open jobs only. Completion awaits
  material reconciliation; cancellation is Manager-only and terminal.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
