import { beforeEach, describe, expect, it } from 'vitest';
import {
  getStoredSoundEnabled,
  getStoredSoundVolume,
  storeSoundEnabled,
  storeSoundVolume,
} from '@/state/lobbyPreferences';

describe('sound preferences persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to disabled', () => {
    expect(getStoredSoundEnabled()).toBe(false);
  });

  it('defaults volume to 0.8', () => {
    expect(getStoredSoundVolume()).toBeCloseTo(0.8);
  });

  it('round-trips the enabled flag', () => {
    storeSoundEnabled(true);
    expect(getStoredSoundEnabled()).toBe(true);
    storeSoundEnabled(false);
    expect(getStoredSoundEnabled()).toBe(false);
  });

  it('round-trips and clamps the volume', () => {
    storeSoundVolume(0.25);
    expect(getStoredSoundVolume()).toBeCloseTo(0.25);
    storeSoundVolume(5);
    expect(getStoredSoundVolume()).toBe(1);
    storeSoundVolume(-1);
    expect(getStoredSoundVolume()).toBe(0);
  });
});
