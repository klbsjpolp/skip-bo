import type { SoundEventId, SoundRecipe, SoundTheme, SoundThemeId } from '../types';
import { baseTheme } from './base';
import { retroTheme } from './retro';

/**
 * Registry of sound themes keyed by sound-theme id (`base` + the visual
 * `theme-*` ids). `base` is authored in full; flavored themes override only the
 * events they re-voice. Add a theme by importing it here.
 */
const soundThemes: Partial<Record<SoundThemeId, SoundTheme>> = {
  'theme-retro': retroTheme,
};

/**
 * Resolve the recipe for an event under a theme, falling back per-event to the
 * fully-authored base palette. Returns null only if the event is missing from
 * base (which should never happen — base is exhaustive).
 */
export function resolveRecipe(themeId: SoundThemeId, eventId: SoundEventId): SoundRecipe | null {
  return soundThemes[themeId]?.[eventId] ?? baseTheme[eventId] ?? null;
}

export { baseTheme, retroTheme, soundThemes };
