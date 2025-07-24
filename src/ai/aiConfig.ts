/**
 * Configuration options for the AI's discard strategy
 */

export type AIDifficulty = 'easy' | 'medium' | 'hard';

interface StrategyWeights {
  // Weights for findBestDiscardPile
  sameValueGrouping: number;
  sequentialValues: number;
  emptyPilePreference: number;
  highValuePreference: number;
  
  // Weights for selectCardToDiscard
  duplicateCardPriority: number;
  avoidNeededValues: number;
  highValueCardPriority: number;
  
  // Weights for evaluateDiscardMove
  sameValueScore: number;
  sequentialValueScore: number;
  neededValuePenalty: number;
  highValueBonus: number;
  newPilePenalty: number;
  
  // Weights for findBestDiscardPileToPlayFrom
  largerPilePriority: number;
}

interface AIConfig {
  difficulty: AIDifficulty;
  weights: StrategyWeights;
  
  // Delays for AI actions (in milliseconds)
  delays: {
    beforeMove: number;
    afterCardSelection: number;
  };
  
  // Feature toggles
  features: {
    useStrategicDiscardPileSelection: boolean;
    useStrategicCardSelection: boolean;
    useStrategicDiscardPilePlay: boolean;
    useLookAheadStrategy: boolean;
  };
}

// Default weights for medium difficulty
const mediumWeights: StrategyWeights = {
  // findBestDiscardPile weights
  sameValueGrouping: 5,
  sequentialValues: 3,
  emptyPilePreference: 2,
  highValuePreference: 1,
  
  // selectCardToDiscard weights
  duplicateCardPriority: 5,
  avoidNeededValues: 10,
  highValueCardPriority: 3,
  
  // evaluateDiscardMove weights
  sameValueScore: 5,
  sequentialValueScore: 3,
  neededValuePenalty: 10,
  highValueBonus: 0.5,
  newPilePenalty: 2,
  
  // findBestDiscardPileToPlayFrom weights
  largerPilePriority: 2,
};

// Easy difficulty - less strategic
const easyWeights: StrategyWeights = {
  ...mediumWeights,
  sameValueGrouping: 2,
  sequentialValues: 1,
  avoidNeededValues: 5,
  highValueCardPriority: 1,
  neededValuePenalty: 5,
  useLookAheadStrategy: false,
};

// Hard difficulty - more strategic
const hardWeights: StrategyWeights = {
  ...mediumWeights,
  sameValueGrouping: 8,
  sequentialValues: 5,
  avoidNeededValues: 15,
  highValueCardPriority: 4,
  neededValuePenalty: 15,
  highValueBonus: 1,
  largerPilePriority: 3,
};

// Configuration by difficulty level
const configByDifficulty: Record<AIDifficulty, AIConfig> = {
  easy: {
    difficulty: 'easy',
    weights: easyWeights,
    delays: {
      beforeMove: 500,
      afterCardSelection: 600,
    },
    features: {
      useStrategicDiscardPileSelection: true,
      useStrategicCardSelection: false,
      useStrategicDiscardPilePlay: false,
      useLookAheadStrategy: false,
    },
  },
  medium: {
    difficulty: 'medium',
    weights: mediumWeights,
    delays: {
      beforeMove: 400,
      afterCardSelection: 500,
    },
    features: {
      useStrategicDiscardPileSelection: true,
      useStrategicCardSelection: true,
      useStrategicDiscardPilePlay: true,
      useLookAheadStrategy: false,
    },
  },
  hard: {
    difficulty: 'hard',
    weights: hardWeights,
    delays: {
      beforeMove: 300,
      afterCardSelection: 400,
    },
    features: {
      useStrategicDiscardPileSelection: true,
      useStrategicCardSelection: true,
      useStrategicDiscardPilePlay: true,
      useLookAheadStrategy: true,
    },
  },
};

// Current AI configuration - can be changed at runtime
let currentDifficulty: AIDifficulty = 'medium';

/**
 * Get the current AI configuration
 */
export const getAIConfig = (): AIConfig => {
  return configByDifficulty[currentDifficulty];
};

/**
 * Set the AI difficulty level
 * @param difficulty The difficulty level to set
 */
export const setAIDifficulty = (difficulty: AIDifficulty): void => {
  currentDifficulty = difficulty;
};

/**
 * Get the weights for the current difficulty level
 */
export const getWeights = (): StrategyWeights => {
  return configByDifficulty[currentDifficulty].weights;
};

/**
 * Check if a feature is enabled for the current difficulty level
 * @param feature The feature to check
 */
export const isFeatureEnabled = (
  feature: keyof AIConfig['features']
): boolean => {
  return configByDifficulty[currentDifficulty].features[feature];
};

/**
 * Get the delay for an AI action
 * @param delayType The type of delay to get
 */
export const getDelay = (
  delayType: keyof AIConfig['delays']
): number => {
  return configByDifficulty[currentDifficulty].delays[delayType];
};