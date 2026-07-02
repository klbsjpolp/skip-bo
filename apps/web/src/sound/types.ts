import type { Theme } from '@/types';

/**
 * Logical sound events. Trigger sites refer to these — never to a theme or a
 * concrete recipe — so the palette can be re-voiced per theme without touching
 * any caller. See docs/architecture/sound-design.md.
 */
export type SoundEventId = 'select' | 'build-snap' | 'skipbo-accent' | 'discard' | 'draw' | 'pile-complete' | 'victory';

/**
 * A sound theme id is the same union as the visual theme (`theme-*`) plus a
 * synthetic `base` fallback palette that every flavored theme inherits from.
 */
export type SoundThemeId = 'base' | Theme;

export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle';

/** A single tonal layer: an oscillator with an amplitude envelope. */
export interface ToneVoice {
  type: 'tone';
  wave: Waveform;
  /** Start frequency in Hz. */
  freq: number;
  /** Optional end frequency — when set, the pitch sweeps to it over `duration`. */
  freqEnd?: number;
  /** Peak gain 0..1 (default 0.3). */
  gain?: number;
  /** Attack time in seconds (default 0.005). */
  attack?: number;
  /** Total voice length in seconds. */
  duration: number;
  /** Offset from the recipe start in seconds (default 0) — used for arpeggios. */
  delay?: number;
  /** Static detune in cents. */
  detune?: number;
}

/** A single noise layer: filtered white noise with an amplitude envelope. */
export interface NoiseVoice {
  type: 'noise';
  gain?: number;
  attack?: number;
  duration: number;
  delay?: number;
  filter?: { type: BiquadFilterType; freq: number; q?: number };
}

export type Voice = ToneVoice | NoiseVoice;

/**
 * A declarative, engine-agnostic description of a sound. The engine renders it
 * into a Web Audio graph; tests assert on the recipe object without any audio.
 */
export interface SoundRecipe {
  voices: Voice[];
  /**
   * Fractional pitch jitter applied to every tone voice (e.g. 0.03 = ±3%).
   * Prevents repeated rapid sounds (card plays, deals) from sounding identical.
   */
  jitter?: number;
}

/** A theme overrides only the events it wants to re-voice; the rest inherit base. */
export type SoundTheme = Partial<Record<SoundEventId, SoundRecipe>>;
