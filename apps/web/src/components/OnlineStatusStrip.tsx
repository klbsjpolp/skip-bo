import {Check, CircleCheck, Copy, Flag, LoaderCircle, WifiOff} from 'lucide-react';
import {useEffect, useState} from 'react';

import type {DisconnectedSeatInfo} from '@skipbo/multiplayer-protocol';

import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

const GRACE_MS = 5 * 60 * 1000;

interface DisconnectedPlayer {
  displayName: string;
  seatIndex: number;
}

interface OnlineStatusStripProps {
  canStartGame?: boolean;
  connectedSeats: number[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  disconnectedSeats?: DisconnectedSeatInfo[];
  isHost?: boolean;
  onStartGame?: () => void;
  playersBySeatIndex?: Record<number, DisconnectedPlayer>;
  roomCode: string;
  roomStatus: 'ACTIVE' | 'FINISHED' | 'WAITING';
  seatCapacity?: number;
}

const getStatusLabel = (
  connectionStatus: OnlineStatusStripProps['connectionStatus'],
  roomStatus: OnlineStatusStripProps['roomStatus'],
  connectedSeats: number[],
  seatCapacity: number,
): string => {
  if (roomStatus === 'FINISHED') {
    return 'Partie terminée';
  }

  if (connectionStatus !== 'connected') {
    return 'Connexion en cours';
  }

  if (roomStatus === 'ACTIVE') {
    return 'Partie en cours';
  }

  if (connectedSeats.length < seatCapacity) {
    return `En attente de joueurs (${connectedSeats.length}/${seatCapacity})`;
  }

  return `Tous les joueurs sont connectés (${connectedSeats.length}/${seatCapacity})`;
};

const formatRemaining = (remainingMs: number): string => {
  if (remainingMs <= 0) return '0:00';
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

const getSeatLabel = (
  seatIndex: number,
  playersBySeatIndex?: Record<number, DisconnectedPlayer>,
): string =>
  playersBySeatIndex?.[seatIndex]?.displayName ?? `Joueur ${seatIndex + 1}`;

export function OnlineStatusStrip({
  canStartGame = false,
  connectedSeats,
  connectionStatus,
  disconnectedSeats = [],
  isHost = false,
  onStartGame,
  playersBySeatIndex,
  roomCode,
  roomStatus,
  seatCapacity = 2,
}: OnlineStatusStripProps) {
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const connectedSeatCount = connectedSeats.length;
  const statusLabel = getStatusLabel(connectionStatus, roomStatus, connectedSeats, seatCapacity);

  useEffect(() => {
    if (disconnectedSeats.length === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [disconnectedSeats.length]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.warn('Failed to copy room code:', error);
    }
  };

  return (
    <div
      className={cn(
        'flex flex-row gap-3 items-center',
        roomStatus === 'WAITING' && 'border-dashed',
      )}
      data-testid="online-status-strip"
    >
      <span className="text-primary-foreground" title={statusLabel} aria-label={statusLabel}>
        {disconnectedSeats?.length ? <WifiOff className="text-destructive" /> :
         roomStatus === 'WAITING' ? (<LoaderCircle className="animate-spin text-primary"/>) :
         roomStatus === 'ACTIVE' ? (<CircleCheck className="text-success" />) :
         roomStatus === 'FINISHED' ? (<Flag className="text-muted-foreground"/>) : null}
      </span>
      {roomStatus === 'WAITING' && (<>
          <div
            className="flex flex-row rounded-xl border gap-1 py-0.5 px-2 bg-secondary text-secondary-foreground items-center"
            data-testid="online-room-controls"
          >
            <p className="text-sm font-medium tabular-nums" data-testid="online-seat-count">{connectedSeatCount}/{seatCapacity} joueurs</p>
            <div className="mx-1 h-4 w-px bg-border/70" aria-hidden="true" />
            <p className="text-sm font-medium font-mono tracking-[0.2em]">{roomCode}</p>
            <Button type="button" size="icon-xs" variant="ghost" onClick={() => void handleCopy()}>
              {copied ? <Check data-icon="inline-start" /> : connectionStatus === 'connecting' ? null : <Copy data-icon="inline-start" />}
            </Button>
            {isHost ? (
              <>
                <div className="mx-1 h-4 w-px bg-border/70" aria-hidden="true" />
                <Button
                  type="button"
                  size="xs"
                  variant="ghost"
                  className="font-medium"
                  onClick={onStartGame}
                  disabled={!canStartGame}
                >
                  Démarrer
                </Button>
              </>
            ) : null}
          </div>
        </>
      )}
      {disconnectedSeats.length > 0 && (
        <div
          className="flex flex-row gap-1 items-center"
          data-testid="online-disconnected-seats"
        >
          {disconnectedSeats.map((entry) => {
            const remainingMs = GRACE_MS - (now - new Date(entry.disconnectedAt).getTime());
            const seatLabel = getSeatLabel(entry.seatIndex, playersBySeatIndex);
            const isExpired = remainingMs <= 0;
            const text = isExpired
              ? `${seatLabel} a quitté`
              : `${seatLabel} déconnecté (${formatRemaining(remainingMs)})`;
            return (
              <div
                key={entry.seatIndex}
                className="flex flex-row rounded-xl border gap-1 py-0.5 px-2 bg-secondary text-secondary-foreground items-center"
                data-testid={`disconnected-seat-${entry.seatIndex}`}
                data-seat-index={entry.seatIndex}
                data-expired={isExpired ? 'true' : 'false'}
              >
                <p className="text-sm font-medium tabular-nums">{text}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
