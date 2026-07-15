import { type ReactNode } from 'react';

import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { Button } from '@/components/ui/button';
import { GameStatsDialog } from '@/components/GameStatsDialog';
import NewGame from '@/components/NewGame';
import { APP_VERSION } from '@/lib/appVersion';
import { useThemeUsageGameGate } from '@/hooks/useThemeUsageReporter';
import type { GameStatsRecord } from '@/monitoring/gameStats';
import type { UiFixtureName } from '@/testing/uiFixtures';

export interface AppShellProps {
  debugStrip?: ReactNode;
  fixtureName?: UiFixtureName;
  gameBoard: ReactNode;
  isApplyingUpdate?: boolean;
  isGameOver: boolean;
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void> | void;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  onUpdateNow?: () => void;
  /** Stats for the just-finished game; surfaces a button on the victory screen. */
  statsRecord?: GameStatsRecord | null;
  statusStrip?: ReactNode;
  updateNotice?: ReactNode;
}

/**
 * Shared chrome for every game screen (local, online, fixture): the toolbar with
 * New Game + theme switcher, the game board slot, the replay button, and the
 * version badge. Screen-specific wiring lives in the callers.
 */
export function AppShell({
  debugStrip,
  fixtureName,
  gameBoard,
  isApplyingUpdate = false,
  isGameOver,
  isUpdatePending = false,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  onUpdateNow,
  statsRecord,
  statusStrip,
  updateNotice,
}: AppShellProps) {
  useThemeUsageGameGate(isGameOver);

  return (
    <main
      id="main"
      className="min-h-svh px-4 pb-4 pt-1 lg:px-10 lg:pb-10 lg:pt-2"
      data-testid="app-main"
      data-ui-fixture={fixtureName}
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 flex gap-2 flex-row items-start justify-between" data-testid="app-toolbar">
          <div className="flex flex-row gap-2 items-center" data-testid="app-toolbar-left">
            <NewGame
              onJoinOnlineGame={onJoinOnlineGame}
              onStartLocalGame={onStartLocalGame}
              onStartOnlineGame={onStartOnlineGame}
            />
            {statusStrip}
          </div>
          <ThemeSwitcher />
        </div>
        {updateNotice ? <div className="mb-3">{updateNotice}</div> : null}
        {gameBoard}
        {isGameOver && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => void onReplay()} size="lg" data-testid="replay-button">
              Rejouer
            </Button>
            {statsRecord ? <GameStatsDialog record={statsRecord} /> : null}
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 justify-between">
          {debugStrip}
          <div className="grow"></div>
          {isUpdatePending && onUpdateNow ? (
            <Button size="xs" onClick={onUpdateNow} disabled={isApplyingUpdate} data-testid="app-version-update-button">
              {isApplyingUpdate ? 'Mise à jour…' : 'Mettre à jour'}
            </Button>
          ) : null}
          <p
            className="app-version-badge flex items-center gap-1.5 text-xs text-muted-foreground/80 tabular-nums"
            data-testid="app-version"
          >
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </main>
  );
}

export interface SessionScreenProps {
  isApplyingUpdate?: boolean;
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void>;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  onUpdateNow?: () => void;
  updateNotice?: ReactNode;
}
