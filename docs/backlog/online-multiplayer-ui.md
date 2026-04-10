# Online Multiplayer UI Plan

## Document Contract

- Purpose: capture the current proposal for expanding online multiplayer UI beyond the existing two-player layout.
- Audience: contributors changing the online client, status strip, protocol, or room lifecycle.
- Source of truth: none for runtime behavior; current implementation still lives in code and stable docs.
- When to update: when the proposal changes, a phase lands, or accepted parts graduate into stable docs.

## Current Behavior

- Local games are still human vs AI and should keep the current heads-up board.
- Online games currently reuse the same heads-up board even though the runtime is server-authoritative.
- The existing online status strip is the only always-visible room control surface on the play screen.

Related stable docs:

- [../architecture/online-multiplayer.md](../architecture/online-multiplayer.md)
- [../architecture/runtime-invariants.md](../architecture/runtime-invariants.md)

## Accepted Direction

- Do not add a separate lobby screen.
- Creating an online room should create a room that can accept up to three additional players.
- The current top status component should grow into the waiting-room control surface.
- The host should see a `Démarrer` action that becomes available once at least one other player is connected.
- Starting the game should lock the active seats to the players currently connected.
- Online and local should use separate board-shell components even when a two-player online game resembles local heads-up play.

## Mobile Layout Rule

On mobile, public information stays visible at all times:

- every player's stock top card
- every player's stock count
- the top card of all four discard piles for every player
- the shared center table

Only private information should collapse:

- the local hand can live in an expandable drawer
- remote player detail beyond the public piles can be compact or expandable

## Board Architecture

- `LocalGameBoard` keeps the current human-vs-AI heads-up presentation.
- `OnlineGameBoard` owns waiting-state controls, viewer-relative seat layout, and compact public seat summaries.
- Shared pile and card primitives should remain reusable across both shells.

## Proposed Phases

1. Non-destructive groundwork
   - split local and online board shells
   - make the online status strip seat-count aware
   - preserve current two-player behavior
2. Room and protocol changes
   - support four joinable seats
   - add a host-triggered start action
   - keep waiting/start authority on the server
3. Online board layout
   - compact public seat summaries for all players
   - sticky local public piles on mobile
   - fold only the local hand
4. Online animations
   - replace single-opponent assumptions with viewer-relative seat animation routing
