# Skip-Bo

Skip-Bo is a lightweight `pnpm` monorepo with an offline-first React game, a shared rules engine, and an AWS serverless multiplayer backend.

## Product behavior

- The app boots straight into a local game against AI.
- `Nouvelle partie` opens a modal with:
  - `Local vs AI`
  - `Start online`
  - `Join online`
- Online play is private human-vs-human only and joined by a 5-character Crockford base32 room code.
- There is no lobby route or waiting-room screen. The board stays visible while the room code and waiting state are shown inline.
- `Rejouer` preserves the finished game type. Local restarts locally; online creates a fresh hosted room.

## Workspace layout

```text
apps/
├── realtime-api/         AWS Lambda handlers for HTTP and WebSocket APIs
└── web/                  React/Vite app, AI, animations, fixtures, and tests
packages/
├── game-core/            Shared reducer, validators, deck setup, and domain types
└── multiplayer-protocol/ HTTP and WebSocket DTOs plus redacted client views
infra/
└── terraform/            AWS infrastructure modules, managed with OpenTofu
docs/
├── architecture/
├── protocols/
└── runbooks/
```

## Prerequisites

- Node.js 20 or later
- `pnpm`
- OpenTofu 1.9 or later if you want to work on the AWS stack

## Getting started

Install once from the repo root:

```bash
pnpm install
```

Run the web app:

```bash
pnpm dev
```

Run the realtime API local watcher:

```bash
pnpm dev:api
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

The web app only needs backend configuration when you want online play:

```bash
VITE_SKIPBO_API_URL=https://<http-api-id>.execute-api.ca-central-1.amazonaws.com
```

Sentry remains optional:

```bash
VITE_SENTRY_DSN=your_browser_dsn
```

The realtime Lambda backend can use Sentry too. Configure it through OpenTofu with:

```bash
TF_VAR_sentry_dsn=your_sentry_dsn
TF_VAR_sentry_release=v$(node -p 'require("./package.json").version')
```

For GitHub Pages deployment, add these repository secrets:

- `VITE_SKIPBO_API_URL`
- `VITE_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

The AWS apply workflow reuses `VITE_SENTRY_DSN` for the backend too and sends `v<package.json version>` as the backend Sentry release.

The Pages workflow also injects `VITE_APP_VERSION` from the release tag.

## Common commands

- `pnpm dev`: run the web app
- `pnpm dev:api`: watch the Lambda app locally
- `pnpm build`: build `game-core`, `multiplayer-protocol`, `realtime-api`, and `web`
- `pnpm lint`: run ESLint across workspace packages
- `pnpm test`: run Vitest suites across workspace packages
- `pnpm test:e2e`: run Playwright UI coverage for the web app
- `pnpm test:visual`: run the desktop visual-regression suite
- `pnpm typecheck`: run `tsc --noEmit` across workspace packages
- `pnpm tofu:init`: initialize the production OpenTofu environment
- `pnpm tofu:plan`: create the production OpenTofu plan
- `pnpm tofu:apply`: apply the production OpenTofu plan

## Multiplayer backend

The online stack is intentionally small:

- HTTP API Gateway for `POST /rooms` and `POST /rooms/join`
- WebSocket API Gateway for live room updates
- Lambda for create, join, connect, disconnect, and message handling
- DynamoDB for room state and active WebSocket connections
- CloudWatch logs and minimal Lambda error alarms
- Optional Sentry monitoring for browser and realtime Lambda errors

The server is authoritative for online rooms. It shuffles, deals, validates actions, and sends a redacted snapshot to each player after every accepted action.

## Testing

- Shared rules and backend tests run with Vitest.
- Browser interaction, layout, and accessibility coverage lives under `apps/web/tests/ui`.
- Desktop visual baselines live under `apps/web/tests/ui/*.spec.ts-snapshots/`.
- Deterministic browser fixtures are still available through `?fixture=...`.

## Documentation

- [`AGENTS.md`](AGENTS.md): repo-local coding guidance
- [`apps/web/src/ai/README.md`](apps/web/src/ai/README.md): AI architecture notes
- [`docs/architecture/online-multiplayer.md`](docs/architecture/online-multiplayer.md): monorepo and multiplayer architecture
- [`docs/protocols/realtime-events.md`](docs/protocols/realtime-events.md): room protocol details
- [`docs/runbooks/opentofu-aws-realtime.md`](docs/runbooks/opentofu-aws-realtime.md): OpenTofu bootstrap and deploy flow
