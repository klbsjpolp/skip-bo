import {
  createCoachInsightText,
  createPostGameSummaryInsightText,
  type AdviceRecommendation,
  getBestAdviceRecommendation,
  type InsightActionLogEntry,
  truncateInsightText,
} from '@skipbo/game-core';
import {
  type AiCoachRequest,
  type AiCoachResponse,
  type AiLocalCoachRequest,
  type AiLocalCoachResponse,
  type AiLocalPostGameSummaryRequest,
  type AiLocalPostGameSummaryResponse,
  type AiPostGameSummaryRequest,
  type AiPostGameSummaryResponse,
  type ClientGameView,
  normalizeRoomCode,
  serializeClientGameView,
} from '@skipbo/multiplayer-protocol';

import {ClientError} from '../errors/clientError.js';
import {captureBackendException} from '../monitoring/sentry.js';
import type {RoomActionLogEntry, RoomRecord, RoomRepository} from '../repositories/types.js';
import {hashSeatToken} from './tokens.js';
import {type GenAiProvider, getSharedGenAiProvider} from './genAiProvider.js';

interface AiInsightsDependencies {
  captureException?: typeof captureBackendException;
  genAiProvider?: GenAiProvider | null;
  roomRepository?: RoomRepository;
}

interface AuthenticatedRoomContext {
  room: RoomRecord;
  viewerPlayerIndex: number;
}

interface AiInsightRouteContext {
  handler: string;
  route: string;
}

const getAuthenticatedSeats = (room: RoomRecord): number[] =>
  [...new Set(room.authenticatedSeats ?? [])].sort((left, right) => left - right);

const getActiveSeatIndices = (room: RoomRecord): number[] =>
  room.activeSeatIndices
    ? [...room.activeSeatIndices]
    : room.state.players.map((player, playerIndex) => player.seatIndex ?? playerIndex);

const getViewerPlayerIndex = (room: RoomRecord, seatIndex: number): number =>
  getActiveSeatIndices(room).indexOf(seatIndex);

const getAuthenticatedRoom = async (
  dependencies: AiInsightsDependencies,
  request: AiCoachRequest | AiPostGameSummaryRequest,
): Promise<AuthenticatedRoomContext> => {
  if (!dependencies.roomRepository) {
    throw new Error('Room repository is required for authenticated AI insights');
  }

  const room = await dependencies.roomRepository.get(normalizeRoomCode(request.roomCode));

  if (!room) {
    throw new ClientError('Room not found', 404);
  }

  if (request.seatIndex < 0 || request.seatIndex >= room.seatTokenHashes.length) {
    throw new ClientError('Invalid seat', 403);
  }

  const expectedHash = room.seatTokenHashes[request.seatIndex];

  if (!expectedHash || expectedHash !== hashSeatToken(request.seatToken)) {
    throw new ClientError('Invalid seat token', 403);
  }

  if (room.status !== 'WAITING' && room.activeSeatIndices && !room.activeSeatIndices.includes(request.seatIndex)) {
    throw new ClientError('Seat is not active in this room', 409);
  }

  const viewerPlayerIndex = getViewerPlayerIndex(room, request.seatIndex);

  if (viewerPlayerIndex < 0) {
    throw new ClientError('Seat is not active in this room', 409);
  }

  return {room, viewerPlayerIndex};
};

const getRedactedView = (room: RoomRecord, viewerPlayerIndex: number): ClientGameView =>
  serializeClientGameView({
    connectedSeats: getAuthenticatedSeats(room),
    expiresAt: new Date(room.expiresAt * 1000).toISOString(),
    gameState: room.state,
    hostSeatIndex: room.hostSeatIndex,
    roomCode: room.roomCode,
    seatCapacity: room.seatCapacity,
    status: room.status,
    version: room.version,
    viewerSeatIndex: viewerPlayerIndex,
  });

const createCoachPrompt = (
  redactedView: ClientGameView,
  recommendation: AdviceRecommendation,
): string => JSON.stringify({
  instruction: 'Reformule la recommandation en une seule ligne française de 140 caractères maximum. Ne propose aucune action non listée.',
  additionalInstructions: `
  - Ne nomme pas la valeur 0 des cartes skips-bo.
  - Utilise des ordinaux (premier, deuxième, ...) pour parler des piles de construction et de défausse.`,
  recommendation,
  visibleGameView: redactedView,
});

const createSummaryPrompt = (
  redactedView: ClientGameView,
  actionLog: RoomActionLogEntry[],
  viewerPlayerIndex: number,
): string => JSON.stringify({
  actionLog,
  instruction: 'Résume la partie en une seule ligne française de 140 caractères maximum. Ne révèle aucune carte cachée.',
  viewerPlayerIndex,
  visibleGameView: redactedView,
});

const createLocalCoachPrompt = (
  recommendation: AdviceRecommendation,
): string => JSON.stringify({
  instruction: 'Reformule la recommandation locale en une seule ligne française de 140 caractères maximum. Ne propose aucune action non listée.',
  additionalInstructions: `
  - Ne nomme pas la valeur 0 des cartes skips-bo.
  - Utilise des ordinaux (premier, deuxième, ...) pour parler des piles de construction et de défausse.`,
  recommendation,
});

const createLocalSummaryPrompt = (
  actionLog: InsightActionLogEntry[],
  playerIndex: number,
  winnerIndex: number | null,
): string => JSON.stringify({
  actionLog,
  instruction: 'Résume la partie locale en une seule ligne française de 140 caractères maximum. Ne révèle aucune information absente du journal fourni.',
  playerIndex,
  winnerIndex,
});

const shouldUseProductionFallback = (): boolean => process.env.NODE_ENV === 'production';

const createMissingProviderError = (): Error =>
  new Error('No Gen AI provider is configured');

