import CONFIG from './config.js';

export class AIStrategy {
    constructor() {
        this.difficulty = CONFIG.AI_DIFFICULTIES.MEDIUM;
    }

    setDifficulty(difficultyLevel) {
        this.difficulty = CONFIG.AI_DIFFICULTIES[difficultyLevel] || CONFIG.AI_DIFFICULTIES.MEDIUM;
    }

    findBestMove(player, buildPiles, gameState) {
        const moves = this.getAllPossibleMoves(player, buildPiles);
        return this.selectBestMove(moves, gameState);
    }

    getAllPossibleMoves(player, buildPiles) {
        const moves = [];

        // Check stock card moves
        if (player.canPlayFromStock()) {
            const stockCard = player.getTopStockCard();
            buildPiles.forEach((pile, pileIndex) => {
                if (this.canPlayCardOnPile(stockCard, pile)) {
                    moves.push({
                        type: 'play',
                        source: 'stock',
                        card: stockCard,
                        targetPile: pileIndex,
                        priority: this.calculatePriority(stockCard, pile, 'stock')
                    });
                }
            });
        }

        // Check hand card moves
        player.hand.forEach((card, cardIndex) => {
            buildPiles.forEach((pile, pileIndex) => {
                if (this.canPlayCardOnPile(card, pile)) {
                    moves.push({
                        type: 'play',
                        source: 'hand',
                        sourceIndex: cardIndex,
                        card: card,
                        targetPile: pileIndex,
                        priority: this.calculatePriority(card, pile, 'hand')
                    });
                }
            });
        });

        // Check discard pile moves
        player.discard.forEach((pile, pileIndex) => {
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                buildPiles.forEach((buildPile, buildPileIndex) => {
                    if (this.canPlayCardOnPile(topCard, buildPile)) {
                        moves.push({
                            type: 'play',
                            source: 'discard',
                            sourceIndex: pileIndex,
                            card: topCard,
                            targetPile: buildPileIndex,
                            priority: this.calculatePriority(topCard, buildPile, 'discard')
                        });
                    }
                });
            }
        });

        // Add discard moves if no play moves available
        if (moves.length === 0 && player.hand.length > 0) {
            player.hand.forEach((card, cardIndex) => {
                player.discard.forEach((pile, pileIndex) => {
                    moves.push({
                        type: 'discard',
                        source: 'hand',
                        sourceIndex: cardIndex,
                        card: card,
                        targetPile: pileIndex,
                        priority: this.calculateDiscardPriority(card, pile)
                    });
                });
            });
        }

