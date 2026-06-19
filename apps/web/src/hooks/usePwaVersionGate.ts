import { startTransition, useCallback, useEffect, useEffectEvent, useRef, useState, useSyncExternalStore } from 'react';

import { APP_VERSION } from '@/lib/appVersion';
import {
  applyServiceWorkerUpdate,
  getPwaUpdateSnapshot,
  refreshServiceWorkerRegistration,
  subscribeToPwaUpdates,
} from '@/lib/pwaUpdates';
import { fetchRuntimeConfig } from '@/lib/runtimeConfig';
import { compareAppVersions, normalizeVersionTag } from '@/lib/versionUtils';
import { PWA_UPDATE_CHECK_INTERVAL_MS, PWA_UPDATE_RECHECK_MIN_INTERVAL_MS } from '@/config/timing';
export const AUTO_RELOAD_SESSION_STORAGE_KEY = 'skipbo:pwa-auto-reload-version';
export const SOFT_AUTO_RELOAD_SESSION_STORAGE_KEY = 'skipbo:pwa-soft-auto-reload-key';
export const LAST_SEEN_VERSION_STORAGE_KEY = 'skipbo:last-seen-version';

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

const readSoftAutoReloadKey = (): string | null => {
  try {
    return globalThis.sessionStorage?.getItem(SOFT_AUTO_RELOAD_SESSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

const writeSoftAutoReloadKey = (key: string) => {
  try {
    globalThis.sessionStorage?.setItem(SOFT_AUTO_RELOAD_SESSION_STORAGE_KEY, key);
  } catch {
    // private mode / disabled storage — silently no-op
  }
};

const readLastSeenVersion = (): string | null => {
  try {
    return globalThis.localStorage?.getItem(LAST_SEEN_VERSION_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
};

const writeLastSeenVersion = (version: string) => {
  try {
    globalThis.localStorage?.setItem(LAST_SEEN_VERSION_STORAGE_KEY, version);
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
  isUpdatePending: boolean;
  justUpdatedFromVersion: string | null;
  lastCheckAt: number | null;
  applyUpdateOnceForCurrentTarget: () => void;
  dismissJustUpdated: () => void;
  dismissSoftUpdate: () => void;
  reloadToUpdate: () => void;
  shouldShowSoftUpdate: boolean;
}

export interface UsePwaVersionGateOptions {
  // While true, the blocking minimum-version auto-reload is held off. Local
  // single-player games aren't reconstructable after a reload (unlike online,
  // which rebuilds from the server snapshot) and the protocol floor only matters
  // for multiplayer, so the caller defers the hard update until a lossless moment
  // (new game / replay / going online) and applies it imperatively there.
  deferHardUpdate?: boolean;
}

export const usePwaVersionGate = ({ deferHardUpdate = false }: UsePwaVersionGateOptions = {}): PwaVersionGateState => {
  const [dismissedUpdateKey, setDismissedUpdateKey] = useState<string | null>(null);
  const [isApplyingUpdate, setIsApplyingUpdate] = useState(false);
  const [justUpdatedFromVersion, setJustUpdatedFromVersion] = useState<string | null>(() => {
    const lastSeen = readLastSeenVersion();
    return lastSeen && compareAppVersions(lastSeen, APP_VERSION) < 0 ? lastSeen : null;
  });
  const [runtimeVersionSnapshot, setRuntimeVersionSnapshot] = useState<RuntimeVersionSnapshot>({
    latestAppVersion: null,
    minimumSupportedVersion: null,
    lastCheckAt: null,
  });
  const isApplyingUpdateRef = useRef(false);
  const lastCheckAtRef = useRef(0);
  const pwaUpdateSnapshot = useSyncExternalStore(subscribeToPwaUpdates, getPwaUpdateSnapshot, getPwaUpdateSnapshot);

  const checkForUpdates = useEffectEvent(async () => {
    // Stamp before the awaits so a burst of focus events throttles against this
    // in-flight check rather than only against the previous completed one.
    lastCheckAtRef.current = Date.now();

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

  const runReloadToUpdate = useCallback(async () => {
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
  }, []);

  const reloadToUpdate = useEffectEvent(() => {
    void runReloadToUpdate();
  });

  useEffect(() => {
    void checkForUpdates();

    const intervalId = globalThis.setInterval(() => {
      void checkForUpdates();
    }, PWA_UPDATE_CHECK_INTERVAL_MS);

    return () => {
      globalThis.clearInterval(intervalId);
    };
  }, []);

  const recheckWhenVisible = useEffectEvent(() => {
    if (document.visibilityState !== 'visible') {
      return;
    }

    // Collapse bursts of visibility/pageshow/online events (common on mobile
    // app-switching) into one network round-trip per throttle window.
    if (Date.now() - lastCheckAtRef.current < PWA_UPDATE_RECHECK_MIN_INTERVAL_MS) {
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
  // The `runtime:` key can be pending before the service worker has fetched the
  // new build: `applyServiceWorkerUpdate` then finds no waiting worker and
  // returns false (no reload), logging `pwa.apply-update.no-waiting-worker`. This
  // self-heals — once the worker catches up, `needRefresh` flips the key to
  // `service-worker:` and apply succeeds — and the per-key soft guard below keeps
  // it from reload-looping in the meantime.
  const updateKey = isHardUpdateRequired
    ? `minimum:${runtimeVersionSnapshot.minimumSupportedVersion}`
    : pwaUpdateSnapshot.needRefresh
      ? `service-worker:${runtimeVersionSnapshot.latestAppVersion ?? 'pending'}`
      : hasRuntimeUpdate
        ? `runtime:${runtimeVersionSnapshot.latestAppVersion}`
        : null;
  const shouldShowSoftUpdate = !!updateKey && !isHardUpdateRequired && dismissedUpdateKey !== updateKey;
  // A non-blocking update is available (waiting service worker or a newer runtime
  // version), as opposed to the blocking minimum-version gate.
  const isUpdatePending = !!updateKey && !isHardUpdateRequired;

  // Remember the version this tab last loaded so the next launch can tell whether
  // it just came up on a newer build (used to show the "update installed" notice).
  useEffect(() => {
    writeLastSeenVersion(APP_VERSION);
  }, []);

  // Apply a pending soft update at most once per target version. Callers invoke
  // this at a lossless moment (a fresh/untouched local game, or a safe point in
  // an online game) so a background update lands without a wall-clock deadline —
  // a slow service-worker download is still caught whenever it finishes. The
  // sessionStorage guard survives `location.reload()`, so a deploy that
  // advertises a version it isn't actually serving yet can't reload-loop.
  const applyUpdateOnceForCurrentTarget = useCallback(() => {
    if (!isUpdatePending || !updateKey) {
      return;
    }

    if (readSoftAutoReloadKey() === updateKey) {
      return;
    }

    writeSoftAutoReloadKey(updateKey);
    void runReloadToUpdate();
  }, [isUpdatePending, updateKey, runReloadToUpdate]);

  const dismissJustUpdated = useCallback(() => {
    setJustUpdatedFromVersion(null);
  }, []);

  useEffect(() => {
    if (!isHardUpdateRequired || !runtimeVersionSnapshot.minimumSupportedVersion) {
      return;
    }

    // The caller is in a state where an automatic reload would be destructive
    // (e.g. an in-progress local game). Hold off — it will apply the update at a
    // lossless moment. Lifting the defer re-runs this effect via the dep below.
    if (deferHardUpdate) {
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
  }, [deferHardUpdate, isHardUpdateRequired, runtimeVersionSnapshot.minimumSupportedVersion]);

  return {
    currentAppVersion: APP_VERSION,
    latestAppVersion: runtimeVersionSnapshot.latestAppVersion,
    minimumSupportedVersion: runtimeVersionSnapshot.minimumSupportedVersion,
    hasPendingServiceWorkerUpdate: pwaUpdateSnapshot.needRefresh,
    isApplyingUpdate,
    isHardUpdateRequired,
    isUpdatePending,
    justUpdatedFromVersion,
    lastCheckAt: runtimeVersionSnapshot.lastCheckAt,
    applyUpdateOnceForCurrentTarget,
    dismissJustUpdated,
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
