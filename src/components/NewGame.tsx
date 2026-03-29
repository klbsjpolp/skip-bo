import { Button } from '@/components/ui/button.tsx';
import {StockPileSizeSwitcher} from "@/components/StockPileSizeSwitcher.tsx";

interface NewGameProps {
  onNewGame: () => void;
  onDebugFillBuildPile?: () => void;
}

function NewGame({ onNewGame, onDebugFillBuildPile }: NewGameProps) {
  const handleNewGame = () => {
    const ok = window.confirm('Commencer une nouvelle partie ? Vous perdrez la partie en cours.');
    if (ok) {
      // initialGameState() lira la valeur depuis le localStorage
      onNewGame();
    }
  };

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <StockPileSizeSwitcher />
      <Button variant="secondary" onClick={handleNewGame}>Nouvelle partie</Button>
      {import.meta.env.DEV && onDebugFillBuildPile ? (
        <Button
          variant="outline"
          onClick={onDebugFillBuildPile}
          data-testid="debug-fill-build-pile-button"
        >
          Debug: pile prête
        </Button>
      ) : null}
    </div>
  );
}

export default NewGame;
