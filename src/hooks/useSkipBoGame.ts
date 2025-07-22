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
      // Create a deep copy of the previous state
      const newState = { ...prev };
      // Create a deep copy of the players array
      newState.players = [...prev.players];
      // Create a deep copy of the current player
      const player = { ...prev.players[prev.currentPlayerIndex] };
      newState.players[prev.currentPlayerIndex] = player;

      let card: Card;

      if (source === 'hand') {
        // Create a deep copy of the hand array
        player.hand = [...player.hand];
        card = player.hand[index];
      } else if (source === 'stock') {
        // Create a deep copy of the stock pile array
        player.stockPile = [...player.stockPile];
        card = player.stockPile[player.stockPile.length - 1];
      } else {
        // Create a deep copy of the discard piles array
        player.discardPiles = [...player.discardPiles];
        player.discardPiles[discardPileIndex!] = [...player.discardPiles[discardPileIndex!]];
        card = player.discardPiles[discardPileIndex!][player.discardPiles[discardPileIndex!].length - 1];
      }

      return {
        ...newState,
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
      const { selectedCard } = prev;

      if (!selectedCard) return prev;

      const newState = {
        ...prev,
        buildPiles: prev.buildPiles.map((pile, idx) =>
          idx === buildPileIndex ? [...pile, selectedCard.card] : pile
        )
      };

      // Create a deep copy of the player object
      const player = { ...newState.players[newState.currentPlayerIndex] };
      newState.players[newState.currentPlayerIndex] = player;

      // Remove card from source
      if (selectedCard.source === 'hand') {
        // Create a deep copy of the hand array
        player.hand = [...player.hand];
        player.hand.splice(selectedCard.index, 1);

        // Draw new card only if hand is empty after playing
        if (player.hand.length === 0 && newState.deck.length > 0) {
          // Create a deep copy of the deck array
          newState.deck = [...newState.deck];
          player.hand.push(newState.deck.pop()!);
        }
      } else if (selectedCard.source === 'stock') {
        // Create a deep copy of the stock pile array
        player.stockPile = [...player.stockPile];
        player.stockPile.pop();
      } else if (selectedCard.source === 'discard' && selectedCard.discardPileIndex !== undefined) {
        // Create a deep copy of the discard piles array
        player.discardPiles = [...player.discardPiles];
        player.discardPiles[selectedCard.discardPileIndex] = [...player.discardPiles[selectedCard.discardPileIndex]];
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
      const player = { ...newState.players[newState.currentPlayerIndex] };
      newState.players[newState.currentPlayerIndex] = player;
      const { selectedCard } = prev;

      if (!selectedCard) return prev;

      // Create a deep copy of the hand array
      player.hand = [...player.hand];

      // Add card to discard pile
      // Create a deep copy of the discard pile
      player.discardPiles = [...player.discardPiles];
      player.discardPiles[discardPileIndex] = [...player.discardPiles[discardPileIndex], selectedCard.card];

      // Remove card from hand
      player.hand.splice(selectedCard.index, 1);

      // No automatic card drawing after discarding

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
    setGameState(prev => {
      // Create a deep copy of the previous state
      const newState = { ...prev };

      return {
        ...newState,
        selectedCard: null,
        message: MESSAGES.SELECT_CARD,
      };
    });
  }, []);

  // Effect to draw cards at the beginning of a player's turn
  useEffect(() => {
    if (!gameState.gameIsOver) {
      setGameState(prev => {
        const player = prev.players[prev.currentPlayerIndex];

        // Draw cards at the beginning of the turn if hand is not full
        if (player.hand.length < CONFIG.HAND_SIZE && prev.deck.length > 0) {
          const newState = { ...prev };

          // Create a deep copy of the player object
          const newPlayer = { ...player };
          newState.players = [...newState.players];
          newState.players[newState.currentPlayerIndex] = newPlayer;

          // Create a deep copy of the hand array
          newPlayer.hand = [...newPlayer.hand];

          // Create a deep copy of the deck array
          newState.deck = [...newState.deck];

          const cardsNeeded = CONFIG.HAND_SIZE - newPlayer.hand.length;
          const cardsToDraw = Math.min(cardsNeeded, newState.deck.length);

          for (let i = 0; i < cardsToDraw; i++) {
            newPlayer.hand.push(newState.deck.pop()!);
          }

          return newState;
        }

        return prev;
      });
    }
  }, [gameState.currentPlayerIndex, gameState.gameIsOver]);

  // Add AI turn handling effect
  useEffect(() => {
    const handleAITurn = async () => {
      if (gameState.currentPlayerIndex === 1 && !gameState.gameIsOver) {
        setGameState(prev => ({ ...prev, message: MESSAGES.AI_THINKING }));

        // Create a deep copy of the gameState to avoid race conditions
        const gameStateCopy = JSON.parse(JSON.stringify(gameState));

        const success = await makeAIMove(gameStateCopy, playCard, discardCard, selectCard);

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
  }, [gameState.currentPlayerIndex, gameState.gameIsOver, makeAIMove, playCard, discardCard, selectCard]);

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
