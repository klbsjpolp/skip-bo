variable "alarm_topic_arn" {
  description = "Optional SNS topic ARN for CloudWatch alarm notifications."
  type        = string
  default     = null
  nullable    = true
}

variable "allowed_origins" {
  description = "Origins allowed to call the HTTP multiplayer API."
  type        = list(string)
  default = [
    "*",
  ]
}

variable "app_name" {
  description = "Base application name used for AWS resource prefixes."
  type        = string
  default     = "skipbo"
}

variable "aws_region" {
  description = "AWS region for the production multiplayer stack."
  type        = string
  default     = "ca-central-1"
}

variable "environment" {
  description = "Short environment suffix appended to resource names."
  type        = string
  default     = "prod"
}

variable "extra_tags" {
  description = "Additional tags applied to all production resources."
  type        = map(string)
  default     = {}
}

variable "lambda_source_dir" {
  description = "Path to the built realtime Lambda bundle directory."
  type        = string
  default     = "../../../../apps/realtime-api/dist"
}

variable "log_retention_days" {
  description = "CloudWatch log retention window for Lambda log groups."
  type        = number
  default     = 30
}

variable "offline_validation" {
  description = "Enables credential-free provider behavior for CI-side offline validation."
  type        = bool
  default     = false
}

variable "sentry_dsn" {
  description = "Optional Sentry DSN used to enable backend monitoring in the realtime Lambda functions."
  type        = string
  default     = null
  nullable    = true
}

variable "sentry_release" {
  description = "Optional release identifier attached to backend Sentry events."
  type        = string
  default     = null
  nullable    = true
}

variable "sentry_traces_sample_rate" {
  description = "Optional override for backend Sentry traces sample rate. Defaults to 1.0 when backend Sentry is enabled."
  type        = number
  default     = null
  nullable    = true
}

variable "stage_name" {
  description = "WebSocket stage name exposed to clients."
  type        = string
  default     = "prod"
}
