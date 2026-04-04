import type { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { withSentry } from '../../monitoring/sentry.js';

const connectHandler: APIGatewayProxyWebsocketHandlerV2 = async () => ({
  statusCode: 200,
  body: 'connected',
});

export const handler = withSentry(connectHandler);
