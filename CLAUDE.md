# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Repository map

New API is a Go/Gin API gateway with a React frontend embedded into the backend binary for production deployments. The main request path is:

`router -> middleware -> controller -> service/model`

- `main.go` initializes environment and secrets, databases, caches, i18n, background jobs, and the Gin server. It embeds `web/dist`, then passes those assets to `router.SetRouter`.
- `router/` registers dashboard/API routes and relay routes. `router/api-router.go` covers the management/auth/payment APIs; `router/relay-router.go` covers `/v1`, Claude, Gemini, realtime, image/audio/embedding/rerank, and task endpoints.
- `middleware/` handles authentication, authorization, rate limits, distribution/channel selection, request-body storage, CORS, logging, and request metadata.
- `controller/` is the HTTP boundary. Controllers validate/translate requests and delegate business operations rather than implementing persistence directly.
- `service/` contains business workflows such as authentication, quota/accounting, subscriptions, payments, task polling, scheduled system tasks, and logging.
- `model/` contains GORM models, database initialization/migrations, cache-backed channel data, and data access. Changes must remain compatible with SQLite, MySQL, and PostgreSQL.
- `relay/` is the provider relay layer. `relay/channel/<provider>/` contains provider adaptors, DTOs, request/response conversion, streaming, and provider-specific task/media behavior. Shared relay formats and request helpers live in `relay/common`, `relay/helper`, and `types/`.
- `dto/`, `constant/`, `common/`, `setting/`, `oauth/`, `i18n/`, and `pkg/` provide shared request types, constants, utilities, configuration, OAuth registration, translations, and internal packages. Business JSON encoding uses the wrappers in `common/json.go` as specified in `AGENTS.md`.
- `web/` is the React 19/Rsbuild application. Routes are in `web/src/routes/`; shared UI and data components are under `web/src/components/`; API/client and state code are organized in the corresponding `web/src` modules. TanStack Router provides routing, React Query handles server state, and Zustand is used for client state. Frontend user-facing strings use the i18next locale files in `web/src/i18n/locales/`.
- `pkg/billingexpr/expr.md` is the design reference for expression-based pricing. Read it before changing tiered/dynamic billing. Follow the quota saturation, validation, pre-consume, settlement, and audit rules in `AGENTS.md` for every billing path.
- `electron/` wraps the backend and frontend for desktop builds; its development/build workflow is documented in `electron/README.md`.

## Common commands

Run commands from the repository root unless noted. Go uses the version declared in `go.mod` (`go 1.25.1`); Bun is the preferred frontend package manager.

### Backend

```bash
# Download/update Go dependencies
go mod download

# Run the backend locally (default port 3000; requires web/dist for go:embed)
go run main.go

# Run all Go tests
go test ./...

# Run one package test or one named test
go test ./controller -run TestName -count=1
go test ./relay/channel/openai -run TestName -count=1

# Static checks and a local binary build
go vet ./...
go build -o new-api .
```

For a production-style local binary, build the frontend first with `make build-web`, then build with the version linker flag used by the container/release builds:

```bash
make build-web
go build -ldflags "-s -w -X 'github.com/QuantumNous/new-api/common.Version=$(cat VERSION)'" -o new-api .
```

### Frontend

```bash
cd web
bun install --frozen-lockfile
bun run dev              # Rsbuild dev server, normally http://localhost:5173
bun run build            # production frontend into web/dist
bun run build:check      # TypeScript project build plus frontend build
bun run typecheck
bun run lint
bun run lint:fix
bun run format:check
bun run format
bun run i18n:sync
```

There is currently no frontend test script in `web/package.json`; use `typecheck`, `lint`, formatting checks, and `build:check` for frontend validation.

### Make and Docker development

The root `makefile` is the source of truth for the local development shortcuts:

```bash
make build-web          # install dependencies and build web/dist
make dev-api            # start Docker PostgreSQL, Redis, and backend
make dev-api-rebuild    # rebuild the backend development image and start it
make dev-web            # install dependencies and start the frontend dev server
make dev                # start the Docker backend stack and frontend
make reset-setup        # clear setup/root-user state in the active dev database
```

The Docker development stack uses PostgreSQL and Redis from `docker-compose.dev.yml`, serves the API on port 3000, and expects the frontend dev proxy on port 5173. Stop it with:

```bash
docker compose -f docker-compose.dev.yml down
# Add -v only when intentionally deleting the development database/cache volumes.
```

For the documented production deployment, configure `docker-compose.yml` and run `docker compose up -d`. The application stores SQLite data under the mounted `/data` directory when no remote `SQL_DSN` is configured. `SESSION_SECRET` must be set consistently across nodes; nodes sharing Redis must also share the effective `CRYPTO_SECRET`.

## Change-oriented guidance

- When adding or changing a provider adaptor, trace the full relay path: route format -> request DTO/validation -> channel adaptor -> streaming/response conversion -> usage/quota accounting -> logging. Confirm provider capabilities such as stream options and preserve explicit zero-valued optional request fields with pointers.
- When changing quota or pricing, inspect both pre-consumption and settlement/refund paths, validate every user/upstream-controlled multiplier, use the centralized quota math helpers, and attach saturation audit data as required by `AGENTS.md`.
- When changing models or migrations, use GORM patterns and verify all supported database dialects. Do not assume SQLite-only behavior or introduce dialect-specific SQL without fallbacks.
- When changing frontend copy, update the English source key and synchronize locale files with `cd web && bun run i18n:sync`.
- The compiled backend requires `web/dist/index.html`; use `make build-web` or `bun run build` before a non-dev `go build` when the directory is absent or stale.
- Review `.github/workflows/` when changing build/release behavior: CI builds the frontend with Bun, then builds Go binaries or Docker/Electron artifacts.
