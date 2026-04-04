import {Asterisk, LoaderCircle, Plug, Plus, type LucideIcon} from 'lucide-react';
import {useState} from 'react';

import {StockPileSizeSwitcher} from '@/components/StockPileSizeSwitcher.tsx';
import {Button} from '@/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {getStoredStockSize} from '@/state/initialGameState.ts';
import {isValidRoomCode, normalizeRoomCode} from '@skipbo/multiplayer-protocol';

interface NewGameProps {
  onDebugFillBuildPile?: () => void;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize: number) => Promise<void>;
}

type NewGameMode = 'local' | 'create-online' | 'join-online';

interface ModeOption {
  description: string;
  icon: LucideIcon;
  key: NewGameMode;
  shortLabel: string;
  title: string;
}

const MODE_OPTIONS: ModeOption[] = [
  {
    key: 'local',
    title: 'Local vs IA',
    shortLabel: 'Local',
    description: 'Une nouvelle partie hors ligne, immédiatement sur cet appareil.',
    icon: Plus,
  },
  {
    key: 'create-online',
    title: 'Créer en ligne',
    shortLabel: 'Créer',
    description: 'Générez un code privé à partager avec un autre joueur.',
    icon: Asterisk,
  },
  {
    key: 'join-online',
    title: 'Rejoindre en ligne',
    shortLabel: 'Rejoindre',
    description: 'Entrez le code de 5 caractères reçu de l’hôte.',
    icon: Plug,
  },
];

function NewGame({
  onDebugFillBuildPile,
  onJoinOnlineGame,
  onStartLocalGame,
  onStartOnlineGame,
}: NewGameProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'create-online' | 'join-online' | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [selectedMode, setSelectedMode] = useState<NewGameMode>('local');
  const [stockSize, setStockSize] = useState<number>(() => getStoredStockSize());

  const stockSizeSummary = `${stockSize} cartes par joueur`;
  const stockSizeDetail = `Pile de départ: ${stockSizeSummary}.`;
  const isBusy = pendingAction !== null;
  const isCreatingOnline = pendingAction === 'create-online';
  const isJoiningOnline = pendingAction === 'join-online';
  const selectedModeOption = MODE_OPTIONS.find((option) => option.key === selectedMode) ?? MODE_OPTIONS[0];
  const SelectedModeIcon = selectedModeOption.icon;

  const resetDialogState = () => {
    setErrorMessage(null);
    setPendingAction(null);
    setRoomCode('');
    setSelectedMode('local');
  };

  const handleStartOnline = async () => {
    setErrorMessage(null);
    setPendingAction('create-online');

    try {
      await onStartOnlineGame(stockSize);
      setIsOpen(false);
      resetDialogState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de créer la partie.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleJoinOnline = async () => {
    const normalizedRoomCode = normalizeRoomCode(roomCode);
    if (!isValidRoomCode(normalizedRoomCode)) {
      setErrorMessage('Entrez un code de partie valide sur 5 caractères.');
      return;
    }

    setErrorMessage(null);
    setPendingAction('join-online');

    try {
      await onJoinOnlineGame(normalizedRoomCode);
      setIsOpen(false);
      resetDialogState();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Impossible de rejoindre la partie.');
    } finally {
      setPendingAction(null);
    }
  };

  const handleStartLocal = () => {
    onStartLocalGame();
    setIsOpen(false);
    resetDialogState();
  };

  return (
    <div className="flex flex-wrap items-baseline gap-2">
      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          setIsOpen(nextOpen);
          if (nextOpen) {
            setStockSize(getStoredStockSize());
            setSelectedMode('local');
          }
          if (!nextOpen) {
            resetDialogState();
          }
        }}
      >
        <DialogTrigger asChild>
          <Button variant="secondary">Nouvelle partie</Button>
        </DialogTrigger>
        <DialogContent className="w-[min(32rem,calc(100vw-1rem))] max-h-[calc(100svh-1rem)] gap-3 overflow-y-auto p-3 sm:p-4">
          <DialogHeader className="pr-10">
            <DialogTitle className="text-xl sm:text-2xl">Nouvelle partie</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2" role="group" aria-label="Mode de partie">
            {MODE_OPTIONS.map((option) => {
              const ModeIcon = option.icon;
              const isSelected = option.key === selectedMode;

              return (
                <Button
                  key={option.key}
                  type="button"
                  size="sm"
                  variant={isSelected ? 'default' : 'outline'}
                  className="h-10 gap-1.5 px-2"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedMode(option.key);
                    setErrorMessage(null);
                  }}
                >
                  <ModeIcon className="size-4" />
                  <span className="truncate">{option.shortLabel}</span>
                </Button>
              );
            })}
          </div>

          {selectedMode !== 'join-online' ? (
            <section className="rounded-xl border bg-card/40 p-3">
              <div className="flex flex-col gap-1">
                <h2 className="text-sm font-medium">Paramètres</h2>
                <p className="text-xs text-muted-foreground">{stockSizeDetail}</p>
              </div>
              <div className="mt-2">
                <StockPileSizeSwitcher stockSize={stockSize} onStockSizeChange={setStockSize} />
              </div>
            </section>
          ) : null}

          <section className="rounded-xl border bg-card/40 p-3">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <SelectedModeIcon className="size-5" />
              </div>
              <div className="min-w-0">
                <h2 className="font-medium">{selectedModeOption.title}</h2>
                <p
                  id={selectedMode === 'join-online' ? 'new-game-room-code-hint' : undefined}
                  className="mt-1 text-sm text-muted-foreground text-pretty"
                >
                  {selectedModeOption.description}
                </p>
              </div>
            </div>

            {selectedMode === 'join-online' ? (
              <>
                <form
                  className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    void handleJoinOnline();
                  }}
                >
                  <Input
                    value={roomCode}
                    onChange={(event) => {
                      setRoomCode(normalizeRoomCode(event.target.value));
                      setErrorMessage(null);
                    }}
                    placeholder="ABCDE"
                    maxLength={5}
                    autoCapitalize="characters"
                    autoComplete="off"
                    enterKeyHint="go"
                    aria-describedby="new-game-room-code-hint"
                    className="h-11 font-mono text-base tracking-[0.28em] uppercase sm:text-sm"
                  />
                  <Button type="submit" className="min-w-28" disabled={isBusy}>
                    {isJoiningOnline ? <LoaderCircle data-icon="inline-start" className="animate-spin" /> : <Plug data-icon="inline-start" />}
                    Rejoindre
                  </Button>
                </form>
                <p className="mt-2 text-xs text-muted-foreground">
                  Les paramètres de partie sont définis par l’hôte.
                </p>
              </>
            ) : (
              <Button
                type="button"
                className="mt-3 w-full"
                onClick={() => {
                  if (selectedMode === 'local') {
                    handleStartLocal();
                    return;
                  }

                  void handleStartOnline();
                }}
                disabled={isBusy}
              >
                {selectedMode === 'local' ? (
                  <>
                    <Plus data-icon="inline-start" />
                    Jouer local
                  </>
                ) : (
                  <>
                    {isCreatingOnline ? (
                      <LoaderCircle data-icon="inline-start" className="animate-spin" />
                    ) : (
                      <Asterisk data-icon="inline-start" />
                    )}
                    Créer la partie
                  </>
                )}
              </Button>
            )}
          </section>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
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