const captureAiInsightProviderError = (
  dependencies: AiInsightsDependencies,
  task: 'coach' | 'summary',
  error: unknown,
  routeContext?: AiInsightRouteContext,
): void => {
  const captureException = dependencies.captureException ?? captureBackendException;

  captureException(error, {
    handler: routeContext?.handler ?? (task === 'coach' ? 'ai-coach' : 'ai-post-game-summary'),
    route: routeContext?.route ?? (task === 'coach' ? 'POST /ai/coach' : 'POST /ai/post-game-summary'),
    transport: 'http',
  });
};

const getProvider = (dependencies: AiInsightsDependencies): GenAiProvider | null => {
  if ('genAiProvider' in dependencies) {
    return dependencies.genAiProvider ?? null;
  }

  return getSharedGenAiProvider();
};

const generateLineWithFallback = async (
  dependencies: AiInsightsDependencies,
  task: 'coach' | 'summary',
  prompt: string,
  fallbackText: string,
  routeContext?: AiInsightRouteContext,
): Promise<{displayText: string; fallbackUsed: boolean}> => {
  const useProductionFallback = shouldUseProductionFallback();
  const provider = getProvider(dependencies);

  if (!provider) {
    const error = createMissingProviderError();

    if (!useProductionFallback) {
      throw error;
    }

    captureAiInsightProviderError(dependencies, task, error, routeContext);

    return {
      displayText: fallbackText,
      fallbackUsed: true,
    };
  }

  try {
    const generatedText = await provider.generateLine({
      prompt,
      system: 'Tu es un assistant Skip-Bo. Réponds avec une seule ligne courte, sans Markdown, en français.',
      task,
    });
    const displayText = truncateInsightText(generatedText);

    return {
      displayText: displayText || fallbackText,
      fallbackUsed: !displayText,
    };
  } catch (error) {
    if (!useProductionFallback) {
      throw error;
    }

    captureAiInsightProviderError(dependencies, task, error, routeContext);

    return {
      displayText: fallbackText,
      fallbackUsed: true,
    };
  }
};

export const requestAiCoach = async (
  dependencies: AiInsightsDependencies,
  request: AiCoachRequest,
): Promise<AiCoachResponse> => {
  const {room, viewerPlayerIndex} = await getAuthenticatedRoom(dependencies, request);

  if (room.status !== 'ACTIVE') {
    throw new ClientError('Room is not active', 409);
  }

  if (room.state.currentPlayerIndex !== viewerPlayerIndex) {
    throw new ClientError('It is not your turn', 409);
  }

  const recommendation = getBestAdviceRecommendation(room.state, viewerPlayerIndex);
  const fallbackText = createCoachInsightText(recommendation);
  const redactedView = getRedactedView(room, viewerPlayerIndex);
  const {displayText, fallbackUsed} = await generateLineWithFallback(
    dependencies,
    'coach',
    createCoachPrompt(redactedView, recommendation),
    fallbackText,
  );

  return {
    displayText,
    fallbackUsed,
    recommendation,
    roomVersion: room.version,
  };
};

export const requestAiPostGameSummary = async (
  dependencies: AiInsightsDependencies,
  request: AiPostGameSummaryRequest,
): Promise<AiPostGameSummaryResponse> => {
  const {room, viewerPlayerIndex} = await getAuthenticatedRoom(dependencies, request);

  if (room.status !== 'FINISHED' && !room.state.gameIsOver) {
    throw new ClientError('Room is not finished', 409);
  }

  const redactedView = getRedactedView(room, viewerPlayerIndex);
  const player = room.state.players[viewerPlayerIndex];
  const seatIndex = player?.seatIndex ?? viewerPlayerIndex;
  const visibleActionLog = (room.actionLog ?? []).filter((entry) => entry.seatIndex === seatIndex);
  const fallbackText = createPostGameSummaryInsightText({
    actionLog: visibleActionLog,
    playerIndex: viewerPlayerIndex,
    winnerIndex: room.state.winnerIndex,
  });
  const {displayText, fallbackUsed} = await generateLineWithFallback(
    dependencies,
    'summary',
    createSummaryPrompt(redactedView, visibleActionLog, viewerPlayerIndex),
    fallbackText,
  );

  return {
    displayText,
    fallbackUsed,
    roomVersion: room.version,
  };
};

export const requestLocalAiCoach = async (
  dependencies: AiInsightsDependencies,
  request: AiLocalCoachRequest,
): Promise<AiLocalCoachResponse> => {
  const fallbackText = createCoachInsightText(request.recommendation);
  const {displayText, fallbackUsed} = await generateLineWithFallback(
    dependencies,
    'coach',
    createLocalCoachPrompt(request.recommendation),
    fallbackText,
    {
      handler: 'ai-local-coach',
      route: 'POST /ai/local/coach',
    },
  );

  return {
    displayText,
    fallbackUsed,
    localVersion: request.localVersion,
  };
};

export const requestLocalAiPostGameSummary = async (
  dependencies: AiInsightsDependencies,
  request: AiLocalPostGameSummaryRequest,
): Promise<AiLocalPostGameSummaryResponse> => {
  const fallbackText = createPostGameSummaryInsightText({
    actionLog: request.actionLog,
    playerIndex: request.playerIndex,
    winnerIndex: request.winnerIndex,
  });
  const {displayText, fallbackUsed} = await generateLineWithFallback(
    dependencies,
    'summary',
    createLocalSummaryPrompt(request.actionLog, request.playerIndex, request.winnerIndex),
    fallbackText,
    {
      handler: 'ai-local-post-game-summary',
      route: 'POST /ai/local/post-game-summary',
    },
  );

  return {
    displayText,
    fallbackUsed,
    localVersion: request.localVersion,
  };
};
