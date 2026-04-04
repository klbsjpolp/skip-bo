variable "app_name" {
  description = "Prefix used for IAM resource names."
  type        = string
}

variable "aws_region" {
  description = "AWS region where the API runs."
  type        = string
}

variable "rooms_table_arn" {
  description = "ARN of the rooms DynamoDB table."
  type        = string
}

variable "connections_table_arn" {
  description = "ARN of the connections DynamoDB table."
  type        = string
}

variable "connections_room_code_index_arn" {
  description = "ARN of the roomCode secondary index on the connections table."
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources in this module."
  type        = map(string)
  default     = {}
}
