import {act, renderHook, waitFor} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

const fetchRuntimeConfigMock = vi.fn();
const applyServiceWorkerUpdateMock = vi.fn();
const refreshServiceWorkerRegistrationMock = vi.fn();

const listeners = new Set<() => void>();

let pwaSnapshot = {
  needRefresh: false,
  offlineReady: false,
  registration: null,
  registrationError: null,
};

const emitPwaSnapshot = (partialSnapshot: Partial<typeof pwaSnapshot>) => {
  pwaSnapshot = {
    ...pwaSnapshot,
    ...partialSnapshot,
  };

  listeners.forEach((listener) => listener());
};

vi.mock('@/lib/appVersion', () => ({
  APP_VERSION: 'v1.0.0',
}));

vi.mock('@/lib/runtimeConfig', () => ({
  fetchRuntimeConfig: (...args: unknown[]) => fetchRuntimeConfigMock(...args),
}));

vi.mock('@/lib/pwaUpdates', () => ({
  applyServiceWorkerUpdate: (...args: unknown[]) => applyServiceWorkerUpdateMock(...args),
  getPwaUpdateSnapshot: () => pwaSnapshot,
  refreshServiceWorkerRegistration: (...args: unknown[]) => refreshServiceWorkerRegistrationMock(...args),
  subscribeToPwaUpdates: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
}));

import {usePwaVersionGate} from '../usePwaVersionGate';

describe('usePwaVersionGate', () => {
  beforeEach(() => {
    fetchRuntimeConfigMock.mockReset();
    applyServiceWorkerUpdateMock.mockReset();
    refreshServiceWorkerRegistrationMock.mockReset();

    pwaSnapshot = {
      needRefresh: false,
      offlineReady: false,
      registration: null,
      registrationError: null,
    };
    listeners.clear();

    fetchRuntimeConfigMock.mockResolvedValue({});
    applyServiceWorkerUpdateMock.mockResolvedValue(false);
    refreshServiceWorkerRegistrationMock.mockResolvedValue(undefined);

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('shows a soft update banner when runtime config reports a newer app version', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.1.0',
    });

    const {result} = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.shouldShowSoftUpdate).toBe(true);
    });

    expect(result.current.latestAppVersion).toBe('v1.1.0');
    expect(refreshServiceWorkerRegistrationMock).toHaveBeenCalledTimes(1);
    expect(fetchRuntimeConfigMock).toHaveBeenCalledWith({force: true});

    act(() => {
      result.current.dismissSoftUpdate();
    });

    expect(result.current.shouldShowSoftUpdate).toBe(false);
  });

  it('shows a soft update banner when a waiting service worker is discovered', async () => {
    const {result} = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      emitPwaSnapshot({needRefresh: true});
    });

    expect(result.current.hasPendingServiceWorkerUpdate).toBe(true);
    expect(result.current.shouldShowSoftUpdate).toBe(true);
  });

  it('attempts an immediate reload when the minimum supported version is ahead of the current build', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });
    applyServiceWorkerUpdateMock.mockResolvedValue(true);

    const {result} = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });

    await waitFor(() => {
      expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
    });
  });

  it('rechecks runtime config when the document becomes visible again', async () => {
    fetchRuntimeConfigMock
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({appVersion: 'v1.1.0'});

    const {result} = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(2);
    });

    await waitFor(() => {
      expect(result.current.latestAppVersion).toBe('v1.1.0');
    });
  });
});
