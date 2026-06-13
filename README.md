# Skip-Bo

[![CI](https://github.com/klbsjpolp/skip-bo/actions/workflows/ci.yml/badge.svg)](https://github.com/klbsjpolp/skip-bo/actions/workflows/ci.yml)
[![Deploy](https://github.com/klbsjpolp/skip-bo/actions/workflows/deploy.yml/badge.svg)](https://github.com/klbsjpolp/skip-bo/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/klbsjpolp/skip-bo/branch/main/graph/badge.svg)](https://codecov.io/gh/klbsjpolp/skip-bo)
[![Latest release](https://img.shields.io/github/v/release/klbsjpolp/skip-bo)](https://github.com/klbsjpolp/skip-bo/releases)
[![License: GPL v3](https://img.shields.io/github/license/klbsjpolp/skip-bo)](LICENSE)
[![Commitizen friendly](https://img.shields.io/badge/commitizen-friendly-brightgreen.svg)](http://commitizen.github.io/cz-cli/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-yellow.svg)](https://conventionalcommits.org)

## Document Contract

- Purpose: onboard human contributors and point them to the right code and docs quickly.
- Audience: humans working on the repo for the first time or returning after a while.
- Source of truth: package scripts, workspace package manifests, and the docs linked from this file.
- When to update: when setup steps, top-level workflows, or contributor-facing entrypoints change.

Skip-Bo is a `pnpm` monorepo with two main concerns:

- a React web app for local play and online play
- shared gameplay and multiplayer packages

The default experience is local play against the built-in AI. The same web app can also create or join private online rooms for two to four human players, backed by the realtime API.

## Quick Start

### Prerequisites

- Node.js `>=22.12.0`
- `pnpm`

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

The game-agnostic relay server lives in the shared
[realtime-infra](https://github.com/klbsjpolp/realtime-infra) repo. Run it from there
(`pnpm dev:api`, listens on `http://127.0.0.1:8787`), then point the web app at it:

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

For a deployed backend, point `VITE_SKIPBO_API_URL` at the shared relay server's HTTP API
base URL. The server and its deployment now live in
[realtime-infra](https://github.com/klbsjpolp/realtime-infra); this repo only builds and
deploys the web frontend.
Frontend deploy also regenerates `apps/web/public/runtime-config.json` with the current app version. Leave `PWA_MINIMUM_SUPPORTED_VERSION` empty for soft update prompts, or set it to a release tag like `v1.4.0` before redeploying when installed PWAs must hard-reload onto a newer build.

## Workspace Layout

```text
apps/
└── web/                  React/Vite app, AI, animations, fixtures, and browser tests
packages/
├── game-core/            Shared reducer, validators, deck setup, and domain types
└── skipbo-runtime/       Host-authoritative Skip-Bo runtime + redacted client views
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
- The relay protocol (`@klbsjpolp/realtime-core`), the WebSocket server, and its AWS/OpenTofu deployment live in [realtime-infra](https://github.com/klbsjpolp/realtime-infra)

## Contributing Notes

Keep the root README short and stable. Low-level agent instructions belong in [AGENTS.md](AGENTS.md), and detailed architecture or operational material belongs under [`docs/`](docs/README.md).
