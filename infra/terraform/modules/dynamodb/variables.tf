variable "app_name" {
  description = "Prefix used for the DynamoDB table names."
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
