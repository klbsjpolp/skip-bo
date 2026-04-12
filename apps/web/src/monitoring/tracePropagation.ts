const SAME_ORIGIN_TRACE_PROPAGATION_TARGET = /^\//;
const LOCAL_TRACE_PROPAGATION_TARGET = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/.*)?$/i;
const AWS_HTTP_API_TRACE_PROPAGATION_TARGET =
  /^https:\/\/[a-z0-9-]+\.execute-api\.[a-z0-9-]+\.amazonaws\.com(?:\/.*)?$/i;

const DEFAULT_TRACE_PROPAGATION_TARGETS: Array<string | RegExp> = [
  SAME_ORIGIN_TRACE_PROPAGATION_TARGET,
  LOCAL_TRACE_PROPAGATION_TARGET,
  AWS_HTTP_API_TRACE_PROPAGATION_TARGET,
];

const matchesTracePropagationTarget = (
  target: string | RegExp,
  url: string,
): boolean => (typeof target === "string" ? url.includes(target) : target.test(url));

const toTracePropagationOrigin = (apiBaseUrl?: string): string | null => {
  const normalizedValue = apiBaseUrl?.trim();

  if (!normalizedValue) {
    return null;
  }

  try {
    return new URL(normalizedValue).origin;
  } catch {
    return null;
  }
};

export const getSentryTracePropagationTargets = (
  apiBaseUrl?: string,
): Array<string | RegExp> => {
  const tracePropagationOrigin = toTracePropagationOrigin(apiBaseUrl);

  if (
    !tracePropagationOrigin ||
    DEFAULT_TRACE_PROPAGATION_TARGETS.some((target) =>
      matchesTracePropagationTarget(target, tracePropagationOrigin),
    )
  ) {
    return DEFAULT_TRACE_PROPAGATION_TARGETS;
  }

  return [...DEFAULT_TRACE_PROPAGATION_TARGETS, tracePropagationOrigin];
};

export const sentryTracePropagationTargets = getSentryTracePropagationTargets(
  import.meta.env.VITE_SKIPBO_API_URL,
);
