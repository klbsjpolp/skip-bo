variable "alarm_topic_arn" {
  description = "Optional SNS topic ARN for alarm notifications."
  type        = string
  default     = null
  nullable    = true
}

variable "app_name" {
  description = "Prefix used for alarm names."
  type        = string
}

variable "lambda_function_names" {
  description = "Lambda function names to monitor."
  type        = list(string)
}

variable "dynamodb_table_names" {
  description = "DynamoDB table names to monitor."
  type        = list(string)
  default     = []
}

variable "api_gateway_http_ids" {
  description = "HTTP API Gateway IDs to monitor."
  type        = list(string)
  default     = []
}

variable "api_gateway_websocket_ids" {
  description = "WebSocket API Gateway IDs to monitor."
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags applied to all alarms in this module."
  type        = map(string)
  default     = {}
}