        return moves;
    }

    canPlayCardOnPile(card, pile) {
        const topValue = pile.length > 0 ? pile[pile.length - 1] : 0;
        const cardValue = card === 'SB' ? topValue + 1 : card;
        return cardValue === topValue + 1;
    }

    calculatePriority(card, pile, source) {
        let priority = 0;

        // Prioritize stock moves highest
        if (source === 'stock') priority += 100;
        else if (source === 'discard') priority += 50;
        else priority += 25;

        // Prioritize completing a pile
        if (pile.length === 11) priority += 200;

        // Prioritize Skip-Bo cards less (save them for strategic use)
        if (card === 'SB') priority -= 10;

        // Prioritize lower numbered cards to clear them first
        if (typeof card === 'number') {
            priority += (13 - card);
        }

        return priority;
    }

    calculateDiscardPriority(card, pile) {
        // Prefer discarding to empty piles or same-value piles
        if (pile.length === 0) return 10;

        const topCard = pile[pile.length - 1];
        if (topCard === card) return 8;

        // Prefer discarding higher value cards
        if (typeof card === 'number') return card;

        return 1; // Skip-Bo cards
    }

    selectBestMove(moves, gameState) {
        if (moves.length === 0) return null;

        // Separate play moves from discard moves
        const playMoves = moves.filter(move => move.type === 'play');
        const discardMoves = moves.filter(move => move.type === 'discard');

        // Always prefer play moves over discard moves
        if (playMoves.length > 0) {
            // Sort play moves by priority (highest first)
            playMoves.sort((a, b) => b.priority - a.priority);

            // Add some strategic randomness based on difficulty
            if (this.difficulty.name === 'Easy' && Math.random() < 0.15) {
                const randomIndex = Math.floor(Math.random() * Math.min(3, playMoves.length));
                return playMoves[randomIndex];
            } else if (this.difficulty.name === 'Medium' && Math.random() < 0.08) {
                const randomIndex = Math.floor(Math.random() * Math.min(2, playMoves.length));
                return playMoves[randomIndex];
            }

            return playMoves[0];
        }

        // If only discard moves available, use smart discard pile selection
        if (discardMoves.length > 0 && gameState) {
            // Find the best card to discard using our smart strategy
            const player = gameState.currentPlayer || gameState.player;
            const bestCardToDiscard = this.selectCardToDiscard(player, gameState);

            if (bestCardToDiscard) {
                // Find the best pile for this card
                const bestPileIndex = this.selectDiscardPile(player, bestCardToDiscard.card, gameState);

                // Find the corresponding move
                const bestDiscardMove = discardMoves.find(move =>
                    move.sourceIndex === bestCardToDiscard.index &&
                    move.targetPile === bestPileIndex
                );

                if (bestDiscardMove) {
                    return bestDiscardMove;
                }
            }

            // Fallback: use the highest priority discard move
            discardMoves.sort((a, b) => b.priority - a.priority);
            return discardMoves[0];
        }

        return null;
    }

    // Smart discard pile selection for putting cards away
    chooseBestDiscardPile(player, cardToDiscard, buildPiles, opponentPlayer) {
        const discardPiles = player.discard;
        const availablePiles = [];

        // Find available discard piles (empty or can stack)
        for (let i = 0; i < CONFIG.GAME.DISCARD_PILES; i++) {
            if (discardPiles[i].length === 0 || this.canStackOnDiscard(cardToDiscard, discardPiles[i])) {
                availablePiles.push(i);
            }
        }

        if (availablePiles.length === 0) {
            return -1; // No valid discard pile
        }

        // Score each available pile based on strategic value
        const pileScores = availablePiles.map(pileIndex => ({
            pileIndex,
            score: this.scoreDiscardPile(pileIndex, cardToDiscard, player, buildPiles, opponentPlayer)
        }));

        // Sort by score (highest first) and return best pile
        pileScores.sort((a, b) => b.score - a.score);
        return pileScores[0].pileIndex;
    }

    canStackOnDiscard(card, discardPile) {
        // In Skip-Bo, you can only place cards on discard piles in descending order
        // or the same value
        if (discardPile.length === 0) return true;

        const topCard = discardPile[discardPile.length - 1];
        const cardValue = this.getCardValue(card);
        const topValue = this.getCardValue(topCard);

        // Skip-Bo cards can go anywhere
        if (cardValue === 0) return true;

        // Regular cards can only go on same or higher value
        return cardValue <= topValue;
    }

    scoreDiscardPile(pileIndex, card, player, buildPiles, opponentPlayer) {
        let score = 0;
        const discardPile = player.discard[pileIndex];
        const cardValue = this.getCardValue(card);

        // 1. Prefer empty piles to maintain flexibility
        if (discardPile.length === 0) {
            score += 50;
        }

        // 2. Avoid burying useful cards
        if (discardPile.length > 0) {
            const topCard = discardPile[discardPile.length - 1];
            const topValue = this.getCardValue(topCard);

            // Penalty for burying low-value cards that might be needed soon
            if (topValue > 0 && topValue <= 3) {
                score -= 30;
            }

            // Bonus for covering high-value cards that are less immediately useful
            if (topValue > 8) {
                score += 20;
            }
        }

        // 3. Strategic card value considerations
        if (cardValue === 0) { // Skip-Bo card
            // Skip-Bo cards are valuable, but sometimes must be discarded
            score += 10; // Slight preference to keep them accessible
        } else if (cardValue === 1) {
            // 1s are very valuable for starting build piles
            score -= 40;
        } else if (cardValue <= 3) {
            // Low cards are generally more useful
            score -= 20;
        } else if (cardValue >= 10) {
            // High cards are less immediately useful
            score += 15;
        }

        // 4. Consider current build pile states
        const nextNeededValues = this.getNextNeededValues(buildPiles);
        if (nextNeededValues.includes(cardValue)) {
            // This card could be played soon, penalty for discarding
            score -= 25;
        }

        // 5. Consider pile diversity strategy
        const pileTopValues = player.discard.map(pile =>
            pile.length > 0 ? this.getCardValue(pile[pile.length - 1]) : null
        );

        // Bonus for maintaining diverse pile tops
        if (discardPile.length === 0) {
            const existingValues = pileTopValues.filter(v => v !== null);
            if (!existingValues.includes(cardValue)) {
                score += 30; // Good to have different values accessible
            }
        }

        // 6. Opponent blocking consideration (advanced strategy)
        if (this.difficulty.lookahead >= 2) {
            if (this.wouldBlockOpponent(card, opponentPlayer, buildPiles)) {
                score += 25;
            }
        }

        // 7. Pile depth consideration
        if (discardPile.length > 3) {
            // Penalty for very deep piles as cards become less accessible
            score -= (discardPile.length - 3) * 5;
        }

        return score;
    }

    getCardValue(card) {
        if (!card) return -1;
        return card.value || card.number || (card.isSkipBo ? 0 : parseInt(card));
    }

    getNextNeededValues(buildPiles) {
        const needed = [];
        for (let pile of buildPiles) {
            if (pile.length === 0) {
                needed.push(1); // Empty pile needs a 1
            } else if (pile.length < CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
                const topValue = this.getCardValue(pile[pile.length - 1]);
                if (topValue < CONFIG.GAME.MAX_BUILD_PILE_VALUE) {
                    needed.push(topValue + 1);
                }
            }
        }
        return needed;
    }

    wouldBlockOpponent(card, opponent) {
        if (!opponent) return false;

        // Check if opponent has this card value in accessible positions
        const cardValue = this.getCardValue(card);

        // Check opponent's top discard cards
        for (let pile of opponent.discard) {
            if (pile.length > 0) {
                const topCard = pile[pile.length - 1];
                if (this.getCardValue(topCard) === cardValue) {
                    return true; // Opponent has same value accessible
                }
            }
        }

        // Check opponent's stock top card
        const stockTop = opponent.getTopStockCard();
        return stockTop && this.getCardValue(stockTop) === cardValue;
    }

    // Main public method for AI to choose discard pile
    selectDiscardPile(player, cardToDiscard, gameState) {
        const { buildPiles, opponentPlayer } = gameState;

        // Apply difficulty-based decision making
        if (Math.random() < this.difficulty.mistakeChance) {
            // Sometimes make suboptimal moves based on difficulty
            const availablePiles = [];
            for (let i = 0; i < CONFIG.GAME.DISCARD_PILES; i++) {
                if (player.discard[i].length === 0 ||
                    this.canStackOnDiscard(cardToDiscard, player.discard[i])) {
                    availablePiles.push(i);
                }
            }
            return availablePiles[Math.floor(Math.random() * availablePiles.length)];
        }

        return this.chooseBestDiscardPile(player, cardToDiscard, buildPiles, opponentPlayer);
    }

    // Method to choose which card to discard when hand management is needed
    selectCardToDiscard(player, gameState) {
        const { buildPiles } = gameState;
        let worstCard = null;
        let worstScore = Infinity;

        for (let i = 0; i < player.hand.length; i++) {
            const card = player.hand[i];
            const score = this.evaluateCardKeepValue(card, player, buildPiles);

            if (score < worstScore) {
                worstScore = score;
                worstCard = { card, index: i };
            }
        }

        return worstCard;
    }

    evaluateCardKeepValue(card, player, buildPiles) {
        const cardValue = this.getCardValue(card);
        let keepValue = 0;

        // Skip-Bo cards are always valuable
        if (cardValue === 0) {
            keepValue += 100;
        }
        // Low numbers are more valuable for starting/continuing sequences
        else if (cardValue >= 1 && cardValue <= 3) {
            keepValue += 80 - (cardValue * 10);
        }
        // Medium numbers have moderate value
        else if (cardValue >= 4 && cardValue <= 8) {
            keepValue += 50;
        }
        // High numbers are less immediately useful
        else {
            keepValue += 20;
        }

        // Bonus if this card can be played immediately
        const nextNeeded = this.getNextNeededValues(buildPiles);
        if (nextNeeded.includes(cardValue) || cardValue === 0) {
            keepValue += 40;
        }

        return keepValue;
    }
}
