import { Button } from '@/components/ui/button';
import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { selectDifficulty } from '@/state/selectors';
import { AIDifficulty } from '@/types';

const difficulties = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
];

export function DifficultySwitcher() {
  const { gameState, setDifficulty } = useSkipBoGame();
  const currentDifficulty = selectDifficulty(gameState);

  return (
    <div className="flex justify-center gap-4 mb-6 text-foreground">
      <span className="flex items-center mr-2">Difficulté IA:</span>
      {difficulties.map(({ value, label }) => (
        <Button
          key={value}
          variant={currentDifficulty === value ? "default" : "outline"}
          size="sm"
          onClick={() => setDifficulty(value as AIDifficulty)}
        >
          {label}
        </Button>
      ))}
    </div>
  );
}