import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';

import { joinRoomRequestSchema } from '@skipbo/multiplayer-protocol';

import { isClientError } from '../../errors/clientError.js';
import { captureBackendException, withSentry } from '../../monitoring/sentry.js';
import { joinRoom } from '../../services/roomService.js';
import { jsonResponse } from '../../utils/http.js';
import { broadcaster, connectionRepository, roomRepository, websocketUrl } from '../shared.js';

const joinRoomHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body: unknown = event.body ? JSON.parse(event.body) : {};
    const request = joinRoomRequestSchema.parse(body);
    const response = await joinRoom({
      broadcaster,
      connectionRepository,
      roomRepository,
      websocketUrl,
    }, request);

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(400, { message: error.message });
    }

    if (isClientError(error)) {
      return jsonResponse(error.statusCode, { message: error.message });
    }

    captureBackendException(error, {
      handler: 'join-room',
      route: 'POST /rooms/join',
      transport: 'http',
    });

    return jsonResponse(500, { message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const handler = withSentry(joinRoomHandler);
