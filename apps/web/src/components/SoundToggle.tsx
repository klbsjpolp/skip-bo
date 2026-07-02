import * as Lucide from 'lucide-react';
import { useSound } from '@/sound/useSound';
import { Toggle } from '@/components/ui/toggle';

/** Mute/unmute toggle for game audio. Lives in the app toolbar next to the theme switcher. */
export function SoundToggle() {
  const { enabled, setEnabled } = useSound();
  const label = enabled ? 'Couper le son' : 'Activer le son';

  return (
    <Toggle
      size="sm"
      onPressedChange={(pressed) => setEnabled(pressed)}
      pressed={enabled}
      title={label}
      data-testid="sound-toggle"
    >
      {enabled ? <Lucide.Volume2 className="h-4 w-4" /> : <Lucide.VolumeX className="h-4 w-4" />}
    </Toggle>
  );
}
