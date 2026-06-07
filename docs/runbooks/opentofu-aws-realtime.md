# OpenTofu AWS Realtime Runbook

> **Moved.** The realtime backend (the WebSocket relay server and its AWS/OpenTofu
> deployment) was extracted to the shared
> [realtime-infra](https://github.com/klbsjpolp/realtime-infra) repo, which deploys one
> server shared by every game. This runbook no longer applies to skip-bo.

## Where things live now

- **Server + Terraform + deploy:** `realtime-infra` (`apps/realtime-api`, `infra/terraform`,
  `.github/workflows/deploy-backend.yml`). The backend deploy runbook lives there.
- **This repo (skip-bo):** deploys the **web frontend only** to GitHub Pages via
  `.github/workflows/deploy.yml`. It connects to the shared server through the
  `VITE_SKIPBO_API_URL` secret — no backend infrastructure is managed here.

To point the web app at a backend, set `VITE_SKIPBO_API_URL` to the relay server's HTTP
API base URL (or `http://127.0.0.1:8787` when running `pnpm dev:api` from realtime-infra).
