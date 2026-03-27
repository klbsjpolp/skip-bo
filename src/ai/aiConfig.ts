export interface AIWeights {
  stockStateBonus: number;
  stockGapPenalty: number;
  skipBoRetentionBonus: number;
  opponentPressurePenalty: number;
  playableTopDiscardBonus: number;
  discardOrganizationBonus: number;
  duplicateDiscardBonus: number;
  neededSoonPenalty: number;
  stockBridgePenalty: number;
  highValueDiscardBonus: number;
  emptyPileBonus: number;
  newPilePenalty: number;
  sameValueDiscardPileBonus: number;
  sequentialDiscardPileBonus: number;
  sameBandDiscardPileBonus: number;
  mismatchedDiscardPilePenalty: number;
  buryUsefulCardPenalty: number;
  clearDiscardPileBonus: number;
  revealPlayableBonus: number;
  revealStockBridgeBonus: number;
  completePileBonus: number;
  playFromStockBonus: number;
  playFromDiscardBonus: number;
  useSkipBoPenalty: number;
  redundantSkipBoPenalty: number;
}

interface AIConfig {
  weights: AIWeights;
  delays: {
    beforeMove: number;
    afterCardSelection: number;
  };
  searchDepth: number;
  randomness: {
    buildPileScoreWindow: number;
    discardPileScoreWindow: number;
    discardCardScoreWindow: number;
    searchScoreWindow: number;
  };
}

const config: AIConfig = {
  weights: {
    stockStateBonus: 30,
    stockGapPenalty: 5,
    skipBoRetentionBonus: 7,
    opponentPressurePenalty: 14,
    playableTopDiscardBonus: 4,
    discardOrganizationBonus: 2,
    duplicateDiscardBonus: 6,
    neededSoonPenalty: 16,
    stockBridgePenalty: 10,
    highValueDiscardBonus: 4,
    emptyPileBonus: 5,
    newPilePenalty: 2,
    sameValueDiscardPileBonus: 7,
    sequentialDiscardPileBonus: 3,
    sameBandDiscardPileBonus: 2,
    mismatchedDiscardPilePenalty: 3,
    buryUsefulCardPenalty: 8,
    clearDiscardPileBonus: 5,
    revealPlayableBonus: 10,
    revealStockBridgeBonus: 8,
    completePileBonus: 16,
    playFromStockBonus: 26,
    playFromDiscardBonus: 8,
    useSkipBoPenalty: 10,
    redundantSkipBoPenalty: 18,
  },
  delays: {
    beforeMove: 300,
    afterCardSelection: 400,
  },
  searchDepth: 4,
  randomness: {
    buildPileScoreWindow: 2,
    discardPileScoreWindow: 2,
    discardCardScoreWindow: 1.5,
    searchScoreWindow: 3,
  },
};

export const getWeights = (): AIWeights => config.weights;

export const getDelay = (delayType: keyof AIConfig['delays']): number =>
  config.delays[delayType];

export const getSearchDepth = (): number => config.searchDepth;

export const getRandomnessWindow = (
  windowType: keyof AIConfig['randomness']
): number => config.randomness[windowType];
