import { startTransition, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import { APP_VERSION } from '@/lib/appVersion';
import {
  applyServiceWorkerUpdate,
  getPwaUpdateSnapshot,
  refreshServiceWorkerRegistration,
  subscribeToPwaUpdates,
} from '@/lib/pwaUpdates';
import { fetchRuntimeConfig } from '@/lib/runtimeConfig';
import { compareAppVersions, normalizeVersionTag } from '@/lib/versionUtils';

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
export const AUTO_RELOAD_SESSION_STORAGE_KEY = 'skipbo:pwa-auto-reload-version';

const readAutoReloadVersion = (): string | null => {
  try {
    return globalThis.sessionStorage?.getItem(AUTO_RELOAD_SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

const writeAutoReloadVersion = (version: string) => {
  try {
    globalThis.sessionStorage?.setItem(AUTO_RELOAD_SESSION_STORAGE_KEY, version);
  } catch {
    // private mode / disabled storage — silently no-op
  }
};

interface RuntimeVersionSnapshot {
  latestAppVersion: string | null;
  minimumSupportedVersion: string | null;
  lastCheckAt: number | null;
}

export interface PwaVersionGateState {
  currentAppVersion: string;
  latestAppVersion: string | null;
  minimumSupportedVersion: string | null;
  hasPendingServiceWorkerUpdate: boolean;
  isApplyingUpdate: boolean;
  isHardUpdateRequired: boolean;
  lastCheckAt: number | null;
  dismissSoftUpdate: () => void;
  reloadToUpdate: () => void;
  shouldShowSoftUpdate: boolean;
}

export const usePwaVersionGate = (): PwaVersionGateState => {
  const [dismissedUpdateKey, setDismissedUpdateKey] = useState<string | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [runtimeVersionSnapshot, setRuntimeVersionSnapshot] = useState<RuntimeVersionSnapshot>({
    latestAppVersion: null,
    minimumSupportedVersion: null,
    lastCheckAt: null,
  });
  const isApplyingUpdateRef = useRef(false);
  const pwaUpdateSnapshot = useSyncExternalStore(subscribeToPwaUpdates, getPwaUpdateSnapshot, getPwaUpdateSnapshot);

  const checkForUpdates = useEffectEvent(async () => {
    await refreshServiceWorkerRegistration().catch(() => undefined);

    const runtimeConfig = await fetchRuntimeConfig({ force: true });

    startTransition(() => {
      setRuntimeVersionSnapshot({
        latestAppVersion: normalizeVersionTag(runtimeConfig.appVersion),
        minimumSupportedVersion: normalizeVersionTag(runtimeConfig.minimumSupportedVersion),
        lastCheckAt: Date.now(),
      });
    });
  });

  const runReloadToUpdate = async () => {
    if (isApplyingUpdateRef.current) {
      return;
    }

    isApplyingUpdateRef.current = true;
    setIsApplyingUpdate(true);

    try {
      // No `location.reload()` fallback: reloading without a freshly installed
      // worker re-serves the same precached bundle, which on iOS standalone
      // PWAs loops splash → blank → reload whenever a hard update is required.
      await applyServiceWorkerUpdate().catch(() => false);
    } finally {
      isApplyingUpdateRef.current = false;
      setIsApplyingUpdate(false);
    }
  };

  const reloadToUpdate = useEffectEvent(() => {
    void runReloadToUpdate();
  });

  useEffect(() => {
    void checkForUpdates();

    const intervalId = globalThis.setInterval(() => {
      void checkForUpdates();
    }, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const recheckWhenVisible = useEffectEvent(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    void checkForUpdates();
  });

  useEffect(() => {
    document.addEventListener('visibilitychange', recheckWhenVisible);
    globalThis.addEventListener('pageshow', recheckWhenVisible);
    globalThis.addEventListener('online', recheckWhenVisible);

    return () => {
      document.removeEventListener('visibilitychange', recheckWhenVisible);
      globalThis.removeEventListener('pageshow', recheckWhenVisible);
      globalThis.removeEventListener('online', recheckWhenVisible);
    };
  }, []);

  const hasRuntimeUpdate = runtimeVersionSnapshot.latestAppVersion
    ? compareAppVersions(APP_VERSION, runtimeVersionSnapshot.latestAppVersion) < 0
    : false;
  const isHardUpdateRequired = runtimeVersionSnapshot.minimumSupportedVersion
    ? compareAppVersions(APP_VERSION, runtimeVersionSnapshot.minimumSupportedVersion) < 0
    : false;
  const updateKey = isHardUpdateRequired
    ? `minimum:${runtimeVersionSnapshot.minimumSupportedVersion}`
    : pwaUpdateSnapshot.needRefresh
      ? `service-worker:${runtimeVersionSnapshot.latestAppVersion ?? 'pending'}`
      : hasRuntimeUpdate
        ? `runtime:${runtimeVersionSnapshot.latestAppVersion}`
        : null;
  const shouldShowSoftUpdate = !!updateKey && !isHardUpdateRequired && dismissedUpdateKey !== updateKey;

  useEffect(() => {
    if (!isHardUpdateRequired || !runtimeVersionSnapshot.minimumSupportedVersion) {
      return;
    }

    // sessionStorage survives `location.reload()`, so this guard keeps a single
    // tab from re-auto-triggering the flow for the same minimum version after
    // a reload — required retries must come from `ForcedUpdateOverlay`.
    if (readAutoReloadVersion() === runtimeVersionSnapshot.minimumSupportedVersion) {
      return;
    }

    writeAutoReloadVersion(runtimeVersionSnapshot.minimumSupportedVersion);
    void reloadToUpdate();
  }, [isHardUpdateRequired, runtimeVersionSnapshot.minimumSupportedVersion]);

  return {
    currentAppVersion: APP_VERSION,
    latestAppVersion: runtimeVersionSnapshot.latestAppVersion,
    minimumSupportedVersion: runtimeVersionSnapshot.minimumSupportedVersion,
    hasPendingServiceWorkerUpdate: pwaUpdateSnapshot.needRefresh,
    isApplyingUpdate,
    isHardUpdateRequired,
    lastCheckAt: runtimeVersionSnapshot.lastCheckAt,
    dismissSoftUpdate: () => {
      if (updateKey) {
        setDismissedUpdateKey(updateKey);
      }
    },
    reloadToUpdate: () => {
      void runReloadToUpdate();
    },
    shouldShowSoftUpdate,
  };
};
