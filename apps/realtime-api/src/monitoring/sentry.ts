import type { Handler } from 'aws-lambda';
import * as Sentry from '@sentry/aws-serverless';

interface BackendExceptionContext {
  connectionId?: string;
  handler: string;
  route?: string;
  transport: 'http' | 'ws';
}

const sentryDsn = process.env.SENTRY_DSN;
const sentryEnabled = Boolean(sentryDsn);
const tracesSampleRate = process.env.SENTRY_TRACES_SAMPLE_RATE
  ? Number.parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE)
  : undefined;

if (sentryEnabled) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'development',
    ...(process.env.SENTRY_RELEASE ? { release: process.env.SENTRY_RELEASE } : {}),
    ...(Number.isFinite(tracesSampleRate) ? { tracesSampleRate } : {}),
  });
} else if (process.env.NODE_ENV !== 'production' && process.env.VITEST !== 'true') {
  console.info('[sentry] disabled: SENTRY_DSN is not set');
}

const toError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (typeof error === 'string' && error.length > 0) {
    return new Error(error);
  }

  return new Error('Unknown error');
};

export const captureBackendException = (
  error: unknown,
  context: BackendExceptionContext,
): void => {
  if (!sentryEnabled) {
    return;
  }

  const exception = toError(error);

  Sentry.withScope((scope) => {
    scope.setTag('skipbo.handler', context.handler);
    scope.setTag('skipbo.transport', context.transport);

    const backendContext: Record<string, string> = {};

    if (context.connectionId) {
      backendContext.connectionId = context.connectionId;
    }

    if (context.route) {
      backendContext.route = context.route;
      scope.setTag('skipbo.route', context.route);
    }

    if (Object.keys(backendContext).length > 0) {
      scope.setContext('skipbo_backend', backendContext);
    }

    Sentry.captureException(exception);
  });
};

export const withSentry = <TEvent, TResult>(
  handler: Handler<TEvent, TResult>,
): Handler<TEvent, TResult> =>
  sentryEnabled ? Sentry.wrapHandler(handler) : handler;
