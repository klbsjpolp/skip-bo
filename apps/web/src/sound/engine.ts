import type { NoiseVoice, SoundRecipe, ToneVoice } from './types';

/**
 * Web Audio synthesis engine. Owns a single lazily-created AudioContext and a
 * master gain node for global volume/mute. It knows nothing about game events or
 * themes — it only renders {@link SoundRecipe} objects.
 *
 * The AudioContext is created lazily and starts `suspended`; `resume()` must be
 * called from a user gesture before any sound is audible (autoplay policy).
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private volume = 0.6;
  private noiseBuffer: AudioBuffer | null = null;

  /** Whether the underlying AudioContext is running (i.e. unlocked). */
  get isRunning(): boolean {
    return this.ctx?.state === 'running';
  }

  private ensureContext(): { ctx: AudioContext; master: GainNode } | null {
    if (this.ctx && this.master) {
      return { ctx: this.ctx, master: this.master };
    }
    const Ctor: typeof AudioContext | undefined =
      typeof window !== 'undefined'
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
        : undefined;
    if (!Ctor) {
      return null; // No Web Audio (jsdom / unsupported) — silently no-op.
    }
    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = this.muted ? 0 : this.volume;
    master.connect(ctx.destination);
    this.ctx = ctx;
    this.master = master;
    return { ctx, master };
  }

  /** Resume the AudioContext from a user gesture. Safe to call repeatedly. */
  async resume(): Promise<void> {
    const handles = this.ensureContext();
    if (handles && handles.ctx.state === 'suspended') {
      try {
        await handles.ctx.resume();
      } catch {
        /* ignore — best effort */
      }
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) {
      this.master.gain.value = muted ? 0 : this.volume;
    }
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.master && !this.muted) {
      this.master.gain.value = this.volume;
    }
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 1); // 1s of reusable noise
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  /** Render and play a recipe. No-op when muted or when Web Audio is absent. */
  playRecipe(recipe: SoundRecipe): void {
    if (this.muted) return;
    const handles = this.ensureContext();
    if (!handles || handles.ctx.state !== 'running') return; // not unlocked yet
    const { ctx, master } = handles;
    const now = ctx.currentTime;
    const jitter = recipe.jitter ?? 0;

    for (const voice of recipe.voices) {
      if (voice.type === 'tone') {
        this.playTone(ctx, master, now, voice, jitter);
      } else {
        this.playNoise(ctx, master, now, voice);
      }
    }
  }

  private playTone(ctx: AudioContext, master: GainNode, now: number, voice: ToneVoice, jitter: number): void {
    const start = now + (voice.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const jitterFactor = jitter > 0 ? 1 + (Math.random() * 2 - 1) * jitter : 1;
    const freq = voice.freq * jitterFactor;

    osc.type = voice.wave;
    osc.frequency.setValueAtTime(freq, start);
    if (voice.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, voice.freqEnd * jitterFactor), start + voice.duration);
    }
    if (voice.detune) {
      osc.detune.setValueAtTime(voice.detune, start);
    }

    const peak = voice.gain ?? 0.3;
    const attack = voice.attack ?? 0.005;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + voice.duration + 0.02);
  }

  private playNoise(ctx: AudioContext, master: GainNode, now: number, voice: NoiseVoice): void {
    const start = now + (voice.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.getNoiseBuffer(ctx);
    const gain = ctx.createGain();

    const peak = voice.gain ?? 0.2;
    const attack = voice.attack ?? 0.002;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + voice.duration);

    let tail: AudioNode = src;
    if (voice.filter) {
      const filter = ctx.createBiquadFilter();
      filter.type = voice.filter.type;
      filter.frequency.value = voice.filter.freq;
      if (voice.filter.q !== undefined) {
        filter.Q.value = voice.filter.q;
      }
      src.connect(filter);
      tail = filter;
    }
    tail.connect(gain);
    gain.connect(master);
    src.start(start);
    src.stop(start + voice.duration + 0.02);
  }
}
