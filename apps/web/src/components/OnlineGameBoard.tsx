import { CenterArea } from '@/components/CenterArea';
import { GameBoard } from '@/components/GameBoard';
import { DiscardPiles, HandSection, PlayerArea, StockPile } from '@/components/PlayerArea';
import type { GameBoardProps } from '@/components/GameBoard';
import { VictoryEffects } from '@/components/VictoryEffects';
import { cn } from '@/lib/utils';

type OnlineGameBoardProps = GameBoardProps;

interface RemoteSeatProps {
  clearSelection: OnlineGameBoardProps['clearSelection'];
  discardCard: OnlineGameBoardProps['discardCard'];
  gameState: OnlineGameBoardProps['gameState'];
  isCurrentPlayer: boolean;
  isWinner: boolean;
  player: OnlineGameBoardProps['gameState']['players'][number];
  playerIndex: number;
  selectCard: OnlineGameBoardProps['selectCard'];
}

function RemoteSeat({
  clearSelection,
  discardCard,
  gameState,
  isCurrentPlayer,
  isWinner,
  player,
  playerIndex,
  selectCard,
}: RemoteSeatProps) {
  return (
    <section
      className={cn(
        'player-area ring-3',
        isCurrentPlayer && 'active-turn',
        isWinner && 'winner',
      )}
      data-player-index={playerIndex}
      data-player-seat={player.seatIndex}
      data-player-state={isWinner ? 'winner' : isCurrentPlayer ? 'active' : 'idle'}
    >
      <div className="bg-layer" />
      {isWinner && <VictoryEffects />}
      <div
        className={cn(
          'content-layer flex h-full flex-wrap items-center gap-2 lg:gap-4',
          'xl:grid xl:grid-cols-[auto_auto_auto_1fr] xl:items-start xl:gap-x-4 xl:gap-y-3',
        )}
      >
        {player.name ? (
          <div className="vertical-text self-center border-l border-primary xl:row-span-2">
            {player.name}
          </div>
        ) : null}

        <StockPile
          player={player}
          playerIndex={playerIndex}
          isCurrentPlayer={isCurrentPlayer}
          gameState={gameState}
          selectCard={selectCard}
          clearSelection={clearSelection}
        />

        <div className="xl:min-w-0">
          <HandSection
            player={player}
            playerIndex={playerIndex}
            isCurrentPlayer={isCurrentPlayer}
            gameState={gameState}
            selectCard={selectCard}
            clearSelection={clearSelection}
          />
        </div>

        <div className="grow" />

        <div className="xl:col-span-3">
          <DiscardPiles
            player={player}
            playerIndex={playerIndex}
            isCurrentPlayer={isCurrentPlayer}
            gameState={gameState}
            discardCard={discardCard}
            selectCard={selectCard}
            clearSelection={clearSelection}
          />
        </div>
      </div>
    </section>
  );
}

export function OnlineGameBoard({
  canPlayCard,
  clearSelection,
  discardCard,
  gameState,
  playCard,
  selectCard,
}: OnlineGameBoardProps) {
  if (gameState.players.length === 2) {
    return (
      <GameBoard
        gameState={gameState}
        selectCard={selectCard}
        playCard={playCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
        canPlayCard={canPlayCard}
      />
    );
  }

  const localPlayer = gameState.players[0];
  const remotePlayers = gameState.players.slice(1);
  const winner = gameState.winnerIndex !== null ? gameState.players[gameState.winnerIndex] : null;

  return (
    <div
      className={cn('game-board max-w-7xl mx-auto', winner && 'game-board-victory')}
      data-testid="game-board"
    >
      {remotePlayers.length > 0 ? (
        <div
          className={cn(
            'mb-4 grid gap-3',
            remotePlayers.length === 1 ? 'grid-cols-1' : 'grid-cols-1 xl:grid-cols-2',
          )}
        >
          {remotePlayers.map((player, remotePlayerOffset) => {
            const playerIndex = remotePlayerOffset + 1;

            return (
              <RemoteSeat
                key={`remote-seat-${player.seatIndex ?? playerIndex}`}
                clearSelection={clearSelection}
                discardCard={discardCard}
                gameState={gameState}
                isCurrentPlayer={gameState.currentPlayerIndex === playerIndex}
                isWinner={gameState.winnerIndex === playerIndex}
                player={player}
                playerIndex={playerIndex}
                selectCard={selectCard}
              />
            );
          })}
        </div>
      ) : null}

      <CenterArea
        gameState={gameState}
        playCard={playCard}
        canPlayCard={canPlayCard}
      />

      <h1 className="my-4 lg:my-6" data-testid="game-message">
        {gameState.message}
      </h1>

      <PlayerArea
        player={localPlayer}
        playerIndex={0}
        isCurrentPlayer={gameState.currentPlayerIndex === 0}
        isWinner={gameState.winnerIndex === 0}
        gameState={gameState}
        selectCard={selectCard}
        discardCard={discardCard}
        clearSelection={clearSelection}
      />
    </div>
  );
}
