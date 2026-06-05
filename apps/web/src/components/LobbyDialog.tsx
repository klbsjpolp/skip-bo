import { AlertTriangle, Check, Copy, Pencil, UserX } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { MAX_PLAYER_NAME_LENGTH } from '@skipbo/realtime-core';
import type { LobbySeatInfo, LobbyReadyState } from '@skipbo/realtime-core';
import { getStoredPlayerName, storePlayerName } from '@/state/lobbyPreferences';
import { cn } from '@/lib/utils.ts';

interface LobbyDialogProps {
  canStartGame: boolean;
  connectedSeats: number[];
  isHost: boolean;
  kickSeat: (seatIndex: number) => void;
  lobbySeats: LobbySeatInfo[];
  mySeatIndex: number;
  myReadyState: LobbyReadyState;
  onLeave: () => void;
  onReady: (name: string) => void;
  onStartGame: () => void;
  onUnready: () => void;
  open: boolean;
  roomCode: string;
  seatCapacity: number;
}

function SeatRow({
  isHost,
  lobbyInfo,
  onKick,
  seatIndex,
}: {
  isHost: boolean;
  lobbyInfo: LobbySeatInfo | undefined;
  onKick: (seatIndex: number) => void;
  seatIndex: number;
}) {
  const readyState = lobbyInfo?.readyState ?? 'never-ready';
  const displayName = lobbyInfo?.displayName;
  const nameLabel = displayName ?? 'Joueur anonyme';
  const isReady = readyState === 'ready';

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <div
        className={cn(
          'flex size-8 shrink-0 items-center justify-center rounded-full',
          isReady ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground',
        )}
      >
        {isReady ? <Check className="size-4" /> : <Pencil className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <span className="truncate text-sm font-medium">{nameLabel}</span>
      </div>
      {isHost && (
        <Button
          type="button"
          size="xs"
          variant="destructive"
          onClick={() => onKick(seatIndex)}
          aria-label={`Exclure le joueur au siège ${seatIndex + 1}`}
        >
          <UserX className="mr-1 w-4 h-4" />
          <span className="hidden sm:inline">Exclure</span>
        </Button>
      )}
    </div>
  );
}

function StatusMessage({ connectedSeats, lobbySeats }: { connectedSeats: number[]; lobbySeats: LobbySeatInfo[] }) {
  if (connectedSeats.length < 2) {
    return <p className="text-center text-muted-sm">En attente d'au moins un autre joueur</p>;
  }

  const allReady = connectedSeats.every((s) => lobbySeats.find((lp) => lp.seatIndex === s)?.readyState === 'ready');

  if (allReady) {
    return <p className="text-center text-sm font-medium text-success">Tous les joueurs sont prêts !</p>;
  }

  return <p className="text-center text-muted-sm">Tous les joueurs doivent être prêts pour démarrer</p>;
}

export function LobbyDialog({
  canStartGame,
  connectedSeats,
  isHost,
  kickSeat,
  lobbySeats,
  mySeatIndex,
  myReadyState,
  onLeave,
  onReady,
  onStartGame,
  onUnready,
  open,
  roomCode,
  seatCapacity,
}: LobbyDialogProps) {
  const [playerName, setPlayerName] = useState(() => getStoredPlayerName());
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleReady = () => {
    const trimmed = playerName.trim();
    storePlayerName(trimmed);
    onReady(trimmed || (undefined as unknown as string));
  };

  const seats = Array.from({ length: seatCapacity }, (_, i) => i);

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent
        className="w-[min(32rem,calc(100vw-1rem))] max-h-[calc(100svh-1rem)] gap-4 overflow-y-auto p-4"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        aria-description="lobby"
        showClose={false}
      >
        <DialogHeader>
          <DialogTitle className="text-xl">Salle d'attente</DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border bg-secondary p-3 flex flex-col gap-4">
          {/* Room code */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Code de partie</p>
              <p className="font-mono text-2xl font-bold tracking-[0.25em]">{roomCode}</p>
            </div>
            {import.meta.env.DEV && (
              <Button type="button" size="sm" variant="outline" onClick={() => void handleCopy()}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                &nbsp;
                {copied ? 'Copié' : 'Copier'}
              </Button>
            )}
          </div>

          {/* My controls */}
          <div className="flex flex-col gap-2">
            <label htmlFor="lobby-player-name" className="text-xs text-muted-foreground">
              Nom (optionnel, {MAX_PLAYER_NAME_LENGTH} caractères max)
            </label>
            <div className="flex gap-1">
              <Input
                id="lobby-player-name"
                aria-label="Votre nom"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Votre nom"
                maxLength={MAX_PLAYER_NAME_LENGTH}
                autoComplete="nickname"
                className="text-base sm:text-sm grow"
                disabled={myReadyState === 'ready'}
              />
              {myReadyState === 'ready' ? (
                <Button type="button" variant="outline" onClick={onUnready}>
                  Je ne suis pas prêt
                </Button>
              ) : (
                <Button type="button" onClick={handleReady}>
                  Je suis prêt
                </Button>
              )}
            </div>
          </div>
        </div>

        <StatusMessage connectedSeats={connectedSeats} lobbySeats={lobbySeats} />

        {/* Player list */}
        <div className="flex flex-col gap-2">
          {seats
            .filter((seatIndex) => seatIndex !== mySeatIndex && connectedSeats.includes(seatIndex))
            .map((seatIndex) => (
              <SeatRow
                key={seatIndex}
                isHost={isHost}
                lobbyInfo={lobbySeats.find((s) => s.seatIndex === seatIndex)}
                onKick={kickSeat}
                seatIndex={seatIndex}
              />
            ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onLeave}>
            Quitter le salon
          </Button>
          {isHost && (
            <Button type="button" className="flex-1" disabled={!canStartGame} onClick={onStartGame}>
              Démarrer la partie
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const REMOVAL_MESSAGES = {
  'host-left': {
    title: 'Partie annulée',
    body: "L'hôte a quitté la salle. La partie a été annulée.",
  },
  kicked: {
    title: 'Vous avez été exclu',
    body: "L'hôte vous a retiré de la salle.",
  },
} as const;

export function LobbyRemovedDialog({
  onDismiss,
  reason,
}: {
  onDismiss: () => void;
  reason: 'host-left' | 'kicked' | null;
}) {
  const message = reason ? REMOVAL_MESSAGES[reason] : null;

  return (
    <Dialog open={reason !== null} onOpenChange={() => undefined}>
      <DialogContent
        className="w-[min(22rem,calc(100vw-1rem))] gap-4 p-6"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        aria-description="lobby-removed"
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <AlertTriangle className="size-5 text-destructive" />
            </div>
            <DialogTitle>{message?.title}</DialogTitle>
          </div>
        </DialogHeader>
        <p className="text-muted-sm">{message?.body}</p>
        <Button type="button" onClick={onDismiss}>
          Retour à l'accueil
        </Button>
      </DialogContent>
    </Dialog>
  );
}
