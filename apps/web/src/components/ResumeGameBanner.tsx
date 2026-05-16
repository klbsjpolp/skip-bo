import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface ResumeGameBannerProps {
  isResuming: boolean;
  onDismiss: () => void;
  onResume: () => void;
  roomCode: string;
}

export function ResumeGameBanner({ isResuming, onDismiss, onResume, roomCode }: ResumeGameBannerProps) {
  return (
    <Alert className="border-primary/30 bg-background/95 shadow-sm" data-testid="resume-game-banner">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="space-y-1">
          <AlertTitle>Reprendre la partie ?</AlertTitle>
          <AlertDescription>
            Une partie en cours a été détectée dans la room{' '}
            <span className="font-mono tracking-[0.2em]">{roomCode}</span>.
          </AlertDescription>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button data-testid="resume-game-button" disabled={isResuming} onClick={onResume} size="sm" type="button">
            {isResuming ? 'Reconnexion…' : 'Reprendre'}
          </Button>
          <Button
            data-testid="resume-game-dismiss"
            disabled={isResuming}
            onClick={onDismiss}
            size="sm"
            type="button"
            variant="outline"
          >
            Quitter
          </Button>
        </div>
      </div>
    </Alert>
  );
}
