import {Alert, AlertDescription, AlertTitle} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

interface AppUpdateBannerProps {
  currentVersion: string;
  hasPendingServiceWorkerUpdate: boolean;
  isReloading: boolean;
  latestVersion: string | null;
  onDismiss: () => void;
  onReload: () => void;
}

export function AppUpdateBanner({
  currentVersion,
  hasPendingServiceWorkerUpdate,
  isReloading,
  latestVersion,
  onDismiss,
  onReload,
}: AppUpdateBannerProps) {
  const title = hasPendingServiceWorkerUpdate ? 'Mise à jour prête' : 'Nouvelle version disponible';
  const description = latestVersion
    ? `La version ${latestVersion} est disponible. Vous utilisez ${currentVersion}.`
    : 'Une nouvelle version est disponible. Rechargez l’application pour utiliser le build le plus récent.';

  return (
    <Alert className="border-primary/30 bg-background/95 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <AlertTitle>{title}</AlertTitle>
          <AlertDescription>{description}</AlertDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button onClick={onReload} size="sm" type="button" disabled={isReloading}>
            {isReloading ? 'Rechargement…' : 'Recharger'}
          </Button>
          <Button onClick={onDismiss} size="sm" type="button" variant="outline" disabled={isReloading}>
            Plus tard
          </Button>
        </div>
      </div>
    </Alert>
  );
}
