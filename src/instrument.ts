import * as Sentry from "@sentry/react";

Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN, // Adjust per build tool (see table below)
    environment: import.meta.env.MODE,
    release: import.meta.env.VITE_APP_VERSION, // inject at build time

    sendDefaultPii: true,

    integrations: [
        Sentry.browserTracingIntegration(),
        Sentry.replayIntegration({
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],

    // Tracing
    tracesSampleRate: 1.0, // lower to 0.1–0.2 in production
    tracePropagationTargets: ["localhost", /^https:\/\/yourapi\.io/],

    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    enableLogs: true,
});
