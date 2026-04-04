output "connections_table_name" {
  description = "DynamoDB table name storing live WebSocket connections."
  value       = module.dynamodb.connections_table_name
}

output "http_api_url" {
  description = "Base URL for the multiplayer HTTP API."
  value       = module.realtime_api.http_api_url
}

output "rooms_table_name" {
  description = "DynamoDB table name storing authoritative room state."
  value       = module.dynamodb.rooms_table_name
}

output "websocket_management_endpoint" {
  description = "Management endpoint used by Lambda for push updates."
  value       = module.realtime_api.websocket_management_endpoint
}

output "websocket_url" {
  description = "Client-facing WebSocket endpoint for online matches."
  value       = module.realtime_api.websocket_url
}
