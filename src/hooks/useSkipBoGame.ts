import { useState, useCallback, useEffect } from 'react';
import { GameState, Card, Player, MoveResult } from '@/types';
import { CONFIG, CARD_VALUES, MESSAGES } from '@/lib/config';
import { useAIPlayer } from '@/hooks/useAIPlayer';

const createCard = (value: number): Card => ({
  value,
  isSkipBo: value === CARD_VALUES.SKIP_BO,
});

const createDeck = (): Card[] => {
  const deck: Card[] = [];

  // Add Skip-Bo cards
  for (let i = 0; i < CONFIG.SKIP_BO_CARDS; i++) {
    deck.push(createCard(CARD_VALUES.SKIP_BO));
  }

  // Add numbered cards (12 of each number 1-12)
  for (let value = CARD_VALUES.MIN; value <= CARD_VALUES.MAX; value++) {
    for (let i = 0; i < 12; i++) {
      deck.push(createCard(value));
    }
  }

  return shuffleDeck(deck);
};

const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const createPlayer = (isAI: boolean): Player => ({
  isAI,
  stockPile: [],
  hand: [],
  discardPiles: Array(CONFIG.DISCARD_PILES_COUNT).fill(null).map(() => []),
});

export const useSkipBoGame = () => {
  const { makeAIMove } = useAIPlayer();
  const [gameState, setGameState] = useState<GameState>(() => ({
    deck: [],
    buildPiles: Array(CONFIG.BUILD_PILES_COUNT).fill(null).map(() => []),
    players: [createPlayer(false), createPlayer(true)],
    currentPlayerIndex: 0,
    gameIsOver: false,
    selectedCard: null,
    message: '',
  }));

  const initializeGame = useCallback(() => {
    const deck = createDeck();
    const players = [createPlayer(false), createPlayer(true)];

    // Deal stock piles
    players.forEach(player => {
      player.stockPile = deck.splice(0, CONFIG.STOCK_SIZE);
    });

    // Deal initial hands
    players.forEach(player => {
      player.hand = deck.splice(0, CONFIG.HAND_SIZE);
    });

    setGameState({
      deck,
      buildPiles: Array(CONFIG.BUILD_PILES_COUNT).fill(null).map(() => []),
      players,
      currentPlayerIndex: 0,
      gameIsOver: false,
      selectedCard: null,
      message: MESSAGES.GAME_START,
    });
  }, []);

  const selectCard = useCallback((source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
    setGameState(prev => {
      const player = prev.players[prev.currentPlayerIndex];
      let card: Card;

      if (source === 'hand') {
        card = player.hand[index];
      } else if (source === 'stock') {
        card = player.stockPile[player.stockPile.length - 1];
      } else {
        card = player.discardPiles[discardPileIndex!][player.discardPiles[discardPileIndex!].length - 1];
      }

      return {
        ...prev,
        selectedCard: { card, source, index, discardPileIndex },
        message: MESSAGES.SELECT_DESTINATION,
      };
    });
  }, []);

  const canPlayCard = useCallback((card: Card, buildPileIndex: number, gameState: GameState): boolean => {
    const buildPile = gameState.buildPiles[buildPileIndex];

    if (buildPile.length === 0) {
      return card.isSkipBo || card.value === 1;
    }

    const topCard = buildPile[buildPile.length - 1];
    const expectedValue = topCard.value + 1;

    if (expectedValue > 12) return false;

    return card.isSkipBo || card.value === expectedValue;
  }, []);

  const playCard = useCallback((buildPileIndex: number): MoveResult => {
    if (!gameState.selectedCard) {
      return { success: false, message: MESSAGES.INVALID_MOVE };
    }

    if (!canPlayCard(gameState.selectedCard.card, buildPileIndex, gameState)) {
      return { success: false, message: MESSAGES.INVALID_MOVE };
    }

    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players[newState.currentPlayerIndex];
      const { selectedCard } = prev;

      if (!selectedCard) return prev;

      // Add card to build pile
      newState.buildPiles[buildPileIndex].push(selectedCard.card);

      // Remove card from source
      if (selectedCard.source === 'hand') {
        player.hand.splice(selectedCard.index, 1);
        // Draw new card if possible
        if (newState.deck.length > 0) {
          player.hand.push(newState.deck.pop()!);
        }
      } else if (selectedCard.source === 'stock') {
        player.stockPile.pop();
      } else if (selectedCard.source === 'discard' && selectedCard.discardPileIndex !== undefined) {
        player.discardPiles[selectedCard.discardPileIndex].pop();
      }

      // Check if build pile is complete (12 cards)
      if (newState.buildPiles[buildPileIndex].length === 12) {
        newState.buildPiles[buildPileIndex] = [];
      }

      // Check win condition
      if (player.stockPile.length === 0) {
        newState.gameIsOver = true;
        newState.message = `${player.isAI ? 'IA' : 'Joueur'} ${MESSAGES.GAME_WON}`;
        return {
          ...newState,
          selectedCard: null,
        };
      }

      return {
        ...newState,
        selectedCard: null,
        message: MESSAGES.CARD_PLAYED,
      };
    });

    return { success: true, message: MESSAGES.CARD_PLAYED };
  }, [gameState, canPlayCard]);

  const discardCard = useCallback((discardPileIndex: number): MoveResult => {
    if (!gameState.selectedCard || gameState.selectedCard.source !== 'hand') {
      return { success: false, message: MESSAGES.INVALID_MOVE };
    }

    setGameState(prev => {
      const newState = { ...prev };
      const player = newState.players[newState.currentPlayerIndex];
      const { selectedCard } = prev;

      if (!selectedCard) return prev;

      // Add card to discard pile
      player.discardPiles[discardPileIndex].push(selectedCard.card);

      // Remove card from hand
      player.hand.splice(selectedCard.index, 1);

      // Draw new card if possible
      if (newState.deck.length > 0) {
        player.hand.push(newState.deck.pop()!);
      }

      // End turn after discarding
      newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;

      return {
        ...newState,
        selectedCard: null,
        message: MESSAGES.TURN_ENDED,
      };
    });

    return { success: true, message: MESSAGES.TURN_ENDED };
  }, [gameState.selectedCard]);

  const clearSelection = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      selectedCard: null,
      message: MESSAGES.SELECT_CARD,
    }));
  }, []);

  // Add AI turn handling effect
  useEffect(() => {
    const handleAITurn = async () => {
      if (gameState.currentPlayerIndex === 1 && !gameState.gameIsOver) {
        setGameState(prev => ({ ...prev, message: MESSAGES.AI_THINKING }));

        const success = await makeAIMove(gameState, playCard, discardCard, selectCard);

        if (!success) {
          // If AI can't make a move, skip turn
          setGameState(prev => ({
            ...prev,
            currentPlayerIndex: 0,
            message: "Tour de l'IA terminé"
          }));
        }
      }
    };

    // Add a small delay before AI starts thinking
    const timer = setTimeout(handleAITurn, 500);
    return () => clearTimeout(timer);
  }, [gameState, makeAIMove, playCard, discardCard, selectCard]);

  return {
    gameState,
    initializeGame,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
    canPlayCard,
  };
};
