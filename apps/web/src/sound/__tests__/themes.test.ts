import { describe, expect, it } from 'vitest';
import { baseTheme, resolveRecipe, retroTheme } from '@/sound/themes';
import type { SoundEventId } from '@/sound/types';

const ALL_EVENTS: SoundEventId[] = [
  'select',
  'build-snap',
  'skipbo-accent',
  'discard',
  'draw',
  'pile-complete',
  'victory',
];

describe('sound theme resolution', () => {
  it('base palette defines every event', () => {
    for (const event of ALL_EVENTS) {
      expect(baseTheme[event]).toBeDefined();
      expect(baseTheme[event].voices.length).toBeGreaterThan(0);
    }
  });

  it('resolves an overridden event to the flavored theme recipe', () => {
    const resolved = resolveRecipe('theme-retro', 'build-snap');
    expect(resolved).toBe(retroTheme['build-snap']);
  });

  it('falls back to base for events a theme does not override', () => {
    // 'base' has no entry in the registry, so every event falls through.
    for (const event of ALL_EVENTS) {
      expect(resolveRecipe('base', event)).toBe(baseTheme[event]);
    }
  });

  it('falls back to base for an unregistered visual theme', () => {
    expect(resolveRecipe('theme-minecraft', 'victory')).toBe(baseTheme.victory);
  });

  it('retro overrides resolve for every event it defines', () => {
    for (const event of Object.keys(retroTheme) as SoundEventId[]) {
      expect(resolveRecipe('theme-retro', event)).toBe(retroTheme[event]);
    }
  });
});
