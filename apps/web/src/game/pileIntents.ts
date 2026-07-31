import type { GameState, MoveResult, SelectedCard } from '@skipbo/game-core';

/**
 * The single statement of "what does pressing a pile do".
 *
 * Every input method the board offers — click, Enter/Space on a focused pile,
 * the keyboard shortcut layer — asks the same three questions of the same game
 * state, and used to answer them separately. The click handlers in
 * `player-area/` and `resolveKeyboardIntent` had drifted into two copies of one
 * rule set, each with comments claiming to mirror the other; the rules now live
 * here and the input layers only translate their own events into a
 * {@link PilePressTarget} and their own side effects out of a {@link BoardIntent}.
 *
 * Pure: no React, no DOM, no dispatch. Everything here is answerable from the
 * game state alone, which is what keeps it exhaustively testable without a
 * rendered board.
 */

/** Where a card is taken from. Derived from the canonical selection so it cannot drift. */
export type CardSource = SelectedCard['source'];

/** A pile the player pressed, whatever the input method was. */
export type PilePressTarget =
  | { kind: 'stock'; playerIndex: number }
  | { kind: 'hand'; playerIndex: number; index: number }
  /** `index` is the discard pile, not a card within it. */
  | { kind: 'discard'; playerIndex: number; index: number };

/**
 * What that press means. Deliberately smaller than the keyboard's intent union:
 * these are only the outcomes a *pile press* can have. Build plays, Escape and
 * the cheat sheet are keyboard-only concerns and stay in `keyboardActions`.
 */
export type BoardIntent =
  | { kind: 'select'; source: CardSource; index: number; discardPileIndex?: number }
  | { kind: 'clearSelection' }
  | { kind: 'discard'; discardPile: number };

/**
 * Whether a card taken from `source` may be discarded. Also answers which
 * discard piles light up as valid drop targets mid-drag, which is the same
 * question asked before the card is selected — hence a predicate rather than a
 * second reading of `selectedCard`.
 */
export const canDiscardFromSource = (source: CardSource): boolean => source === 'hand';

/**
 * Resolves a pile press against the current state, or `null` when the press is
 * inert (not the player's pile, not their turn, an empty slot, an AI seat).
 *
 * The three rules, stated once:
 *
 * 1. A discard pile is a *discard target* while a hand card is selected, and a
 *    *card source* otherwise.
 * 2. Pressing the source that is already selected deselects it.
 * 3. An empty slot is inert as a source.
 *
 * Rule 1 is what preserves the "selection first, then play or discard"
 * invariant: this never plays a card, it only ever selects, deselects, or
 * discards an already-selected one.
 */
export function resolvePileIntent(target: PilePressTarget, gameState: GameState): BoardIntent | null {
  const player = gameState.players[target.playerIndex];

  // An AI seat's piles are rendered but never interactive, and a pile only
  // responds on its owner's turn. Callers may gate further — the keyboard also
  // refuses once the game is over — but never less.
  if (!player || player.isAI || gameState.currentPlayerIndex !== target.playerIndex) {
    return null;
  }

  const { selectedCard } = gameState;

  switch (target.kind) {
    case 'stock': {
      const topIndex = player.stockPile.length - 1;

      if (topIndex < 0) {
        return null;
      }

      // The stock has one pressable card, so its source alone identifies it.
      if (selectedCard?.source === 'stock') {
        return { kind: 'clearSelection' };
      }

      return { kind: 'select', source: 'stock', index: topIndex };
    }

    case 'hand': {
      // Hands are fixed-length arrays with `null` holes, so an in-range index
      // is not proof of a card.
      if (!player.hand[target.index]) {
        return null;
      }

      if (selectedCard?.source === 'hand' && selectedCard.index === target.index) {
        return { kind: 'clearSelection' };
      }

      return { kind: 'select', source: 'hand', index: target.index };
    }

    case 'discard': {
      const pile = player.discardPiles[target.index];

      if (!pile) {
        return null;
      }

      // Rule 1. Checked before the emptiness guard below: an empty pile is a
      // perfectly good discard target, it is only useless as a source.
      if (selectedCard && canDiscardFromSource(selectedCard.source)) {
        return { kind: 'discard', discardPile: target.index };
      }

      if (pile.length === 0) {
        return null;
      }

      if (selectedCard?.source === 'discard' && selectedCard.discardPileIndex === target.index) {
        return { kind: 'clearSelection' };
      }

      return { kind: 'select', source: 'discard', index: pile.length - 1, discardPileIndex: target.index };
    }
  }
}

/** The side effects a resolved intent needs. Supplied by whichever hook owns the game. */
export interface BoardIntentHandlers {
  selectCard: (source: CardSource, index: number, discardPileIndex?: number) => void;
  clearSelection: () => void;
  discardCard: (discardPileIndex: number) => Promise<MoveResult>;
}

/**
 * Performs a resolved intent. Takes `null` so callers can pipe
 * `resolvePileIntent` straight in without repeating the inert-press guard.
 */
export function applyBoardIntent(intent: BoardIntent | null, handlers: BoardIntentHandlers): void {
  if (!intent) {
    return;
  }

  switch (intent.kind) {
    case 'select':
      handlers.selectCard(intent.source, intent.index, intent.discardPileIndex);
      return;
    case 'clearSelection':
      handlers.clearSelection();
      return;
    case 'discard':
      void handlers.discardCard(intent.discardPile);
      return;
  }
}
