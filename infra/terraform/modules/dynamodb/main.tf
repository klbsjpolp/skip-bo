resource "aws_dynamodb_table" "rooms" {
  name         = "${var.app_name}-rooms"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "roomCode"

  attribute {
    name = "roomCode"
    type = "S"
  }

  ttl {
    attribute_name = "expiresAt"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-rooms"
  })
}

resource "aws_dynamodb_table" "connections" {
  name         = "${var.app_name}-connections"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "connectionId"

  attribute {
    name = "connectionId"
    type = "S"
  }

  attribute {
    name = "roomCode"
    type = "S"
  }

  global_secondary_index {
    name            = "roomCode-index"
    hash_key        = "roomCode"
    projection_type = "ALL"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-connections"
  })
}
