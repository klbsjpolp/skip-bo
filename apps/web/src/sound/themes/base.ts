import type { SoundEventId, SoundRecipe } from '../types';

/**
 * The neutral, fully-authored fallback palette. Every flavored theme inherits
 * any event it does not override from here, so this must define all events.
 *
 * Aesthetic: soft and functional — gentle sine/triangle blips and lightly
 * filtered noise. Nothing attention-grabbing; flavored themes add character.
 */
export const baseTheme: Record<SoundEventId, SoundRecipe> = {
  select: {
    voices: [{ type: 'tone', wave: 'sine', freq: 660, gain: 0.18, duration: 0.07 }],
    jitter: 0.02,
  },

  'build-snap': {
    voices: [
      { type: 'tone', wave: 'triangle', freq: 520, freqEnd: 380, gain: 0.26, duration: 0.1 },
      { type: 'noise', gain: 0.12, duration: 0.06, filter: { type: 'bandpass', freq: 1800, q: 1.2 } },
    ],
    jitter: 0.04,
  },

  'skipbo-accent': {
    voices: [
      { type: 'tone', wave: 'triangle', freq: 523, gain: 0.22, duration: 0.12 },
      { type: 'tone', wave: 'sine', freq: 784, gain: 0.18, duration: 0.16, delay: 0.05 },
      { type: 'tone', wave: 'sine', freq: 1046, gain: 0.14, duration: 0.18, delay: 0.1 },
    ],
    jitter: 0.01,
  },

  discard: {
    voices: [
      { type: 'tone', wave: 'sine', freq: 320, freqEnd: 240, gain: 0.2, duration: 0.09 },
      { type: 'noise', gain: 0.08, duration: 0.05, filter: { type: 'lowpass', freq: 1200 } },
    ],
    jitter: 0.05,
  },

  draw: {
    voices: [{ type: 'noise', gain: 0.1, duration: 0.07, filter: { type: 'highpass', freq: 2200, q: 0.7 } }],
    jitter: 0.06,
  },

  'pile-complete': {
    voices: [
      { type: 'tone', wave: 'sine', freq: 523, gain: 0.24, duration: 0.18 },
      { type: 'tone', wave: 'sine', freq: 659, gain: 0.22, duration: 0.2, delay: 0.09 },
      { type: 'tone', wave: 'sine', freq: 784, gain: 0.2, duration: 0.26, delay: 0.18 },
    ],
  },

  victory: {
    voices: [
      { type: 'tone', wave: 'triangle', freq: 523, gain: 0.26, duration: 0.3 },
      { type: 'tone', wave: 'triangle', freq: 659, gain: 0.26, duration: 0.3, delay: 0.14 },
      { type: 'tone', wave: 'triangle', freq: 784, gain: 0.26, duration: 0.34, delay: 0.28 },
      { type: 'tone', wave: 'sine', freq: 1046, gain: 0.24, duration: 0.5, delay: 0.42 },
    ],
  },
};
