import * as Lucide from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSound } from '@/sound/useSound';

/** Mute/unmute toggle for game audio. Lives in the app toolbar next to the theme switcher. */
export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  const label = enabled ? 'Couper le son' : 'Activer le son';

  return (
    <Button
      type="button"
      size="sm"
      variant={enabled ? 'default' : 'outline'}
      onClick={() => setEnabled(!enabled)}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      data-testid="sound-toggle"
    >
      {enabled ? <Lucide.Volume2 className="h-4 w-4" /> : <Lucide.VolumeX className="h-4 w-4" />}
    </Button>
  );
}
