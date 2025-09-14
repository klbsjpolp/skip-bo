import { useSkipBoGame } from '@/hooks/useSkipBoGame';
import { selectDifficulty } from '@/state/selectors';
import { AIDifficulty } from '@/types';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select.tsx";

const difficulties = [
  { value: 'easy', label: 'Facile' },
  { value: 'medium', label: 'Moyen' },
  { value: 'hard', label: 'Difficile' },
];

export function DifficultySwitcher() {
  const { gameState, setDifficulty } = useSkipBoGame();
  const currentDifficulty = selectDifficulty(gameState);

  return (<SelectGroup className="flex items-baseline gap-2 hidden">
    <SelectLabel className="text-sm">Difficulté: </SelectLabel>
    <Select value={currentDifficulty} onValueChange={setDifficulty}>
      <SelectTrigger className="w-24">
        <SelectValue placeholder="Difficulté" />
      </SelectTrigger>
      <SelectContent>
        {difficulties.map(({ value, label }) => (
          <SelectItem key={value} value={value} onClick={() => setDifficulty(value as AIDifficulty)}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
    </SelectGroup>
  );
}