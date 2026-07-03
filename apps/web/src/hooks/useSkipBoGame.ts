import React, { useCallback, useRef } from 'react';
import { useMachine } from '@xstate/react';
import { canPlayCard, type Card, type GameState, type MoveResult } from '@skipbo/game-core';
import { gameMachine } from '@/state/gameMachine';
import { useDebugActions } from '@/game/debugActions';
import { preparePlayCardIntent, prepareDiscardCardIntent } from '@/game/moveIntents';
import { startDiscardCardAnimation, startPlayCardAnimation } from '@/game/moveAnimations';
import { getAiHandOverride } from '@/lib/debugOverrides';
import { useCardAnimation } from '@/contexts/useCardAnimation.ts';

export function useSkipBoGame() {
  const { driver } = useCardAnimation();
  // Machine input is read once at actor creation; the driver from context is
  // stable for the provider's lifetime, and the aiHand debug override is
  // parsed here (lib/debugOverrides.ts) so the machine never touches the URL.
  const [snapshot, dispatch, actorRef] = useMachine(gameMachine, {
    input: { driver, debugAiHand: getAiHandOverride() },
  });
  const state = snapshot.context.G;
  const stateRef = useRef<GameState>(state);
  const interactionLockRef = useRef(false);

  React.useLayoutEffect(() => {
    stateRef.current = state;
  }, [state]);

  /* wrappers compatibles avec l'UI existante */
  const initializeGame = useCallback(() => {
    dispatch({ type: 'INIT' });
  }, [dispatch]);

  const { debugFillBuildPile, debugFillHandSkipBo, debugClearStockPile, debugClearAiStockPile, debugWin } =
    useDebugActions(dispatch);

  // Animations are decoupled from the interaction lock: the user can keep
  // selecting and playing cards while previous animations are still in flight.
  // The lock is held only for the synchronous body of playCard/discardCard so
  // two concurrent dispatches can't race on the same selectedCard.
  const isInteractionBlocked = useCallback(() => interactionLockRef.current, []);

  const selectCard = useCallback(
    (source: 'hand' | 'stock' | 'discard', index: number, discardPileIndex?: number) => {
      if (isInteractionBlocked()) {
        return;
      }

      dispatch({ type: 'SELECT_CARD', source, index, discardPileIndex });
      // XState processes events synchronously, so the actor already has the new
      // state. Eagerly sync stateRef so that playCard/discardCard called in the
      // same synchronous turn (e.g. drag-drop: selectCard then immediately
      // playCard from pointerup) read the updated selectedCard instead of the
      // stale snapshot that React hasn't committed yet.
      stateRef.current = actorRef.getSnapshot().context.G;
    },
    [dispatch, isInteractionBlocked, actorRef],
  );

  const playCard = useCallback(
    async (buildPile: number): Promise<MoveResult> => {
      const currentState = stateRef.current;

      if (isInteractionBlocked()) {
        return { success: false, message: 'Action en cours' };
      }

      // Validate and plan the move (refill + pile completion) before dispatching
      const intent = preparePlayCardIntent(currentState, buildPile);
      if (!intent.valid) {
        return { success: false, message: intent.error };
      }

      const { completedBuildPileCards } = intent;
      const refillCards: Card[] = intent.refillPlan.cards;
      const refillHandIndices: number[] = intent.refillPlan.handIndices;

      interactionLockRef.current = true;

      // Fire the play animation (and pile-completion retreat) immediately; the
      // dispatch happens right after, so further user actions (select / play /
      // discard) aren't blocked by the visual animation. Cards in flight are
      // masked at source/target via `isCardBeingAnimated` in PlayerArea/CenterArea.
      const { playAnimationDuration, completionAnimationDuration } = startPlayCardAnimation(
        currentState,
        buildPile,
        completedBuildPileCards,
        driver,
      );

      // completionAnimationDuration already includes playAnimationDuration as its baseDelay,
      // so when there is a completion the refill must wait until all retreat cards have landed.
      // Without a completion, the refill just waits for the play animation itself.
      const refillBaseDelay = completedBuildPileCards ? completionAnimationDuration : playAnimationDuration;
      const drawAnimationDuration =
        refillHandIndices.length > 0
          ? driver.calculateDrawsDuration(currentState.currentPlayerIndex, refillHandIndices, 500, refillBaseDelay)
          : 0;

      // Dispatch immediately. The xstate machine transitions to
      // humanActionAnimating, but it now permits further human actions while the
      // animationGate waits on `waitForAnimations()` for every queued animation.
      dispatch({
        type: 'PLAY_CARD',
        buildPile,
        animationDuration: Math.max(completionAnimationDuration, drawAnimationDuration),
      });

      if (refillCards.length > 0) {
        void driver
          .animateDraws(currentState.currentPlayerIndex, refillCards, refillHandIndices, 500, refillBaseDelay)
          .catch((error) => {
            console.warn('Draw animation failed, continuing with game logic:', error);
          });
      }
      interactionLockRef.current = false;
      return { success: true, message: 'Carte jouée' };
    },
    [dispatch, isInteractionBlocked, driver],
  );

  const discardCard = useCallback(
    async (discardPile: number): Promise<MoveResult> => {
      const currentState = stateRef.current;

      if (isInteractionBlocked()) {
        return { success: false, message: 'Action en cours' };
      }

      const intent = prepareDiscardCardIntent(currentState);
      if (!intent.valid) {
        return { success: false, message: intent.error };
      }

      interactionLockRef.current = true;

      // Trigger discard animation, then dispatch immediately. The animation runs
      // in parallel; the discard ends the human turn (currentPlayerIndex flips),
      // so the xstate guard `isHumanAction` will reject any stray action — but
      // selections / plays issued *before* the discard ran can still complete
      // their visual animations because the animationGate keeps waiting on
      // `waitForAnimations()` until the queue is empty.
      const discardAnimationDuration = startDiscardCardAnimation(currentState, discardPile, driver);

      dispatch({ type: 'DISCARD_CARD', discardPile, animationDuration: discardAnimationDuration });
      interactionLockRef.current = false;
      return { success: true, message: 'Carte défaussée' };
    },
    [dispatch, isInteractionBlocked, driver],
  );

  const clearSelection = useCallback(() => {
    if (isInteractionBlocked()) {
      return;
    }

    dispatch({ type: 'CLEAR_SELECTION' });
  }, [dispatch, isInteractionBlocked]);

  const canPlayCardWrapper = useCallback((card: Card, buildPileIndex: number, gameState: GameState) => {
    return canPlayCard(card, buildPileIndex, gameState);
  }, []);

  const getLatestGameState = useCallback(() => stateRef.current, []);

  return {
    gameState: state,
    initializeGame,
    debugFillBuildPile,
    debugFillHandSkipBo,
    debugClearStockPile,
    debugClearAiStockPile,
    debugWin,
    selectCard,
    playCard,
    discardCard,
    clearSelection,
    canPlayCard: canPlayCardWrapper,
    getLatestGameState,
  };
}
