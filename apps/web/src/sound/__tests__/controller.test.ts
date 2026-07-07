import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound, soundController } from '@/sound/controller';
import { baseTheme, retroTheme } from '@/sound/themes';
import type { SoundRecipe } from '@/sound/types';

describe('SoundController gating + resolution', () => {
  const playRecipe = vi.fn<(recipe: SoundRecipe) => void>();

  beforeEach(() => {
    playRecipe.mockReset();
    soundController.__setBackendForTests({ playRecipe });
    soundController.setThemeId('base');
    soundController.setEnabled(false);
  });

  afterEach(() => {
    soundController.__setBackendForTests(null);
    soundController.setEnabled(false);
  });

  it('does not play while disabled', () => {
    playSound('build-snap');
    expect(playRecipe).not.toHaveBeenCalled();
  });

  it('plays the resolved recipe once enabled', () => {
    soundController.setEnabled(true);
    playSound('build-snap');
    expect(playRecipe).toHaveBeenCalledTimes(1);
    expect(playRecipe).toHaveBeenCalledWith(baseTheme['build-snap']);
  });

  it('resolves through the active theme', () => {
    soundController.setEnabled(true);
    soundController.setThemeId('theme-retro');
    playSound('victory');
    expect(playRecipe).toHaveBeenCalledWith(retroTheme.victory);
  });

  it('stops playing again after being disabled', () => {
    soundController.setEnabled(true);
    playSound('discard');
    soundController.setEnabled(false);
    playSound('discard');
    expect(playRecipe).toHaveBeenCalledTimes(1);
  });

  it('falls through to the real engine when no test backend is set', () => {
    soundController.__setBackendForTests(null);
    soundController.setEnabled(true);
    // No Web Audio in jsdom ⇒ engine is a silent no-op; assert it does not throw.
    expect(() => playSound('build-snap')).not.toThrow();
  });

  it('unlock() is a no-op while disabled and safe while enabled', () => {
    soundController.setEnabled(false);
    expect(() => soundController.unlock()).not.toThrow();
    soundController.setEnabled(true);
    expect(() => soundController.unlock()).not.toThrow();
  });
});
