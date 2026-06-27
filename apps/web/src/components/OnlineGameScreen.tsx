import { useEffect } from 'react';

import type { CreateRoomResponse } from '@klbsjpolp/realtime-core';

import { AppShell, type SessionScreenProps } from '@/components/AppShell';
import { DebugStrip } from '@/components/DebugStrip';
import { LobbyDialog, LobbyRemovedDialog } from '@/components/LobbyDialog';
import { LocalGameBoard } from '@/components/LocalGameBoard';
import { OnlineGameBoard } from '@/components/OnlineGameBoard';
import { OnlineStatusStrip } from '@/components/OnlineStatusStrip';
import { useLocalSkipBoGame } from '@/hooks/useLocalSkipBoGame';
import { useOnlineSkipBoGame } from '@/hooks/useOnlineSkipBoGame';
import { canPlayCard } from '@/lib/validators';

export interface OnlineGameScreenProps extends SessionScreenProps {
  applyUpdateWhenSafe: () => void;
  onLeaveSession: () => void;
  session: CreateRoomResponse;
}

/**
 * Online (host-authoritative) game screen. This module — together with the
 * online hook, online board, lobby dialogs, and the host runtime it pulls in —
 * is code-split out of the initial bundle and loaded only when a player starts
 * or joins an online game (see the `lazy()` import in App.tsx).
 */
function OnlineGameScreen({
  applyUpdateWhenSafe,
  isApplyingUpdate,
  isUpdatePending,
  onJoinOnlineGame,
  onLeaveSession,
  onReplay,
  onStartLocalGame,
  onStartOnlineGame,
  onUpdateNow,
  session,
  updateNotice,
}: OnlineGameScreenProps) {
  const {
    canStartGame,
    clearSelection,
    connectedSeats,
    connectionStatus,
    debugFillBuildPile,
    debugFillHandSkipBo,
    debugClearStockPile,
    debugClearAiStockPile,
    debugWin,
    discardCard,
    disconnectedSeats,
    gameState,
    isLocalHost,
    kickSeat,
    leaveLobby,
    lobbySeats,
    myReadyState,
    playCard,
    playersBySeatIndex,
    roomCode,
    roomStatus,
    seatCapacity,
    selectCard,
    sendSetReady,
    sendSetUnready,
    startGame,
    lobbyRemovalReason,
  } = useOnlineSkipBoGame(session);
  const { gameState: localGameState } = useLocalSkipBoGame();

  // Online state is rebuilt from the server snapshot after a reload, so applying
  // a pending update is lossless. Only do it at a "safe" moment — never while it
  // is the local player's active turn (index 0 in the recentred view), to avoid
  // cutting off an in-progress action, and never on a finished game so the
  // victory/defeat screen is preserved. The update then lands during an
  // opponent's turn, in the next lobby, or on the user's next deliberate action.
  const isSafeToApplyUpdate = !gameState.gameIsOver && (roomStatus === 'WAITING' || gameState.currentPlayerIndex !== 0);

  useEffect(() => {
    if (isUpdatePending && isSafeToApplyUpdate) {
      applyUpdateWhenSafe();
    }
  }, [isUpdatePending, isSafeToApplyUpdate, applyUpdateWhenSafe]);

  const handleLeave = () => {
    leaveLobby();
    onLeaveSession();
  };

  const gameBoard =
    roomStatus === 'WAITING' ? (
      <LocalGameBoard
        gameState={localGameState}
        selectCard={() => undefined}
        playCard={() => Promise.resolve({ success: true, message: '' })}
        discardCard={() => Promise.resolve({ success: true, message: '' })}
        clearSelection={() => undefined}
        canPlayCard={canPlayCard}
      />
    ) : (
      <OnlineGameBoard
        gameState={gameState}
        selectCard={selectCard}
        playCard={playCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
        canPlayCard={canPlayCard}
      />
    );

  return (
    <>
      <LobbyRemovedDialog reason={lobbyRemovalReason} onDismiss={onLeaveSession} />
      <LobbyDialog
        canStartGame={canStartGame}
        connectedSeats={connectedSeats}
        isHost={isLocalHost}
        kickSeat={kickSeat}
        lobbySeats={lobbySeats}
        mySeatIndex={session.seatIndex}
        myReadyState={myReadyState}
        onLeave={handleLeave}
        onReady={sendSetReady}
        onStartGame={startGame}
        onUnready={sendSetUnready}
        open={roomStatus === 'WAITING' && lobbyRemovalReason === null}
        roomCode={roomCode}
        seatCapacity={seatCapacity}
      />
      <AppShell
        debugStrip={
          <DebugStrip
            debugFillBuildPile={() => debugFillBuildPile(0)}
            debugFillHandSkipBo={debugFillHandSkipBo}
            debugClearStockPile={debugClearStockPile}
            debugClearAiStockPile={debugClearAiStockPile}
            debugWin={debugWin}
          />
        }
        gameBoard={gameBoard}
        isApplyingUpdate={isApplyingUpdate}
        isGameOver={gameState.gameIsOver}
        isUpdatePending={isUpdatePending}
        onJoinOnlineGame={onJoinOnlineGame}
        onReplay={onReplay}
        onStartLocalGame={onStartLocalGame}
        onStartOnlineGame={onStartOnlineGame}
        onUpdateNow={onUpdateNow}
        statusStrip={
          <OnlineStatusStrip
            canStartGame={canStartGame}
            connectedSeats={connectedSeats}
            connectionStatus={connectionStatus}
            disconnectedSeats={disconnectedSeats}
            isHost={isLocalHost}
            onStartGame={startGame}
            playersBySeatIndex={playersBySeatIndex}
            roomCode={roomCode}
            roomStatus={roomStatus}
            seatCapacity={seatCapacity}
          />
        }
        updateNotice={updateNotice}
      />
    </>
  );
}

export default OnlineGameScreen;
