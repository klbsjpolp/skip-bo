import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';

import { clientMessageSchema } from '@skipbo/multiplayer-protocol';

import { isClientError } from '../../errors/clientError.js';
import { captureBackendException, withSentry } from '../../monitoring/sentry.js';
import { authenticateConnection, handleAction, rejectAction, startGame } from '../../services/roomService.js';
import { broadcaster, connectionRepository, roomRepository, websocketUrl } from '../shared.js';

const messageHandler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  if (!connectionId) {
    return { statusCode: 400, body: 'missing connection id' };
  }

  try {
    const body: unknown = event.body ? JSON.parse(event.body) : {};
    const message = clientMessageSchema.parse(body);
    const dependencies = {
      broadcaster,
      connectionRepository,
      roomRepository,
      websocketUrl,
    };

    switch (message.type) {
      case 'auth':
        await authenticateConnection(dependencies, {
          connectionId,
          roomCode: message.roomCode,
          seatIndex: message.seatIndex,
          seatToken: message.seatToken,
        });
        break;
      case 'action':
        await handleAction(dependencies, {
          action: message.action,
          connectionId,
        });
        break;
      case 'startGame':
        await startGame(dependencies, {
          connectionId,
        });
        break;
      case 'ping':
        break;
    }

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    if (error instanceof ZodError) {
      await rejectAction({
        broadcaster,
        connectionRepository,
        roomRepository,
        websocketUrl,
      }, connectionId, error.message);
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

    await rejectAction({
      broadcaster,
      connectionRepository,
      roomRepository,
      websocketUrl,
    }, connectionId, error instanceof Error ? error.message : 'Unknown error');

    return { statusCode: 200, body: 'rejected' };
  }
};

export const handler = withSentry(messageHandler);
