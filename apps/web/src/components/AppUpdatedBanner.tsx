import { useEffect } from 'react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

const AUTO_DISMISS_MS = 5000;

interface AppUpdatedBannerProps {
  currentVersion: string;
  onDismiss: () => void;
}

export function AppUpdatedBanner({ currentVersion, onDismiss }: AppUpdatedBannerProps) {
  // `onDismiss` is a stable callback from the gate hook, so the auto-dismiss
  // timer is armed once and isn't reset on parent re-renders.
  useEffect(() => {
    const timeoutId = globalThis.setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [onDismiss]);

  return (
    <Alert className="border-primary/30 bg-background/95 shadow-sm" data-testid="app-updated-banner">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <AlertTitle>Mise à jour installée ✓</AlertTitle>
          <AlertDescription>Vous utilisez maintenant la version {currentVersion}.</AlertDescription>
        </div>
        <Button
          className="shrink-0"
          data-testid="app-updated-dismiss"
          onClick={onDismiss}
          size="sm"
          type="button"
          variant="outline"
        >
          OK
        </Button>
      </div>
    </Alert>
  );
}
