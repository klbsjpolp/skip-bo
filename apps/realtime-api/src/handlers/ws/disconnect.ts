import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';

import { withSentry } from '../../monitoring/sentry.js';
import { handleDisconnect } from '../../services/roomService.js';
import { broadcaster, connectionRepository, roomRepository, websocketUrl } from '../shared.js';

const disconnectHandler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  if (connectionId) {
    await handleDisconnect({
      broadcaster,
      connectionRepository,
      roomRepository,
      websocketUrl,
    }, connectionId);
  }

  return {
    statusCode: 200,
    body: 'disconnected',
  };
};

export const handler = withSentry(disconnectHandler);
