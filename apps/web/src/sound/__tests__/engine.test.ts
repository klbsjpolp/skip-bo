import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SoundEngine } from '@/sound/engine';
import type { SoundRecipe } from '@/sound/types';

/**
 * Minimal Web Audio fakes. jsdom has no AudioContext, so we install a stub on
 * `window` to exercise the engine's graph-building logic. The fakes record the
 * calls we assert on (osc/gain/filter creation, connect, start/stop).
 */

class FakeParam {
  value = 0;
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}

class FakeOscillator {
  type = 'sine';
  frequency = new FakeParam();
  detune = new FakeParam();
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain {
  gain = new FakeParam();
  connect = vi.fn();
}

class FakeFilter {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
  connect = vi.fn();
}

class FakeBufferSource {
  buffer: AudioBuffer | null = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  currentTime = 0;
  sampleRate = 48000;
  destination = {};
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  filters: FakeFilter[] = [];
  bufferSources: FakeBufferSource[] = [];
  resume = vi.fn(async () => {
    this.state = 'running';
  });

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createGain() {
    const g = new FakeGain();
    this.gains.push(g);
    return g as unknown as GainNode;
  }
  createOscillator() {
    const o = new FakeOscillator();
    this.oscillators.push(o);
    return o as unknown as OscillatorNode;
  }
  createBiquadFilter() {
    const f = new FakeFilter();
    this.filters.push(f);
    return f as unknown as BiquadFilterNode;
  }
  createBufferSource() {
    const s = new FakeBufferSource();
    this.bufferSources.push(s);
    return s as unknown as AudioBufferSourceNode;
  }
  createBuffer(_channels: number, length: number, sampleRate: number) {
    const data = new Float32Array(length);
    return {
      sampleRate,
      length,
      getChannelData: () => data,
    } as unknown as AudioBuffer;
  }
}

const toneRecipe: SoundRecipe = {
  voices: [{ type: 'tone', wave: 'square', freq: 440, freqEnd: 660, gain: 0.2, duration: 0.1, detune: 5 }],
  jitter: 0.05,
};

const noiseRecipe: SoundRecipe = {
  voices: [{ type: 'noise', gain: 0.1, duration: 0.05, filter: { type: 'bandpass', freq: 1800, q: 1.2 } }],
};

describe('SoundEngine', () => {
  beforeEach(() => {
    FakeAudioContext.instances = [];
    (window as unknown as { AudioContext: typeof AudioContext }).AudioContext =
      FakeAudioContext as unknown as typeof AudioContext;
  });

  afterEach(() => {
    delete (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    vi.restoreAllMocks();
  });

  it('does not create a context until first use', () => {
    const engine = new SoundEngine();
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(engine.isRunning).toBe(false);
  });

  it('resume() creates and resumes the context', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    expect(FakeAudioContext.instances).toHaveLength(1);
    expect(FakeAudioContext.instances[0].resume).toHaveBeenCalled();
    expect(engine.isRunning).toBe(true);
  });

  it('drops sounds before unlock (suspended context)', () => {
    const engine = new SoundEngine();
    engine.playRecipe(toneRecipe);
    // ensureContext created one, but state stays suspended ⇒ no oscillators.
    const ctx = FakeAudioContext.instances[0];
    expect(ctx?.oscillators ?? []).toHaveLength(0);
  });

  it('plays a tone voice once running', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    engine.playRecipe(toneRecipe);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(1);
    const osc = ctx.oscillators[0];
    expect(osc.type).toBe('square');
    expect(osc.frequency.setValueAtTime).toHaveBeenCalled();
    expect(osc.frequency.exponentialRampToValueAtTime).toHaveBeenCalled(); // freqEnd sweep
    expect(osc.detune.setValueAtTime).toHaveBeenCalled();
    expect(osc.start).toHaveBeenCalled();
    expect(osc.stop).toHaveBeenCalled();
  });

  it('plays a filtered noise voice with a buffer source', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    engine.playRecipe(noiseRecipe);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources).toHaveLength(1);
    expect(ctx.bufferSources[0].buffer).not.toBeNull();
    expect(ctx.filters).toHaveLength(1);
    expect(ctx.filters[0].type).toBe('bandpass');
  });

  it('reuses the noise buffer across plays', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    engine.playRecipe(noiseRecipe);
    engine.playRecipe(noiseRecipe);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.bufferSources[0].buffer).toBe(ctx.bufferSources[1].buffer);
  });

  it('is a no-op when muted', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    engine.setMuted(true);
    engine.playRecipe(toneRecipe);
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.oscillators).toHaveLength(0);
  });

  it('master gain reflects mute and volume', async () => {
    const engine = new SoundEngine();
    engine.setVolume(0.4);
    await engine.resume();
    const ctx = FakeAudioContext.instances[0];
    const master = ctx.gains[0]; // first gain created is the master
    expect(master.gain.value).toBeCloseTo(0.4);
    engine.setMuted(true);
    expect(master.gain.value).toBe(0);
    engine.setMuted(false);
    expect(master.gain.value).toBeCloseTo(0.4);
  });

  it('clamps volume into [0, 1]', async () => {
    const engine = new SoundEngine();
    await engine.resume();
    const master = FakeAudioContext.instances[0].gains[0];
    engine.setVolume(5);
    expect(master.gain.value).toBe(1);
    engine.setVolume(-2);
    expect(master.gain.value).toBe(0);
  });

  it('silently no-ops when Web Audio is unavailable', () => {
    delete (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext;
    const engine = new SoundEngine();
    expect(() => engine.playRecipe(toneRecipe)).not.toThrow();
    expect(engine.isRunning).toBe(false);
  });
});
