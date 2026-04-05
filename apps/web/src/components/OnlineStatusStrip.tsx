import {Check, CircleCheck, Copy, Flag, LoaderCircle} from 'lucide-react';
import {useState} from 'react';

import {Button} from '@/components/ui/button';
import {cn} from '@/lib/utils';

interface OnlineStatusStripProps {
  connectedSeats: number[];
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
  roomCode: string;
  roomStatus: 'ACTIVE' | 'FINISHED' | 'WAITING';
}

const getStatusLabel = (
  connectionStatus: OnlineStatusStripProps['connectionStatus'],
  roomStatus: OnlineStatusStripProps['roomStatus'],
  connectedSeats: number[],
): string => {
  if (roomStatus === 'FINISHED') {
    return 'Partie terminée';
  }

  if (connectionStatus !== 'connected') {
    return 'Connexion en cours';
  }

  if (connectedSeats.length < 2) {
    return 'En attente de votre adversaire';
  }

  return 'Adversaire connecté';
};

export function OnlineStatusStrip({
  connectedSeats,
  connectionStatus,
  roomCode,
  roomStatus,
}: OnlineStatusStripProps) {
  const [copied, setCopied] = useState(false);
  const statusLabel = getStatusLabel(connectionStatus, roomStatus, connectedSeats);

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
        {roomStatus === 'WAITING' && (<LoaderCircle className="animate-spin text-primary"/>)}
        {roomStatus === 'ACTIVE' && (<CircleCheck className="text-success" />)}
        {roomStatus === 'FINISHED' && (<Flag className="text-muted-foreground"/>)}
      </span>
      {roomStatus === 'WAITING' && (<>
            <div
                className="flex flex-row rounded-xl border gap-1 py-0.5 px-2 bg-secondary text-secondary-foreground items-center">
              <p className="text-sm font-medium font-mono tracking-[0.2em]">{roomCode}</p>
              <Button type="button" size="icon-xs" variant="ghost" onClick={() => void handleCopy()}>
              {copied ? <Check data-icon="inline-start" /> : connectionStatus === 'connecting' ? null : <Copy data-icon="inline-start" />}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
