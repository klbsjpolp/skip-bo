variable "app_name" {
  description = "Prefix used for API Gateway, Lambda, and log resource names."
  type        = string
}

variable "aws_region" {
  description = "AWS region where the realtime API is deployed."
  type        = string
}

variable "connections_table_name" {
  description = "Name of the DynamoDB connections table."
  type        = string
}

variable "environment_variables" {
  description = "Additional Lambda environment variables."
  type        = map(string)
  default     = {}
}

variable "http_allowed_origins" {
  description = "Origins allowed to call the HTTP API."
  type        = list(string)
}

variable "lambda_role_arn" {
  description = "Execution role ARN for the Lambda functions."
  type        = string
}

variable "lambda_source_code_hash" {
  description = "Base64 encoded hash of the shared Lambda zip artifact."
  type        = string
}

variable "lambda_zip_path" {
  description = "Path to the shared Lambda zip artifact."
  type        = string
}

variable "log_retention_days" {
  description = "Retention window for CloudWatch log groups."
  type        = number
  default     = 30
}

variable "rooms_table_name" {
  description = "Name of the DynamoDB rooms table."
  type        = string
}

variable "stage_name" {
  description = "Named WebSocket stage exposed to clients."
  type        = string
  default     = "prod"
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
