# OpenWolf

@.wolf/OPENWOLF.md

This project uses OpenWolf for context management. Read and follow .wolf/OPENWOLF.md every session. Check .wolf/cerebrum.md before generating code. Check .wolf/anatomy.md before reading files.

# CLAUDE.md

Guidance for Claude Code in this repository.

## Overview

Skip-Bo is a PNPM workspace monorepo:

- **Frontend:** React/Vite PWA — [`apps/web`](apps/web/CLAUDE.md)
- **Shared packages:** Skip-Bo rules — [`packages/game-core`](packages/game-core/CLAUDE.md) · Host-authoritative Skip-Bo runtime — [`packages/skipbo-runtime`](packages/skipbo-runtime/CLAUDE.md)

The **game-agnostic realtime backend** (the relay protocol package `@klbsjpolp/realtime-core` and the AWS Lambda + DynamoDB relay server) lives in a separate repo, [`klbsjpolp/realtime-infra`](https://github.com/klbsjpolp/realtime-infra), and is shared with other games. Skip-Bo consumes `@klbsjpolp/realtime-core` from npm and connects to the deployed server via `VITE_SKIPBO_API_URL`.

Online play is **host-authoritative**: the server only relays opaque messages between seats and tracks an abstract turn; the host client (seat 0) runs the game and redacts hidden information. See [`docs/architecture/online-multiplayer.md`](docs/architecture/online-multiplayer.md).

## Commands

```bash
pnpm install     # Install all workspace deps
pnpm dev         # Vite dev server (http://localhost:5173)
pnpm build       # Build all packages in dependency order
pnpm lint        # ESLint across all packages (max-warnings 0)
pnpm typecheck   # tsc --noEmit across all packages
pnpm test        # Vitest unit tests across all packages
pnpm test:e2e    # Playwright E2E tests
pnpm test:visual # Visual regression tests (chromium-desktop)
```

To develop online multiplayer locally, run `pnpm dev` here **and** run the relay
server from the [`realtime-infra`](https://github.com/klbsjpolp/realtime-infra) repo
(`pnpm dev:api`, serves http://127.0.0.1:8787). Point the web app at it by setting
`VITE_SKIPBO_API_URL=http://127.0.0.1:8787`.

Without the realtime-infra repo, use the in-repo **mock relay** instead
(`apps/web/tests/mock-relay/`, protocol-v2-faithful, in-memory):
`pnpm --filter @skipbo/web mock:relay` then
`VITE_SKIPBO_API_URL=http://127.0.0.1:8787 pnpm dev` and open two tabs.
The automated two-browser multiplayer E2E test
(`apps/web/tests/ui/online-multiplayer.spec.ts`) runs against the same mock.

See each app/package CLAUDE.md for scoped test commands.

## Debug Buttons

`DebugStrip` renders only when `import.meta.env.DEV` is true and is wired into both the local and online game screens. Two actions:

- **Fill build pile** — fills build pile 0 to one card before completion
- **Win** — immediately ends the game; the winner is whichever player's turn it currently is

In online mode, debug actions are allowed by the server only when `NODE_ENV !== 'production'`.

## Change Guidance

`AGENTS.md` has the full change matrix, mandatory validations, and durable invariants.  
Read it before making cross-cutting changes.

## Commit Messages

Commitlint enforces a 72-character max on the header (first line). Keep titles short; put detail in the body.

## Key Environment Variables

```
VITE_SKIPBO_API_URL            # Backend WebSocket/HTTP API endpoint
VITE_SENTRY_DSN                # Browser Sentry DSN
BACKEND_SENTRY_DSN             # Lambda Sentry DSN
PWA_MINIMUM_SUPPORTED_VERSION  # Hard-update threshold for PWA clients
```

## Testing Layout

| Scope             | Location                                   | Runner                        |
| ----------------- | ------------------------------------------ | ----------------------------- |
| Game-core unit    | `packages/game-core/tests/`                | Vitest                        |
| Skipbo-runtime    | `packages/skipbo-runtime/tests/`           | Vitest                        |
| Web unit          | `apps/web/src/**/__tests__/`               | Vitest (jsdom)                |
| E2E               | `apps/web/tests/ui/*.spec.ts`              | Playwright                    |
| Visual regression | `apps/web/tests/ui/theme-contract.spec.ts` | Playwright (chromium-desktop) |
