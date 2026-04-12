# Skip-Bo

## Document Contract

- Purpose: onboard human contributors and point them to the right code and docs quickly.
- Audience: humans working on the repo for the first time or returning after a while.
- Source of truth: package scripts, workspace package manifests, and the docs linked from this file.
- When to update: when setup steps, top-level workflows, or contributor-facing entrypoints change.

Skip-Bo is a `pnpm` monorepo with three main concerns:

- a React web app for local play and online play
- shared gameplay and multiplayer packages
- an AWS/OpenTofu stack for the realtime backend

The default experience is local play against the built-in AI. The same web app can also create or join private online rooms backed by the realtime API.

## Quick Start

### Prerequisites

- Node.js `>=22.12.0`
- `pnpm`
- OpenTofu if you need to work on the AWS stack

### Install

```bash
pnpm install
```

### Run the web app

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).
This starts the frontend only.

### Run the realtime API locally

```bash
pnpm dev:api
```

The local API listens on `http://127.0.0.1:8787` by default and exposes WebSocket upgrades on `/ws`.
Use `SKIPBO_LOCAL_API_HOST`, `SKIPBO_LOCAL_API_PORT`, and `SKIPBO_LOCAL_API_PUBLIC_HOST` to override the bind or advertised address.

To exercise online play against the local backend, run the web app in a second terminal with:

```bash
VITE_SKIPBO_API_URL=http://127.0.0.1:8787 pnpm dev
```

## Common Commands

- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm test:e2e`
- `pnpm test:visual`
- `pnpm typecheck`
- `pnpm tofu:init`
- `pnpm tofu:plan`
- `pnpm tofu:apply`

## Environment Notes

The web app only needs backend configuration when you want to exercise online play locally:

```bash
VITE_SKIPBO_API_URL=http://127.0.0.1:8787
```

For a deployed backend, set it to your HTTP API base URL instead:

```bash
VITE_SKIPBO_API_URL=https://<http-api-id>.execute-api.ca-central-1.amazonaws.com
```

Browser Sentry is optional:

```bash
VITE_SENTRY_DSN=your_browser_dsn
```

Backend deployment uses `TF_VAR_sentry_dsn` and `TF_VAR_sentry_release` when Sentry is enabled. GitHub Actions prefers `BACKEND_SENTRY_DSN`, then `SENTRY_DSN`, then falls back to `VITE_SENTRY_DSN`. The exact deploy flow lives in [docs/runbooks/opentofu-aws-realtime.md](docs/runbooks/opentofu-aws-realtime.md).
Backend tracing defaults to `1.0` when `TF_VAR_sentry_dsn` is set; override it with `TF_VAR_sentry_traces_sample_rate` if you want a lower sample rate.

## Workspace Layout

```text
apps/
├── realtime-api/         AWS Lambda handlers for HTTP and WebSocket APIs
└── web/                  React/Vite app, AI, animations, fixtures, and browser tests
packages/
├── game-core/            Shared reducer, validators, deck setup, and domain types
└── multiplayer-protocol/ HTTP and WebSocket DTOs plus redacted client views
infra/
└── terraform/            OpenTofu configuration for the production backend
docs/
├── architecture/         Structural decisions and source-of-truth maps
├── backlog/              Non-normative design notes and proposals
├── monitoring/           Monitoring-specific setup notes
├── protocols/            External and inter-process contracts
└── runbooks/             Operational procedures and validation checklists
```

## Documentation Map

- [docs/README.md](docs/README.md): documentation index for humans and agents
- [AGENTS.md](AGENTS.md): executable guidance for coding agents
- [docs/architecture/source-of-truth.md](docs/architecture/source-of-truth.md): code ownership by domain
- [docs/architecture/runtime-invariants.md](docs/architecture/runtime-invariants.md): invariants that changes must preserve
- [docs/architecture/online-multiplayer.md](docs/architecture/online-multiplayer.md): how the online stack fits together
- [docs/protocols/realtime-events.md](docs/protocols/realtime-events.md): room API and WebSocket contracts
- [docs/runbooks/opentofu-aws-realtime.md](docs/runbooks/opentofu-aws-realtime.md): AWS/OpenTofu bootstrap and deploy flow

## Contributing Notes

Keep the root README short and stable. Low-level agent instructions belong in [AGENTS.md](AGENTS.md), and detailed architecture or operational material belongs under [`docs/`](docs/README.md).
