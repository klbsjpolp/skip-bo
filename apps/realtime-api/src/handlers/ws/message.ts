import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';

import { clientMessageSchema } from '@skipbo/realtime-core';

import { isClientError } from '../../errors/clientError.js';
import { captureBackendException, withSentry } from '../../monitoring/sentry.js';
import {
  authenticateConnection,
  handleEndGame,
  handleKickSeat,
  handleLeaveLobby,
  handleRelay,
  handleSetReady,
  handleSetTurn,
  handleSetUnready,
  handleSnapshot,
  rejectAction,
  startGame,
} from '../../services/roomService.js';
import { broadcaster, connectionRepository, roomRepository, websocketUrl } from '../shared.js';

const messageHandler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return { statusCode: 400, body: 'missing connection id' };
  }

  const dependencies = {
    broadcaster,
    connectionRepository,
    roomRepository,
    websocketUrl,
  };

  try {
    const body: unknown = event.body ? JSON.parse(event.body) : {};
    const message = clientMessageSchema.parse(body);

    switch (message.type) {
      case 'auth':
        await authenticateConnection(dependencies, {
          connectionId,
          protocolVersion: message.protocolVersion,
          roomCode: message.roomCode,
          seatIndex: message.seatIndex,
          seatToken: message.seatToken,
        });
        break;
      case 'relay':
        await handleRelay(dependencies, {
          connectionId,
          kind: message.kind,
          payload: message.payload,
          toSeats: message.toSeats,
        });
        break;
      case 'setTurn':
        await handleSetTurn(dependencies, { connectionId, currentSeatIndex: message.currentSeatIndex });
        break;
      case 'snapshot':
        await handleSnapshot(dependencies, { connectionId, payload: message.payload });
        break;
      case 'endGame':
        await handleEndGame(dependencies, { connectionId, winnerSeatIndex: message.winnerSeatIndex });
        break;
      case 'startGame':
        await startGame(dependencies, { connectionId });
        break;
      case 'ping':
        break;
      case 'setReady':
        await handleSetReady(dependencies, { connectionId, playerName: message.playerName });
        break;
      case 'setUnready':
        await handleSetUnready(dependencies, { connectionId });
        break;
      case 'kickSeat':
        await handleKickSeat(dependencies, { connectionId, targetSeatIndex: message.targetSeatIndex });
        break;
      case 'leaveLobby':
        await handleLeaveLobby(dependencies, { connectionId });
        break;
    }

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    if (error instanceof ZodError) {
      await rejectAction(dependencies, connectionId, error.message);
      return { statusCode: 400, body: error.message };
    }

    if (!isClientError(error)) {
      captureBackendException(error, {
        connectionId,
        handler: 'ws-message',
        route: event.requestContext.routeKey,
        transport: 'ws',
      });
    }

    await rejectAction(dependencies, connectionId, error instanceof Error ? error.message : 'Unknown error');

    return { statusCode: 200, body: 'rejected' };
  }
};

export const handler = withSentry(messageHandler);
