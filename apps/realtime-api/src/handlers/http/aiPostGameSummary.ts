import type { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { ZodError } from 'zod';

import { aiPostGameSummaryRequestSchema } from '@skipbo/multiplayer-protocol';
import { isClientError } from '../../errors/clientError.js';
import { captureBackendException, withSentry } from '../../monitoring/sentry.js';
import { requestAiPostGameSummary } from '../../services/aiInsightsService.js';
import { jsonResponse } from '../../utils/http.js';
import { roomRepository } from '../shared.js';

const aiPostGameSummaryHandler: APIGatewayProxyHandlerV2 = async (event) => {
  try {
    const body: unknown = event.body ? JSON.parse(event.body) : {};
    const request = aiPostGameSummaryRequestSchema.parse(body);
    const response = await requestAiPostGameSummary({ roomRepository }, request);

    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonResponse(400, { message: error.message });
    }

    if (isClientError(error)) {
      return jsonResponse(error.statusCode, { message: error.message });
    }

    captureBackendException(error, {
      handler: 'ai-post-game-summary',
      route: 'POST /ai/post-game-summary',
      transport: 'http',
    });

    return jsonResponse(500, { message: error instanceof Error ? error.message : 'Unknown error' });
  }
};

export const handler = withSentry(aiPostGameSummaryHandler);
