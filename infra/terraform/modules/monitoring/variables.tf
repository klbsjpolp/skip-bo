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

variable "tags" {
  description = "Tags applied to all alarms in this module."
  type        = map(string)
  default     = {}
}
