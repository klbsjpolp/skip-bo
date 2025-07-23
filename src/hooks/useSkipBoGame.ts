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
        // Create a deep copy of the card object
        card = { ...player.hand[index] };
      } else if (source === 'stock') {
        // Create a deep copy of the stock pile array
        player.stockPile = [...player.stockPile];
        // Create a deep copy of the card object
        card = { ...player.stockPile[player.stockPile.length - 1] };
      } else {
        // Create a deep copy of the discard piles array
        player.discardPiles = [...player.discardPiles];
        player.discardPiles[discardPileIndex!] = [...player.discardPiles[discardPileIndex!]];
        // Create a deep copy of the card object
        card = { ...player.discardPiles[discardPileIndex!][player.discardPiles[discardPileIndex!].length - 1] };
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

      // Create a deep copy of the previous state
      const newState = { ...prev };
      
      // Create a deep copy of the build piles
      newState.buildPiles = [...prev.buildPiles];
      
      // Add the selected card to the appropriate build pile
      // Create a deep copy of the specific build pile
      // If the selected card is a Skip-Bo, set its value to the next expected value
      const nextValue = prev.buildPiles[buildPileIndex].length === 0 ? 1 : prev.buildPiles[buildPileIndex][prev.buildPiles[buildPileIndex].length - 1].value + 1;
      const cardToPlay = selectedCard.card.isSkipBo
        ? { isSkipBo: false, value: nextValue }
        : selectedCard.card;
      newState.buildPiles[buildPileIndex] = [...prev.buildPiles[buildPileIndex], cardToPlay];

      // Create a deep copy of the players array
      newState.players = [...prev.players];
      
      // Create a deep copy of the current player
      const player = { ...prev.players[prev.currentPlayerIndex] };
      newState.players[prev.currentPlayerIndex] = player;

      // Remove card from source
      if (selectedCard.source === 'hand') {
        // Create a deep copy of the hand array
        player.hand = [...player.hand];
        player.hand.splice(selectedCard.index, 1);

        // Draw new card only if hand is empty after playing
        if (player.hand.length === 0 && newState.deck.length > 0) {
          // Create a deep copy of the deck array
          newState.deck = [...newState.deck];
          player.hand.push({ ...newState.deck.pop()! });
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
        message: `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}`,
      };
    });

    // Use the same message format as in the state update
    const player = gameState.players[gameState.currentPlayerIndex];
    return { success: true, message: `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}` };
  }, [gameState, canPlayCard]);

  const discardCard = useCallback((discardPileIndex: number): MoveResult => {
    if (!gameState.selectedCard || gameState.selectedCard.source !== 'hand') {
      return { success: false, message: MESSAGES.INVALID_MOVE };
    }
    
    // Prevent discarding Skip-Bo cards
    if (gameState.selectedCard.card.isSkipBo) {
      return { success: false, message: "Vous ne pouvez pas défausser une carte Skip-Bo" };
    }

    setGameState(prev => {
      // Create a deep copy of the previous state
      const newState = { ...prev };
      
      // Create a deep copy of the players array
      newState.players = [...prev.players];
      
      // Create a deep copy of the current player
      const player = { ...prev.players[prev.currentPlayerIndex] };
      newState.players[prev.currentPlayerIndex] = player;
      
      const { selectedCard } = prev;

      if (!selectedCard) return prev;

      // Create a deep copy of the hand array
      player.hand = [...player.hand];

      // Create a deep copy of the discard piles array
      player.discardPiles = [...player.discardPiles];
      
      // Create a deep copy of the specific discard pile
      player.discardPiles[discardPileIndex] = [...player.discardPiles[discardPileIndex]];
      
      // Add a deep copy of the card to the discard pile
      player.discardPiles[discardPileIndex].push({ ...selectedCard.card });

      // Remove card from hand
      player.hand.splice(selectedCard.index, 1);

      // No automatic card drawing after discarding

      // End turn after discarding
      newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;

      // Determine which player's turn is ending and which is starting
      const currentPlayer = prev.players[prev.currentPlayerIndex];
      const nextPlayer = prev.players[1 - prev.currentPlayerIndex];
      
      return {
        ...newState,
        selectedCard: null,
        message: `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`,
      };
    });

    // Use the same message format as in the state update
    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    const nextPlayer = gameState.players[1 - gameState.currentPlayerIndex];
    return { 
      success: true, 
      message: `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`
    };
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

  // Effect to draw cards at the beginning of a player's turn and clear selection between rounds
  useEffect(() => {
    if (!gameState.gameIsOver) {
      setGameState(prev => {
        // Create a deep copy of the previous state
        const newState = { ...prev };
        
        // Clear any selection when changing players/rounds
        newState.selectedCard = null;
        
        const player = prev.players[prev.currentPlayerIndex];

        // Draw cards at the beginning of the turn if hand is not full
        if (player.hand.length < CONFIG.HAND_SIZE && prev.deck.length > 0) {
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
        }

        return newState;
      });
    }
  }, [gameState.currentPlayerIndex, gameState.gameIsOver]);

  // Add AI turn handling effect
  useEffect(() => {
    const handleAITurn = async () => {
      if (gameState.currentPlayerIndex === 1 && !gameState.gameIsOver) {
        setGameState(prev => ({ ...prev, message: "L'IA joue son tour..." }));

        // We don't need to create a copy of the gameState here
        // The AI will directly modify the actual game state through the callbacks
        const success = await makeAIMove(gameState, playCard, discardCard, selectCard);

        // Only change player turn if AI couldn't make a move
        // If AI successfully made a move, the turn change is handled by the discardCard function
        if (!success) {
          // This should only happen if the AI has no cards in hand and can't play from stock or discard piles
          // Check if the AI has cards in hand
          const aiPlayer = gameState.players[1];
          const message = aiPlayer.hand.length > 0 
            ? "L'IA a dû passer son tour. C'est votre tour." // This should never happen with our new logic
            : "L'IA n'a plus de cartes en main et ne peut pas jouer. C'est votre tour.";
          
          // If AI can't make a move, skip turn
          setGameState(prev => ({
            ...prev,
            currentPlayerIndex: 0,
            message: message
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
