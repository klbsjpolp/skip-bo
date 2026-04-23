import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, test, vi} from 'vitest';

import {
  AI_COACH_ENABLED_STORAGE_KEY,
  getStoredCoachEnabled,
  useStoredCoachEnabled,
} from '@/hooks/useStoredCoachEnabled';

describe('useStoredCoachEnabled', () => {
  const originalLocalStorage = globalThis.localStorage;
  let storedValues: Map<string, string>;

  beforeEach(() => {
    storedValues = new Map();

    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: vi.fn((key: string) => storedValues.get(key) ?? null),
        setItem: vi.fn((key: string, value: string) => {
          storedValues.set(key, value);
        }),
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: originalLocalStorage,
    });
  });

  test('defaults the coach toggle to enabled', () => {
    expect(getStoredCoachEnabled()).toBe(true);

    const {result} = renderHook(() => useStoredCoachEnabled());

    expect(result.current[0]).toBe(true);
  });

  test('initializes from localStorage when the coach was disabled', () => {
    globalThis.localStorage.setItem(AI_COACH_ENABLED_STORAGE_KEY, 'false');

    const {result} = renderHook(() => useStoredCoachEnabled());

    expect(result.current[0]).toBe(false);
  });

  test('persists toggle changes to localStorage', () => {
    const {result} = renderHook(() => useStoredCoachEnabled());

    act(() => {
      result.current[1](false);
    });

    expect(result.current[0]).toBe(false);
    expect(globalThis.localStorage.getItem(AI_COACH_ENABLED_STORAGE_KEY)).toBe('false');

    act(() => {
      result.current[1](true);
    });

    expect(result.current[0]).toBe(true);
    expect(globalThis.localStorage.getItem(AI_COACH_ENABLED_STORAGE_KEY)).toBe('true');
  });
});
