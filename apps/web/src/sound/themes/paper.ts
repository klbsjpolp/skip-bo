import type { SoundTheme } from '../types';

/**
 * Paper foley palette for the default `theme-paper`. Paper has no pitch — it is
 * broadband fibrous noise shaped by filtering, plus the soft low thud of card
 * contact. So every voice here is noise-driven and differentiated by filter
 * band, envelope, and duration rather than by frequency.
 *
 * The engine adds a random buffer offset to each noise burst, so repeated taps
 * (build-snap fires on every card play) don't replay an identical waveform —
 * which is what sells these as real paper rather than a synthetic hiss.
 *
 * Two-layer pattern for contact sounds: a filtered rustle (the slide of fibres)
 * over a very short low-frequency thud (the card meeting the surface).
 */
export const paperTheme: SoundTheme = {
  // Fingernail tick on a card edge — the lightest possible cue.
  select: {
    voices: [{ type: 'noise', gain: 0.05, attack: 0.001, duration: 0.025, filter: { type: 'highpass', freq: 4000 } }],
  },

  // Card tapped onto the table: crisp mid rustle + a tiny contact thud.
  'build-snap': {
    voices: [
      { type: 'noise', gain: 0.16, attack: 0.001, duration: 0.06, filter: { type: 'bandpass', freq: 2600, q: 0.8 } },
      { type: 'noise', gain: 0.1, attack: 0.001, duration: 0.04, filter: { type: 'lowpass', freq: 320 } },
    ],
  },

  // The wildcard gets a little flourish: a quick two-stage riffle sweep, still
  // pure paper but clearly more elaborate than a plain tap.
  'skipbo-accent': {
    voices: [
      { type: 'noise', gain: 0.13, attack: 0.001, duration: 0.07, filter: { type: 'bandpass', freq: 2200, q: 0.7 } },
      {
        type: 'noise',
        gain: 0.13,
        attack: 0.001,
        duration: 0.08,
        delay: 0.05,
        filter: { type: 'bandpass', freq: 3400, q: 0.7 },
      },
      { type: 'noise', gain: 0.09, attack: 0.001, duration: 0.05, delay: 0.02, filter: { type: 'lowpass', freq: 360 } },
    ],
  },

  // Softer, lower, slightly longer — a card sliding onto a pile.
  discard: {
    voices: [
      { type: 'noise', gain: 0.13, attack: 0.002, duration: 0.09, filter: { type: 'lowpass', freq: 1400, q: 0.6 } },
      { type: 'noise', gain: 0.08, attack: 0.001, duration: 0.05, filter: { type: 'lowpass', freq: 260 } },
    ],
  },

  // Quick bright riffle pulled off the top of the deck.
  draw: {
    voices: [
      { type: 'noise', gain: 0.09, attack: 0.001, duration: 0.035, filter: { type: 'highpass', freq: 3200, q: 0.7 } },
    ],
  },

  // Squaring up a completed stack: three soft staggered thuds.
  'pile-complete': {
    voices: [
      { type: 'noise', gain: 0.14, attack: 0.001, duration: 0.06, filter: { type: 'bandpass', freq: 1800, q: 0.8 } },
      {
        type: 'noise',
        gain: 0.13,
        attack: 0.001,
        duration: 0.06,
        delay: 0.1,
        filter: { type: 'bandpass', freq: 1500, q: 0.8 },
      },
      { type: 'noise', gain: 0.11, attack: 0.001, duration: 0.07, delay: 0.2, filter: { type: 'lowpass', freq: 900 } },
    ],
  },

  // A celebratory shuffle cascade — a fast run of riffles fanning out.
  victory: {
    voices: [
      { type: 'noise', gain: 0.12, attack: 0.001, duration: 0.05, filter: { type: 'bandpass', freq: 2400, q: 0.7 } },
      {
        type: 'noise',
        gain: 0.12,
        attack: 0.001,
        duration: 0.05,
        delay: 0.08,
        filter: { type: 'bandpass', freq: 2800, q: 0.7 },
      },
      {
        type: 'noise',
        gain: 0.12,
        attack: 0.001,
        duration: 0.05,
        delay: 0.16,
        filter: { type: 'bandpass', freq: 3200, q: 0.7 },
      },
      {
        type: 'noise',
        gain: 0.12,
        attack: 0.001,
        duration: 0.06,
        delay: 0.24,
        filter: { type: 'bandpass', freq: 3600, q: 0.7 },
      },
      { type: 'noise', gain: 0.1, attack: 0.002, duration: 0.22, delay: 0.32, filter: { type: 'lowpass', freq: 1200 } },
    ],
  },
};
