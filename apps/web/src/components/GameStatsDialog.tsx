import { BarChart3, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { GameStatsMode, GameStatsRecord } from '@/monitoring/gameStats';

const formatClock = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes} min ${seconds.toString().padStart(2, '0')} s` : `${seconds} s`;
};

const formatTime = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleTimeString('fr-FR', { timeStyle: 'short' });
};

const formatMode = (mode: GameStatsMode): string => (mode === 'online' ? 'En ligne' : 'Local');

interface SummaryItemProps {
  label: string;
  value: string;
}

function SummaryItem({ label, value }: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-secondary/40 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground/80">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}

export interface GameStatsDialogProps {
  record: GameStatsRecord;
}

/**
 * Victory-screen summary for the game that just finished. Opened by a button so
 * it does not crowd the board; reads its data from the recorder's last record.
 */
export function GameStatsDialog({ record }: GameStatsDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" data-testid="game-stats-button">
          <BarChart3 className="size-4" aria-hidden />
          Statistiques
        </Button>
      </DialogTrigger>
      <DialogContent data-testid="game-stats-dialog" className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Statistiques de la partie</DialogTitle>
          <DialogDescription>
            {formatMode(record.mode)}
            {record.mode === 'online' ? ` · ${record.playerCount} joueurs · version ${record.appVersion}` : null}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <SummaryItem label="Début" value={formatTime(record.startedAt)} />
          <SummaryItem label="Durée" value={formatClock(record.durationMs)} />
          <SummaryItem label="Cartes au départ" value={String(record.stockSize)} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm" data-testid="game-stats-players">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground/80">
                <th className="py-1 pr-3 font-medium">Joueur</th>
                <th className="py-1 px-2 text-right font-medium">Tours</th>
                <th className="py-1 px-2 text-right font-medium">Temps</th>
                <th className="py-1 pl-2 text-right font-medium">Restantes</th>
              </tr>
            </thead>
            <tbody>
              {record.players.map((player) => (
                <tr key={player.index} className="border-t border-border/60">
                  <td className="py-1.5 pr-3">
                    <span className="inline-flex items-center gap-1.5">
                      {player.isWinner ? <Trophy className="size-3.5 text-primary" aria-label="Vainqueur" /> : null}
                      <span className="font-medium">{player.name}</span>
                    </span>
                  </td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{player.turns}</td>
                  <td className="py-1.5 px-2 text-right tabular-nums">{formatClock(player.playTimeMs)}</td>
                  <td className="py-1.5 pl-2 text-right tabular-nums">{player.leftoverStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
