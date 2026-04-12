import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import { initialGameState, type Card, type GameState } from '@skipbo/game-core';

import { OnlineGameBoard } from '@/components/OnlineGameBoard';

vi.mock('@/contexts/useCardAnimation', () => ({
  useCardAnimation: () => ({
    activeAnimations: [],
    isCardBeingAnimated: () => false,
    removeAnimation: vi.fn(),
    startAnimation: vi.fn(),
    waitForAnimations: vi.fn(async () => undefined),
  }),
}));

const card = (value: number, isSkipBo = false): Card => ({ value, isSkipBo });

const createOnlineState = (): GameState => {
  const state = initialGameState({ playerCount: 4 });
  const remoteHand = [card(1), card(2), card(3), card(4), card(5)];

  state.players = state.players.map((player, playerIndex) => ({
    ...player,
    discardPiles: player.discardPiles.map(() => []),
    hand: playerIndex === 0 ? player.hand : remoteHand.map((handCard) => ({ ...handCard })),
    isAI: playerIndex !== 0,
    kind: 'human',
    name: `Joueur ${playerIndex + 1}`,
    seatIndex: playerIndex,
    stockPile: [],
  }));

  state.players[1].stockPile = [card(3)];
  state.players[1].discardPiles[0] = [card(8)];
  state.players[2].stockPile = [card(4)];
  state.players[2].discardPiles[1] = [card(9)];
  state.players[3].stockPile = [card(5)];
  state.players[3].discardPiles[2] = [card(10)];
  state.message = 'En attente du démarrage';

  return state;
};

const createTwoPlayerOnlineState = (): GameState => {
  const state = initialGameState({ playerCount: 2 });

  state.players = state.players.map((player, playerIndex) => ({
    ...player,
    isAI: playerIndex !== 0,
    kind: 'human',
    seatIndex: playerIndex,
  }));
  state.message = "C'est votre tour";

  return state;
};

describe('OnlineGameBoard', () => {
  test('renders a heads-up player area for the opponent in two-player online games', () => {
    const { container } = render(
      <OnlineGameBoard
        gameState={createTwoPlayerOnlineState()}
        selectCard={vi.fn()}
        playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
        discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
        clearSelection={vi.fn()}
        canPlayCard={() => false}
      />,
    );

    expect(container.querySelectorAll('.player-area')).toHaveLength(2);
    expect(screen.getByTestId('ai-player-area')).toBeTruthy();
    expect(screen.getByTestId('human-player-area')).toBeTruthy();
    expect(container.querySelectorAll('[data-testid="ai-player-area"] .hand-area .back')).toHaveLength(5);
  });

  test('renders remote seats with player-area styling and without opponent labels', () => {
    const { container } = render(
      <OnlineGameBoard
        gameState={createOnlineState()}
        selectCard={vi.fn()}
        playCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
        discardCard={vi.fn(async () => ({ success: true, message: 'ok' }))}
        clearSelection={vi.fn()}
        canPlayCard={() => false}
      />,
    );

    expect(container.querySelectorAll('.player-area')).toHaveLength(4);
    expect(screen.queryByText(/Adversaire/)).toBeNull();
    expect(screen.queryByText('Tour')).toBeNull();
    expect(screen.getByText('Joueur 2')).toBeTruthy();
    expect(screen.getByText('Joueur 3')).toBeTruthy();
    expect(screen.getByText('Joueur 4')).toBeTruthy();
    expect(container.querySelectorAll('.player-area[data-player-index="1"] .hand-area .back')).toHaveLength(5);
    expect(container.querySelectorAll('.player-area[data-player-index="2"] .hand-area .back')).toHaveLength(5);
    expect(container.querySelectorAll('.player-area[data-player-index="3"] .hand-area .back')).toHaveLength(5);
  });
});
