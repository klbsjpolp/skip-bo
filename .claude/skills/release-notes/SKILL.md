---
name: release-notes
description: Draft release notes from CHANGELOG.md and unreleased commits since the last tag, organized by package scope (web, realtime-api, game-core, multiplayer-protocol)
disable-model-invocation: true
---

# Release Notes Skill

Produce a formatted release-notes draft for the next version by doing the following:

## Steps

1. **Get last tag and unreleased commits**

   ```bash
   git describe --tags --abbrev=0
   git log $(git describe --tags --abbrev=0)..HEAD --oneline --no-merges
   ```

2. **Read context**
   - Read the top 80 lines of `CHANGELOG.md` to confirm scope and format conventions.
   - Note the Angular conventional commit scopes used: `web`, `realtime-api`, `game-core`,
     `multiplayer-protocol`, `ci`, `playwright`, `infra`.

3. **Group commits** by type then by scope:
   - **Features** (`feat`)
   - **Bug Fixes** (`fix`)
   - **Performance** (`perf`)
   - **Other** (chore, build, docs, test, refactor — only include if user-visible)

4. **Flag protocol changes** — if any commit touches `packages/multiplayer-protocol` or
   `apps/realtime-api`, check whether `PWA_MINIMUM_SUPPORTED_VERSION` in `package.json` (or the
   relevant env var) needs bumping, and note it explicitly.

5. **Output** a markdown block ready to paste into the GitHub release or PR description:

   ```
   ## What's changed in vX.Y.Z

   ### Features
   - **[web]** …
   - **[multiplayer-protocol]** …

   ### Bug Fixes
   - **[realtime-api]** …

   ### ⚠️ Protocol change — clients must update
   Bump `PWA_MINIMUM_SUPPORTED_VERSION` if old clients should be force-refreshed.
   ```

Keep the draft concise: one bullet per commit, rephrase for clarity, drop CI-only and docs-only
commits from the user-facing summary unless they affect the published changelog.
