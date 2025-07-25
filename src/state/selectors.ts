import { GameState, AIDifficulty } from '@/types';

// Selector to get the current AI difficulty
export const selectDifficulty = (state: GameState): AIDifficulty => state.aiDifficulty;