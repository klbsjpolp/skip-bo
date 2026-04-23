import {Sparkles} from 'lucide-react';

import {Button} from '@/components/ui/button';

interface AiCoachToggleProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
}

export function AiCoachToggle({
  enabled,
  onEnabledChange,
}: AiCoachToggleProps) {
  return (
    <Button
      aria-label={enabled ? 'Désactiver le coach automatique' : 'Activer le coach automatique'}
      aria-pressed={enabled}
      className="gap-1.5"
      data-testid="ai-coach-toggle"
      onClick={() => onEnabledChange(!enabled)}
      size="sm"
      type="button"
      variant={enabled ? 'default' : 'outline'}
    >
      <Sparkles className="size-4" />
      Coach
    </Button>
  );
}
