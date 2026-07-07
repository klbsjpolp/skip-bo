import { SoundEngine } from './engine';
import { resolveRecipe } from './themes';
import type { SoundEventId, SoundRecipe, SoundThemeId } from './types';

interface SoundBackend {
  playRecipe: (recipe: SoundRecipe) => void;
}

/**
 * Module-singleton sound facade. Trigger sites call {@link playSound} with a
 * logical event id; the controller resolves the active theme + user prefs and
 * delegates to the engine. Mirrors the `setGlobal*Context` service pattern used
 * by the animation services so deep components can reach it without prop drilling.
 */
class SoundController {
  private readonly engine = new SoundEngine();
  private enabled = false;
  private themeId: SoundThemeId = 'base';
  /** Optional injectable backend for tests — when set, replaces the real engine. */
  private backend: SoundBackend | null = null;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.engine.setMuted(!enabled);
    if (enabled) {
      void this.engine.resume();
    }
  }

  setVolume(volume: number): void {
    this.engine.setVolume(volume);
  }

  setThemeId(themeId: SoundThemeId): void {
    this.themeId = themeId;
  }

  /** Resume the AudioContext from a user gesture (autoplay unlock). */
  unlock(): void {
    if (this.enabled) {
      void this.engine.resume();
    }
  }

  play(eventId: SoundEventId): void {
    if (!this.enabled) return;
    const recipe = resolveRecipe(this.themeId, eventId);
    if (!recipe) return;
    if (this.backend) {
      this.backend.playRecipe(recipe);
      return;
    }
    this.engine.playRecipe(recipe);
  }

  /** Test seam: inject a mock backend (or null to restore the real engine). */
  __setBackendForTests(backend: SoundBackend | null): void {
    this.backend = backend;
  }
}

export const soundController = new SoundController();

/** Theme-agnostic entry point for the rest of the app. */
export function playSound(eventId: SoundEventId): void {
  soundController.play(eventId);
}
