output "lambda_role_arn" {
  description = "Execution role ARN for the realtime Lambda functions."
  value       = aws_iam_role.lambda.arn
}

output "lambda_role_name" {
  description = "Execution role name for the realtime Lambda functions."
  value       = aws_iam_role.lambda.name
}
