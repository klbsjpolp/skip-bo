import { type ReactNode } from 'react';

import { ThemeSwitcher } from '@/components/ThemeSwitcher';
import { SoundToggle } from '@/components/SoundToggle';
import { Button } from '@/components/ui/button';
import NewGame from '@/components/NewGame';
import { APP_VERSION } from '@/lib/appVersion';
import { useThemeUsageGameGate } from '@/hooks/useThemeUsageReporter';
import type { UiFixtureName } from '@/testing/uiFixtures';

export interface AppShellProps {
  debugStrip?: ReactNode;
  fixtureName?: UiFixtureName;
  gameBoard: ReactNode;
  isGameOver: boolean;
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void> | void;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
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
  isGameOver,
  isUpdatePending = false,
  onJoinOnlineGame,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  statusStrip,
  updateNotice,
}: AppShellProps) {
  useThemeUsageGameGate(isGameOver);

  return (
    <main
      id="main"
      className="min-h-screen px-4 pb-4 pt-1 lg:px-10 lg:pb-10 lg:pt-2"
      data-testid="app-main"
      data-ui-fixture={fixtureName}
    >
      <div className="mx-auto max-w-7xl">
        <div
          className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"
          data-testid="app-toolbar"
        >
          <div className="flex flex-row gap-2 items-center" data-testid="app-toolbar-left">
            <NewGame
              onJoinOnlineGame={onJoinOnlineGame}
              onStartLocalGame={onStartLocalGame}
              onStartOnlineGame={onStartOnlineGame}
            />
            {statusStrip}
          </div>
          <div className="flex items-center gap-2">
            <SoundToggle />
            <ThemeSwitcher />
          </div>
        </div>
        {updateNotice ? <div className="mb-3">{updateNotice}</div> : null}
        {gameBoard}
        {isGameOver && (
          <div className="mt-5 text-center">
            <Button onClick={() => void onReplay()} size="lg" data-testid="replay-button">
              Rejouer
            </Button>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3 justify-between">
          {debugStrip}
          <div className="grow"></div>
          <p
            className="app-version-badge flex items-center gap-1.5 text-xs text-muted-foreground/80 tabular-nums"
            data-testid="app-version"
          >
            {isUpdatePending ? (
              <span
                aria-label="Mise à jour prête, elle sera appliquée à la prochaine partie"
                className="inline-block size-2 shrink-0 rounded-full bg-primary"
                data-testid="app-version-update-dot"
                title="Mise à jour prête, elle sera appliquée à la prochaine partie"
              />
            ) : null}
            Version {APP_VERSION}
          </p>
        </div>
      </div>
    </main>
  );
}

export interface SessionScreenProps {
  isUpdatePending?: boolean;
  onJoinOnlineGame: (roomCode: string) => Promise<void>;
  onReplay: () => Promise<void>;
  onStartLocalGame: () => void;
  onStartOnlineGame: (stockSize?: number) => Promise<void>;
  updateNotice?: ReactNode;
}
