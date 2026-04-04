import * as Sentry from "@sentry/react";

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

if (sentryDsn) {
    Sentry.init({
        dsn: sentryDsn,
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
} else if (import.meta.env.DEV) {
    console.info("[sentry] disabled: VITE_SENTRY_DSN is not set");
}
