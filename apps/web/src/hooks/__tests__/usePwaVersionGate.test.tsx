import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { PWA_UPDATE_RECHECK_MIN_INTERVAL_MS } from '@/config/timing';

import { AUTO_RELOAD_SESSION_STORAGE_KEY, usePwaVersionGate } from '../usePwaVersionGate';

// Throttling keys off Date.now; freeze it so tests advance the clock explicitly.
let currentTime = 0;

describe('usePwaVersionGate', () => {
  beforeEach(() => {
    fetchRuntimeConfigMock.mockReset();
    applyServiceWorkerUpdateMock.mockReset();
    refreshServiceWorkerRegistrationMock.mockReset();

    currentTime = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => currentTime);

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

    globalThis.sessionStorage?.clear();
    globalThis.localStorage?.clear();

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
  });

  it('shows a soft update banner when runtime config reports a newer app version', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.1.0',
    });

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.shouldShowSoftUpdate).toBe(true);
    });

    expect(result.current.latestAppVersion).toBe('v1.1.0');
    expect(refreshServiceWorkerRegistrationMock).toHaveBeenCalledTimes(1);
    expect(fetchRuntimeConfigMock).toHaveBeenCalledWith({ force: true });

    act(() => {
      result.current.dismissSoftUpdate();
    });

    expect(result.current.shouldShowSoftUpdate).toBe(false);
  });

  it('shows a soft update banner when a waiting service worker is discovered', async () => {
    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      emitPwaSnapshot({ needRefresh: true });
    });

    expect(result.current.hasPendingServiceWorkerUpdate).toBe(true);
    expect(result.current.shouldShowSoftUpdate).toBe(true);
  });

  it('flags isUpdatePending for a soft update but not for a blocking minimum-version gate', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({ appVersion: 'v1.1.0' });

    const { result, rerender } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.isUpdatePending).toBe(true);
    });
    expect(result.current.isHardUpdateRequired).toBe(false);

    fetchRuntimeConfigMock.mockResolvedValue({ appVersion: 'v1.2.0', minimumSupportedVersion: 'v1.1.0' });

    currentTime += PWA_UPDATE_RECHECK_MIN_INTERVAL_MS;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });
    rerender();

    expect(result.current.isUpdatePending).toBe(false);
  });

  it('applies a pending soft update at most once per target version', async () => {
    // A real apply fires the reload, so it records the per-version guard via the
    // onReloadCommitted callback the hook passes in.
    applyServiceWorkerUpdateMock.mockImplementation(async (onReloadCommitted?: () => void) => {
      onReloadCommitted?.();
      return true;
    });

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      emitPwaSnapshot({ needRefresh: true });
    });

    await waitFor(() => {
      expect(result.current.isUpdatePending).toBe(true);
    });

    await act(async () => {
      result.current.applyUpdateOnceForCurrentTarget();
      await Promise.resolve();
    });

    expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);

    // The version's single attempt is now recorded, so a later call is a no-op.
    await act(async () => {
      result.current.applyUpdateOnceForCurrentTarget();
      await Promise.resolve();
    });

    expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('does not burn the version attempt when the apply is a no-op (retries later)', async () => {
    // First apply finds no waiting worker (runtime config raced ahead of the
    // service worker): no reload fires, onReloadCommitted is never called, so the
    // guard stays unset.
    applyServiceWorkerUpdateMock.mockResolvedValueOnce(false);

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      emitPwaSnapshot({ needRefresh: true });
    });

    await waitFor(() => {
      expect(result.current.isUpdatePending).toBe(true);
    });

    await act(async () => {
      result.current.applyUpdateOnceForCurrentTarget();
      await Promise.resolve();
    });

    expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);

    // The worker has now caught up; the next attempt for the same version retries
    // instead of being blocked by a burned guard.
    applyServiceWorkerUpdateMock.mockImplementation(async (onReloadCommitted?: () => void) => {
      onReloadCommitted?.();
      return true;
    });

    await act(async () => {
      result.current.applyUpdateOnceForCurrentTarget();
      await Promise.resolve();
    });

    expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(2);
  });

  it('never auto-applies a pending soft update on its own (callers drive it at a safe moment)', async () => {
    applyServiceWorkerUpdateMock.mockResolvedValue(true);

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    act(() => {
      emitPwaSnapshot({ needRefresh: true });
    });

    await waitFor(() => {
      expect(result.current.isUpdatePending).toBe(true);
    });
    await Promise.resolve();

    // The hook surfaces the pending update but leaves the reload to the caller's
    // safe-moment gate (a fresh local game / a safe point online).
    expect(applyServiceWorkerUpdateMock).not.toHaveBeenCalled();
  });

  it('resolves reloadToUpdate with whether a reload actually committed', async () => {
    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    // No worker staged yet — the apply is a no-op, callers may proceed.
    applyServiceWorkerUpdateMock.mockResolvedValueOnce(false);
    await act(async () => {
      await expect(result.current.reloadToUpdate()).resolves.toBe(false);
    });

    // A staged worker commits the reload — callers must abort what they were
    // about to do (the page is navigating).
    applyServiceWorkerUpdateMock.mockResolvedValueOnce(true);
    await act(async () => {
      await expect(result.current.reloadToUpdate()).resolves.toBe(true);
    });
  });

  it('resolves false for a reload requested while another apply is in flight', async () => {
    let resolveApply: ((committed: boolean) => void) | undefined;
    applyServiceWorkerUpdateMock.mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          resolveApply = resolve;
        }),
    );

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      const first = result.current.reloadToUpdate();
      // The guard is set synchronously, so a second request short-circuits.
      await expect(result.current.reloadToUpdate()).resolves.toBe(false);
      resolveApply?.(true);
      await expect(first).resolves.toBe(true);
    });

    expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
  });

  it('reports the previous version when the build just moved to a newer one', async () => {
    globalThis.localStorage?.setItem('skipbo:last-seen-version', 'v0.9.0');

    const { result } = renderHook(() => usePwaVersionGate());

    expect(result.current.justUpdatedFromVersion).toBe('v0.9.0');

    await waitFor(() => {
      expect(globalThis.localStorage?.getItem('skipbo:last-seen-version')).toBe('v1.0.0');
    });

    act(() => {
      result.current.dismissJustUpdated();
    });

    expect(result.current.justUpdatedFromVersion).toBeNull();
  });

  it('does not report a just-updated notice on first launch or an unchanged version', async () => {
    const { result, unmount } = renderHook(() => usePwaVersionGate());

    expect(result.current.justUpdatedFromVersion).toBeNull();

    await waitFor(() => {
      expect(globalThis.localStorage?.getItem('skipbo:last-seen-version')).toBe('v1.0.0');
    });

    unmount();

    const { result: secondResult } = renderHook(() => usePwaVersionGate());
    expect(secondResult.current.justUpdatedFromVersion).toBeNull();
  });

  it('attempts an immediate reload when the minimum supported version is ahead of the current build', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });
    applyServiceWorkerUpdateMock.mockResolvedValue(true);

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });

    await waitFor(() => {
      expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
    });
  });

  it('skips the auto-reload when sessionStorage already records this minimum version', async () => {
    globalThis.sessionStorage?.setItem(AUTO_RELOAD_SESSION_STORAGE_KEY, 'v1.1.0');

    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(applyServiceWorkerUpdateMock).not.toHaveBeenCalled();
  });

  it('records the minimum supported version in sessionStorage before the auto-reload runs', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });

    renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
    });

    expect(globalThis.sessionStorage?.getItem(AUTO_RELOAD_SESSION_STORAGE_KEY)).toBe('v1.1.0');
  });

  it('rechecks runtime config when the document becomes visible again', async () => {
    fetchRuntimeConfigMock.mockResolvedValueOnce({}).mockResolvedValueOnce({ appVersion: 'v1.1.0' });

    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    currentTime += PWA_UPDATE_RECHECK_MIN_INTERVAL_MS;
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

  it('throttles event-driven rechecks within the minimum interval', async () => {
    const { result } = renderHook(() => usePwaVersionGate());

    await waitFor(() => {
      expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);
    });

    // A focus event inside the throttle window is collapsed — no extra fetch.
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await Promise.resolve();
    expect(fetchRuntimeConfigMock).toHaveBeenCalledTimes(1);

    // Past the window, the next event re-checks.
    fetchRuntimeConfigMock.mockResolvedValue({ appVersion: 'v1.1.0' });
    currentTime += PWA_UPDATE_RECHECK_MIN_INTERVAL_MS;
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

  it('does not auto-reload a required hard update while it is deferred', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });

    const { result } = renderHook(() => usePwaVersionGate({ deferHardUpdate: true }));

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });

    await Promise.resolve();
    await Promise.resolve();

    expect(applyServiceWorkerUpdateMock).not.toHaveBeenCalled();
    expect(globalThis.sessionStorage?.getItem(AUTO_RELOAD_SESSION_STORAGE_KEY)).toBeNull();
  });

  it('applies the deferred hard update once it is no longer deferred', async () => {
    fetchRuntimeConfigMock.mockResolvedValue({
      appVersion: 'v1.2.0',
      minimumSupportedVersion: 'v1.1.0',
    });
    applyServiceWorkerUpdateMock.mockResolvedValue(true);

    const { result, rerender } = renderHook(({ deferHardUpdate }) => usePwaVersionGate({ deferHardUpdate }), {
      initialProps: { deferHardUpdate: true },
    });

    await waitFor(() => {
      expect(result.current.isHardUpdateRequired).toBe(true);
    });
    expect(applyServiceWorkerUpdateMock).not.toHaveBeenCalled();

    rerender({ deferHardUpdate: false });

    await waitFor(() => {
      expect(applyServiceWorkerUpdateMock).toHaveBeenCalledTimes(1);
    });
  });
});
