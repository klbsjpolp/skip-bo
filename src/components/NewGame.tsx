import { DifficultySwitcher } from './DifficultySwitcher';
import { Button } from '@/components/ui/button.tsx';
import {StockPileSizeSwitcher} from "@/components/StockPileSizeSwitcher.tsx";

interface NewGameProps {
  onNewGame: () => void;
}

function NewGame({ onNewGame }: NewGameProps) {
  const handleNewGame = () => {
    const ok = window.confirm('Commencer une nouvelle partie ? Vous perdrez la partie en cours.');
    if (ok) {
      // initialGameState() lira la valeur depuis le localStorage
      onNewGame();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <StockPileSizeSwitcher />
      <DifficultySwitcher />
      <Button variant="secondary" onClick={handleNewGame}>Nouvelle partie</Button>
    </div>
  );
}

export default NewGame;