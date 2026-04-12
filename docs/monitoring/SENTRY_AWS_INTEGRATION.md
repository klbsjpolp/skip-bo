# Sentry AWS Integration

## Document Contract

- Purpose: explain how Sentry connects to the Skip-Bo AWS resources and application runtimes.
- Audience: contributors and agents changing monitoring or validating Sentry setup.
- Source of truth: OpenTofu monitoring modules, realtime API Sentry bootstrap, and the web app Sentry integration.
- When to update: when alarm routing, AWS integration steps, or Sentry SDK wiring changes.

## Related Docs

- [../runbooks/opentofu-aws-realtime.md](../runbooks/opentofu-aws-realtime.md)
- [../architecture/source-of-truth.md](../architecture/source-of-truth.md)
- [../../infra/terraform/README.md](../../infra/terraform/README.md)

## Infrastructure Setup

The OpenTofu configuration includes CloudWatch alarms for:

- Lambda errors and throttles
- DynamoDB throttles and system errors
- API Gateway 5XX errors and latency

These alarms publish to an SNS topic when `var.alarm_topic_arn` is provided.

## Sentry-Side Configuration

### Enable AWS Integration In Sentry

- Open `Settings > Integrations > AWS` in Sentry.
- Follow the Sentry instructions to create the required IAM role in AWS.
- Provide the resulting role ARN to Sentry.

### Configure SNS Forwarding

- If you want Sentry to receive CloudWatch alarms directly, subscribe the Sentry-provided SNS endpoint URL to the alarm topic.
- Set `alarm_topic_arn` in OpenTofu to that SNS topic ARN.

### Metric Forwarding

- Optional deeper AWS metrics can be forwarded with Sentry's metric forwarder tooling if you need it.

## Lambda Monitoring

- The realtime Lambda functions use `@sentry/aws-serverless`.
- Set `SENTRY_DSN` through OpenTofu when backend monitoring is enabled.
- `infra/terraform/envs/prod/main.tf` defaults `SENTRY_TRACES_SAMPLE_RATE` to `1.0` whenever backend Sentry is enabled, unless `sentry_traces_sample_rate` overrides it.
- The `withSentry` wrapper in `apps/realtime-api/src/monitoring/sentry.ts` captures handler errors and traces.
- The HTTP API CORS allowlist must include `sentry-trace` and `baggage` so browser requests can propagate traces to Lambda.

## Web App Monitoring

- The React web app uses `@sentry/react`.
- Set `VITE_SENTRY_DSN` during the frontend build when browser monitoring is enabled.
- `apps/web/src/monitoring/tracePropagation.ts` matches local dev URLs, API Gateway URLs, and any explicit build-time API origin so browser requests carry `sentry-trace` and `baggage` to the backend.
- Performance monitoring and session replay remain controlled by the web app integration code.
