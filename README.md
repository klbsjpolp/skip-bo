# Skip-Bo React Application

A Skip-Bo implementation built with React 18, TypeScript, and Vite. The project uses an XState state machine for turn orchestration, a heuristic AI opponent, and animated card movement for both human and AI actions.

## Current Features

- Human vs AI gameplay
- XState-driven turn flow for draw, think, animate, and resolve phases
- Strategic AI with stock-first search, planned move targets, and improved Skip-Bo/discard heuristics
- Automatic hand refill and completed-pile reshuffling
- 13 visual themes
- PWA registration for offline-ready builds
- Vitest coverage for reducer, state machine, and key card behaviors
- Playwright coverage for theme, layout, and accessibility regressions

## Tech Stack

- React 18
- TypeScript 5
- Vite 5
- XState 5
- Immer
- Tailwind CSS 4
- Radix UI primitives
- `next-themes`
- `lucide-react`
- Vitest and Testing Library
- `vite-plugin-pwa` / Workbox

## Getting Started

### Prerequisites

- Node.js 18 or later
- `pnpm`

### Install and Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Sentry Setup

Browser tracking only works when the Vite runtime DSN is present. Create a local env file with:

```bash
cp .env.example .env.local
```

Then set:

```bash
VITE_SENTRY_DSN=your_browser_dsn
```

`VITE_SENTRY_DSN` is the value read by [`src/instrument.ts`](/Users/pierreluc/Development/skip-bo/src/instrument.ts). Without it, the SDK loads but sends nothing.

For GitHub Pages builds, add these repository secrets so the Actions build step can inject them during `vite build`:

- `VITE_SENTRY_DSN`
- `SENTRY_AUTH_TOKEN`

The workflow already sets `SENTRY_ORG=pierre-luc`, `SENTRY_PROJECT=skip-bo`, and `VITE_APP_VERSION` from the commit SHA.

To verify the integration after deploy, open DevTools, filter the Network tab by `envelope`, and reload the page. With the DSN configured, you should see requests to Sentry on page load. Do not test by throwing an error directly in the browser console; Sentry documents that DevTools-triggered errors are sandboxed and will not be reported.

## Scripts

- `pnpm dev` starts the Vite dev server
- `pnpm build` runs TypeScript compilation and creates a production build
- `pnpm preview` serves the production build locally
- `pnpm lint` runs ESLint
- `pnpm test` runs the Vitest suite
- `pnpm test:e2e` runs the Playwright UI suite
- `pnpm test:visual` runs the desktop visual-regression suite
- `pnpm test:visual:update` refreshes desktop visual baselines
- `pnpm typecheck` runs `tsc --noEmit`

## Project Structure

```text
src/
├── ai/           AI decision logic, heuristics, search, and strategy notes
├── components/   Game board, player areas, controls, and UI primitives
├── contexts/     Animation context and provider
├── hooks/        Main gameplay hook used by the app shell
├── lib/          Validators, config, and shared utilities
├── services/     AI and draw animation orchestration
├── state/        Deck setup, reducer, selectors, and XState machine
├── themes/       Theme CSS files
├── types/        Shared TypeScript types
└── utils/        Positioning helpers for animations
```

## Gameplay and AI Notes

- `players[0]` is the human player and `players[1]` is the AI player.
- The UI renders the AI area first, so DOM order does not match player index. This matters in animation code.
- Hands use fixed-size arrays with `null` slots. Removing a hand card should set the slot to `null`, not splice the array.
- AI turns are driven by [`src/state/gameMachine.ts`](/Users/pierreluc/Development/skip-bo/src/state/gameMachine.ts).
- The AI entry point is [`src/ai/computeBestMove.ts`](/Users/pierreluc/Development/skip-bo/src/ai/computeBestMove.ts).
- The AI always runs with the strongest strategy profile; there is no user-facing difficulty mode anymore.
- AI card selection now keeps its planned destination between `SELECT_CARD` and the following resolver step.
- The AI search simulates short turn sequences through the reducer, so it can prefer moves that unblock its stock pile a few actions later.
- Completed build piles move into `completedBuildPiles` and are reshuffled back into `deck` when necessary.

## Themes

Available themes:

- Light
- Dark
- Pastel
- Bonbon
- Rainbow
- Metro
- Neon
- Retro
- Espace
- Glass
- Wool
- Minecraft
- Steampunk

## UI Regression Testing

- Desktop visual baselines live in `tests/ui/*.spec.ts-snapshots/`, are generated from Playwright on Chromium, and are stored in Git LFS when committed.
- Deterministic UI fixtures are available in development with `?fixture=ready-human`, `?fixture=selected-hand`, `?fixture=ai-turn`, and `?fixture=victory-human`.
- Playwright projects collect tests by `@desktop` and `@mobile` tags so CI only runs the cases that apply to each runner profile.
- Theme switching tests set `localStorage.theme` directly for coverage, with one separate test that changes the theme through the live switcher.
- Screenshot assertions are skipped when the matching baseline file is absent, so the functional UI checks can still run on branches without committed snapshots.
- Mobile smoke coverage currently checks horizontal overflow on representative themes rather than maintaining a second visual baseline set.

## Documentation

- [`README.md`](/Users/pierreluc/Development/skip-bo/README.md): high-level project overview
- [`src/ai/README.md`](/Users/pierreluc/Development/skip-bo/src/ai/README.md): AI architecture and strategy behavior
- [`AGENTS.md`](/Users/pierreluc/Development/skip-bo/AGENTS.md): working notes for AI/code agents
- [`src/ai/discardStrategy.md`](/Users/pierreluc/Development/skip-bo/src/ai/discardStrategy.md): AI strategy notes and backlog
