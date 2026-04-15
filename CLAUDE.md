# CLAUDE.md

Guidance for Claude Code in this repository.

## Overview

Skip-Bo is a PNPM workspace monorepo. Three tiers:
- **Frontend:** React/Vite PWA — [`apps/web`](apps/web/CLAUDE.md)
- **Shared packages:** Game rules — [`packages/game-core`](packages/game-core/CLAUDE.md) · Multiplayer DTOs — [`packages/multiplayer-protocol`](packages/multiplayer-protocol/CLAUDE.md)
- **Backend:** AWS Lambda + DynamoDB — [`apps/realtime-api`](apps/realtime-api/CLAUDE.md)

## Commands

```bash
pnpm install     # Install all workspace deps
pnpm dev         # Vite dev server (http://localhost:5173)
pnpm dev:api     # Local realtime API (http://127.0.0.1:8787)
pnpm build       # Build all packages in dependency order
pnpm lint        # ESLint across all packages (max-warnings 0)
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # Vitest unit tests across all packages
pnpm test:e2e    # Playwright E2E tests
pnpm test:visual # Visual regression tests (chromium-desktop)
```

See each app/package CLAUDE.md for scoped test commands.

## Change Guidance

`AGENTS.md` has the full change matrix, mandatory validations, and durable invariants.  
Read it before making cross-cutting changes.

## Key Environment Variables

```
VITE_SKIPBO_API_URL            # Backend WebSocket/HTTP API endpoint
VITE_SENTRY_DSN                # Browser Sentry DSN
BACKEND_SENTRY_DSN             # Lambda Sentry DSN
PWA_MINIMUM_SUPPORTED_VERSION  # Hard-update threshold for PWA clients
```

## Testing Layout

| Scope | Location | Runner |
|---|---|---|
| Game-core unit | `packages/game-core/tests/` | Vitest |
| Protocol unit | `packages/multiplayer-protocol/tests/` | Vitest |
| API unit | `apps/realtime-api/tests/` | Vitest |
| Web unit | `apps/web/src/**/__tests__/` | Vitest (jsdom) |
| E2E | `apps/web/tests/ui/*.spec.ts` | Playwright |
| Visual regression | `apps/web/tests/ui/theme-contract.spec.ts` | Playwright (chromium-desktop) |
