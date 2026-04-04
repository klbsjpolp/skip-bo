output "rooms_table_name" {
  description = "Name of the room state table."
  value       = aws_dynamodb_table.rooms.name
}

output "rooms_table_arn" {
  description = "ARN of the room state table."
  value       = aws_dynamodb_table.rooms.arn
}

output "connections_table_name" {
  description = "Name of the WebSocket connection table."
  value       = aws_dynamodb_table.connections.name
}

output "connections_table_arn" {
  description = "ARN of the WebSocket connection table."
  value       = aws_dynamodb_table.connections.arn
}

output "connections_room_code_index_arn" {
  description = "ARN of the roomCode GSI on the connections table."
  value       = "${aws_dynamodb_table.connections.arn}/index/roomCode-index"
}
