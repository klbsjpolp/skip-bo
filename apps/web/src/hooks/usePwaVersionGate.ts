import {startTransition, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore} from 'react';

import {APP_VERSION} from '@/lib/appVersion';
import {applyServiceWorkerUpdate, getPwaUpdateSnapshot, refreshServiceWorkerRegistration, subscribeToPwaUpdates} from '@/lib/pwaUpdates';
import {fetchRuntimeConfig} from '@/lib/runtimeConfig';
import {compareAppVersions, normalizeVersionTag} from '@/lib/versionUtils';

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const AUTO_RELOAD_SESSION_STORAGE_KEY = 'skipbo:pwa-auto-reload-version';

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
    // ignore storage failures (private mode, disabled storage)
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
  const autoReloadVersionRef = useRef<string | null>(null);
  const isApplyingUpdateRef = useRef(false);
  const pwaUpdateSnapshot = useSyncExternalStore(
    subscribeToPwaUpdates,
    getPwaUpdateSnapshot,
    getPwaUpdateSnapshot,
  );

  const checkForUpdates = useEffectEvent(async () => {
    await refreshServiceWorkerRegistration().catch(() => undefined);

    const runtimeConfig = await fetchRuntimeConfig({force: true});

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
      await refreshServiceWorkerRegistration().catch(() => undefined);

      // We deliberately do NOT fall back to `location.reload()` when no
      // service-worker update was applied: reloading just re-serves the
      // stale precached bundle, which on iOS standalone PWAs creates a
      // splash → blank → reload loop whenever a hard update is required.
      // The `ForcedUpdateOverlay` stays visible so the user can retry
      // manually, and the next interval check (or visibility-change event)
      // will pick up the new worker as soon as it installs.
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
      autoReloadVersionRef.current = null;
      return;
    }

    if (autoReloadVersionRef.current === runtimeVersionSnapshot.minimumSupportedVersion) {
      return;
    }

    // sessionStorage survives `location.reload()` so a single tab will only
    // auto-trigger the update flow once per minimum-supported version. Any
    // subsequent retries must come from the manual `ForcedUpdateOverlay`
    // button. This is defensive against cycles where the page reloads with
    // the same stale bundle.
    if (readAutoReloadVersion() === runtimeVersionSnapshot.minimumSupportedVersion) {
      autoReloadVersionRef.current = runtimeVersionSnapshot.minimumSupportedVersion;
      return;
    }

    autoReloadVersionRef.current = runtimeVersionSnapshot.minimumSupportedVersion;
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
