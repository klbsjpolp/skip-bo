import type { SoundTheme } from '../types';

/**
 * 8-bit chiptune palette. Square/pulse waves and arpeggiated runs — the voices
 * map naturally onto Web Audio oscillators, so synthesis sounds authentic rather
 * than approximated. Overrides every gameplay event; unspecified events (none
 * here) would fall back to `base`.
 */
export const retroTheme: SoundTheme = {
  select: {
    voices: [{ type: 'tone', wave: 'square', freq: 880, gain: 0.14, duration: 0.05 }],
    jitter: 0.02,
  },

  'build-snap': {
    voices: [{ type: 'tone', wave: 'square', freq: 440, freqEnd: 660, gain: 0.18, duration: 0.08 }],
    jitter: 0.05,
  },

  // Classic "coin" arpeggio for the wildcard.
  'skipbo-accent': {
    voices: [
      { type: 'tone', wave: 'square', freq: 988, gain: 0.18, duration: 0.08 },
      { type: 'tone', wave: 'square', freq: 1319, gain: 0.18, duration: 0.18, delay: 0.07 },
    ],
  },

  discard: {
    voices: [{ type: 'tone', wave: 'square', freq: 330, freqEnd: 196, gain: 0.16, duration: 0.08 }],
    jitter: 0.05,
  },

  draw: {
    voices: [{ type: 'tone', wave: 'square', freq: 1200, freqEnd: 1600, gain: 0.1, duration: 0.04 }],
    jitter: 0.07,
  },

  // Ascending power-up run.
  'pile-complete': {
    voices: [
      { type: 'tone', wave: 'square', freq: 523, gain: 0.16, duration: 0.08 },
      { type: 'tone', wave: 'square', freq: 659, gain: 0.16, duration: 0.08, delay: 0.07 },
      { type: 'tone', wave: 'square', freq: 784, gain: 0.16, duration: 0.08, delay: 0.14 },
      { type: 'tone', wave: 'square', freq: 1046, gain: 0.16, duration: 0.14, delay: 0.21 },
    ],
  },

  // Triumphant fanfare with a pulse-bass octave under the melody.
  victory: {
    voices: [
      { type: 'tone', wave: 'square', freq: 523, gain: 0.18, duration: 0.14 },
      { type: 'tone', wave: 'square', freq: 659, gain: 0.18, duration: 0.14, delay: 0.13 },
      { type: 'tone', wave: 'square', freq: 784, gain: 0.18, duration: 0.14, delay: 0.26 },
      { type: 'tone', wave: 'square', freq: 1046, gain: 0.2, duration: 0.34, delay: 0.39 },
      { type: 'tone', wave: 'triangle', freq: 262, gain: 0.22, duration: 0.73, delay: 0 },
    ],
  },
};
