export class AIStrategy {
    constructor() {
        this.difficulty = 'medium';
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

    selectBestMove(moves) {
        if (moves.length === 0) return null;

        // Sort by priority (highest first)
        moves.sort((a, b) => b.priority - a.priority);

        // Add some randomness for medium difficulty
        if (this.difficulty === 'medium' && Math.random() < 0.1) {
            const randomIndex = Math.floor(Math.random() * Math.min(3, moves.length));
            return moves[randomIndex];
        }

        return moves[0];
    }

    setDifficulty(level) {
        this.difficulty = level; // 'easy', 'medium', 'hard'
    }
}
