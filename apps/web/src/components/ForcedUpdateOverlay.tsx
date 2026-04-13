import {Button} from '@/components/ui/button';

interface ForcedUpdateOverlayProps {
  currentVersion: string;
  isReloading: boolean;
  latestVersion: string | null;
  minimumSupportedVersion: string;
  onReload: () => void;
}

export function ForcedUpdateOverlay({
  currentVersion,
  isReloading,
  latestVersion,
  minimumSupportedVersion,
  onReload,
}: ForcedUpdateOverlayProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/85 px-4 py-6 backdrop-blur-sm">
      <section
        aria-describedby="forced-update-description"
        aria-labelledby="forced-update-title"
        aria-modal="true"
        className="w-full max-w-lg rounded-2xl border border-border/80 bg-background/95 p-6 shadow-xl"
        role="alertdialog"
      >
        <div className="space-y-3">
          <h2 className="text-xl font-semibold" id="forced-update-title">
            Mise à jour requise
          </h2>
          <p className="text-sm text-muted-foreground" id="forced-update-description">
            Cette version n’est plus prise en charge. Rechargez l’application pour continuer à jouer.
          </p>
          <div className="rounded-xl border border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
            <p>Version actuelle: {currentVersion}</p>
            <p>Version minimale: {minimumSupportedVersion}</p>
            {latestVersion ? <p>Version disponible: {latestVersion}</p> : null}
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={onReload} type="button" disabled={isReloading}>
            {isReloading ? 'Rechargement…' : 'Recharger maintenant'}
          </Button>
        </div>
      </section>
    </div>
  );
}
