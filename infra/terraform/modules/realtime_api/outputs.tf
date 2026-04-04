output "http_api_url" {
  description = "Public URL for the HTTP API."
  value       = aws_apigatewayv2_stage.http.invoke_url
}

output "lambda_function_names" {
  description = "Lambda function names keyed by logical handler id."
  value       = { for key, function in aws_lambda_function.this : key => function.function_name }
}

output "websocket_management_endpoint" {
  description = "Management endpoint used by Lambda to push room updates."
  value       = local.websocket_management_endpoint
}

output "websocket_url" {
  description = "Public WebSocket URL for clients."
  value       = local.websocket_url
}
