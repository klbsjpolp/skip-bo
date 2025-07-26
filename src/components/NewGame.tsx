import {DifficultySwitcher} from './DifficultySwitcher';
import {Button} from "@/components/ui/button.tsx";
import {useSkipBoGame} from "@/hooks/useSkipBoGame.ts";

function NewGame (){
  const { initializeGame } = useSkipBoGame();
  return (
    <div className="flex items-center gap-2 invisible">
      <DifficultySwitcher />
      <Button onClick={initializeGame}>Nouvelle partie</Button>
    </div>
  );
};

export default NewGame;