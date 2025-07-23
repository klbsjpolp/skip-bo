import { useState, useCallback, useEffect, useRef } from 'react';
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
  
  // Create a ref to track the current state
  const gameStateRef = useRef<GameState>({
    deck: [],
    buildPiles: Array(CONFIG.BUILD_PILES_COUNT).fill(null).map(() => []),
    players: [createPlayer(false), createPlayer(true)],
    currentPlayerIndex: 0,
    gameIsOver: false,
    selectedCard: null,
    message: '',
  });
  
  // Function to get the latest game state
  const getLatestGameState = useCallback(() => {
    // Return a deep copy of the current state
    return JSON.parse(JSON.stringify(gameStateRef.current));
  }, []);
  
  const [gameState, setGameState] = useState<GameState>(() => gameStateRef.current);
  
  // Update the ref whenever the state changes
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

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

      // Gather debug info
      const playerHand = player.hand.map(c => c.value);
      const topDeckCard = player.stockPile.length > 0 ? player.stockPile[player.stockPile.length - 1].value : null;
      const topDiscardPiles = player.discardPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
      const topBuildPiles = prev.buildPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);

      if (source === 'hand') {
        // Create a deep copy of the hand array
        player.hand = [...player.hand];
        // Create a deep copy of the card object
        card = { ...player.hand[index] };
        console.log(`[SelectCard] Action: select, Player: ${player.isAI ? 'AI' : 'Human'}, Source: hand, Index: ${index}, Card:`, card,
          `| Hand:`, playerHand,
          `| TopDeck:`, topDeckCard,
          `| TopDiscardPiles:`, topDiscardPiles,
          `| TopBuildPiles:`, topBuildPiles
        );
      } else if (source === 'stock') {
        // Create a deep copy of the stock pile array
        player.stockPile = [...player.stockPile];
        // Create a deep copy of the card object
        card = { ...player.stockPile[player.stockPile.length - 1] };
        console.log(`[SelectCard] Action: select, Player: ${player.isAI ? 'AI' : 'Human'}, Source: stock, Card:`, card,
          `| Hand:`, playerHand,
          `| TopDeck:`, topDeckCard,
          `| TopDiscardPiles:`, topDiscardPiles,
          `| TopBuildPiles:`, topBuildPiles
        );
      } else {
        // Create a deep copy of the discard piles array
        player.discardPiles = [...player.discardPiles];
        player.discardPiles[discardPileIndex!] = [...player.discardPiles[discardPileIndex!]];
        // Create a deep copy of the card object
        card = { ...player.discardPiles[discardPileIndex!][player.discardPiles[discardPileIndex!].length - 1] };
        console.log(`[SelectCard] Action: select, Player: ${player.isAI ? 'AI' : 'Human'}, Source: discard, Pile: ${discardPileIndex}, Card:`, card,
          `| Hand:`, playerHand,
          `| TopDeck:`, topDeckCard,
          `| TopDiscardPiles:`, topDiscardPiles,
          `| TopBuildPiles:`, topBuildPiles
        );
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

  const playCard = useCallback((buildPileIndex: number): Promise<MoveResult> => {
    return new Promise((resolve) => {
      setGameState(prev => {
        const { selectedCard } = prev;

        // Perform validation using the latest state
        if (!selectedCard) {
          resolve({ success: false, message: MESSAGES.INVALID_MOVE_NO_SELECTION });
          return prev;
        }

        if (!canPlayCard(selectedCard.card, buildPileIndex, prev)) {
          resolve({ success: false, message: MESSAGES.INVALID_MOVE_CANNOT_PLAY });
          return prev;
        }

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

          // Draw new cards only if hand is empty after playing
          if (player.hand.length === 0 && newState.deck.length > 0) {
            // Create a deep copy of the deck array
            newState.deck = [...newState.deck];

            // Draw up to CONFIG.HAND_SIZE cards
            const cardsNeeded = CONFIG.HAND_SIZE;
            const cardsToDraw = Math.min(cardsNeeded, newState.deck.length);

            for (let i = 0; i < cardsToDraw; i++) {
              const drawnCard = newState.deck.pop()!;

              // Validate that the drawn card has a valid value
              if (drawnCard.value === undefined) {
                console.error('Error: Drawn card has undefined value', drawnCard);
                // Create a valid card instead of using an invalid one
                player.hand.push({ value: 1, isSkipBo: false });
              } else {
                // Add a deep copy of the card with explicit properties
                player.hand.push({
                  value: drawnCard.value,
                  isSkipBo: drawnCard.isSkipBo
                });
              }
            }
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
          resolve({ success: true, message: `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}` });
          return {
            ...newState,
            selectedCard: null,
          };
        }

        // Gather debug info
        // Use the player object from above (already declared)
        const playerHand = player.hand.map(c => c.value);
        const topDeckCard = player.stockPile.length > 0 ? player.stockPile[player.stockPile.length - 1].value : null;
        const topDiscardPiles = player.discardPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
        const topBuildPiles = prev.buildPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
        const buildPile = prev.buildPiles[buildPileIndex];
        const prevTop = buildPile.length > 0 ? buildPile[buildPile.length - 1].value : null;

        console.log(`[PlayCard] Action: play, Player: ${player.isAI ? 'AI' : 'Human'}, Source: ${selectedCard.source}, Card:`, selectedCard.card,
          `| BuildPile: ${buildPileIndex}, PreviousTop: ${prevTop}`,
          `| Hand:`, playerHand,
          `| TopDeck:`, topDeckCard,
          `| TopDiscardPiles:`, topDiscardPiles,
          `| TopBuildPiles:`, topBuildPiles
        );

        // Resolve with success result
        resolve({ success: true, message: `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}` });

        return {
          ...newState,
          selectedCard: null,
          message: `${player.isAI ? "L'IA a joué une carte" : "Vous avez joué une carte"}`,
        };
      });
    });
  }, [canPlayCard]);

  const discardCard = useCallback((discardPileIndex: number): Promise<MoveResult> => {
    return new Promise((resolve) => {
      setGameState(prev => {
        const { selectedCard } = prev;

        // Perform validation using the latest state
        if (!selectedCard) {
          resolve({ success: false, message: MESSAGES.INVALID_MOVE_NO_SELECTION });
          return prev;
        }
        if (selectedCard.source !== 'hand') {
          resolve({ success: false, message: MESSAGES.INVALID_MOVE_MUST_DISCARD_FROM_HAND });
          return prev;
        }
        
        // Prevent discarding Skip-Bo cards
        if (selectedCard.card.isSkipBo) {
          resolve({ success: false, message: MESSAGES.INVALID_MOVE_CANNOT_DISCARD_SKIP_BO });
          return prev;
        }

        // Create a deep copy of the previous state
        const newState = { ...prev };
        
        // Create a deep copy of the players array
        newState.players = [...prev.players];
        
        // Create a deep copy of the current player
        const player = { ...prev.players[prev.currentPlayerIndex] };
        newState.players[prev.currentPlayerIndex] = player;

        // Create a deep copy of the hand array
        player.hand = [...player.hand];

        // Create a deep copy of the discard piles array
        player.discardPiles = [...player.discardPiles];
        
        // Create a deep copy of the specific discard pile
        player.discardPiles[discardPileIndex] = [...player.discardPiles[discardPileIndex]];
        
        // Validate that the card has a valid value before adding it to the discard pile
        if (selectedCard.card.value === undefined) {
          console.error('Error: Attempting to discard a card with undefined value', selectedCard.card);
          resolve({ success: false, message: 'Error: Invalid card value' });
          return prev;
        }
        
        // Add a deep copy of the card to the discard pile with explicit value and isSkipBo properties
        player.discardPiles[discardPileIndex].push({
          value: selectedCard.card.value,
          isSkipBo: selectedCard.card.isSkipBo
        });

        // Remove card from hand
        player.hand.splice(selectedCard.index, 1);

        // Gather debug info
        const playerHand = player.hand.map(c => c.value);
        const topDeckCard = player.stockPile.length > 0 ? player.stockPile[player.stockPile.length - 1].value : null;
        const topDiscardPiles = player.discardPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);
        const topBuildPiles = prev.buildPiles.map(pile => pile.length > 0 ? pile[pile.length - 1].value : null);

        // Debug log before discarding card
        console.log(`[DiscardCard] Action: discard, Player: ${player.isAI ? 'AI' : 'Human'}, Card:`, selectedCard.card,
          `| To DiscardPile: ${discardPileIndex}`,
          `| Hand:`, playerHand,
          `| TopDeck:`, topDeckCard,
          `| TopDiscardPiles:`, topDiscardPiles,
          `| TopBuildPiles:`, topBuildPiles
        );

        // No automatic card drawing after discarding

        // End turn after discarding
        newState.currentPlayerIndex = 1 - newState.currentPlayerIndex;

        // Determine which player's turn is ending and which is starting
        const currentPlayer = prev.players[prev.currentPlayerIndex];
        const nextPlayer = prev.players[1 - prev.currentPlayerIndex];
        
        // Resolve with success result
        resolve({ 
          success: true, 
          message: `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`
        });
        
        return {
          ...newState,
          selectedCard: null,
          message: `${currentPlayer.isAI ? "Tour de l'IA terminé" : "Votre tour est terminé"}. ${nextPlayer.isAI ? "L'IA joue maintenant" : "C'est votre tour"}`,
        };
      });
    });
  }, []);

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
    // Only run this effect when it's the AI's turn
    if (gameState.currentPlayerIndex !== 1 || gameState.gameIsOver) {
      return;
    }

    const handleAITurn = async () => {
      setGameState(prev => ({ ...prev, message: "L'IA joue son tour..." }));

      // Use a callback to get the latest game state
      setGameState(prev => {
        // Use the latest game state for AI decision-making
        const latestGameState = { ...prev };
        
        // Schedule the AI move asynchronously
        setTimeout(async () => {
          const success = await makeAIMove(
            latestGameState, 
            playCard, 
            discardCard, 
            selectCard, 
            clearSelection,
            getLatestGameState
          );
          
          // Only change player turn if AI couldn't make a move
          // If AI successfully made a move, the turn change is handled by the discardCard function
          if (!success) {
            // This should only happen if the AI has no cards in hand and can't play from stock or discard piles
            // Check if the AI has cards in hand
            const aiPlayer = latestGameState.players[1];
            const message = aiPlayer.hand.length > 0 
              ? "L'IA a dû passer son tour. C'est votre tour." // This should never happen with our new logic
              : "L'IA n'a plus de cartes en main et ne peut pas jouer. C'est votre tour.";
            
            // If AI can't make a move, skip turn
            setGameState(prevState => ({
              ...prevState,
              currentPlayerIndex: 0,
              message: message
            }));
          }
        }, 100);
        
        // Return the state with the message updated
        return latestGameState;
      });
    };

    // Add a small delay before AI starts thinking
    const timer = setTimeout(handleAITurn, 500);
    return () => clearTimeout(timer);
  }, [gameState.currentPlayerIndex, gameState.gameIsOver]);

  return {
    gameState,
    initializeGame,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
    canPlayCard,
    getLatestGameState,
  };
};
