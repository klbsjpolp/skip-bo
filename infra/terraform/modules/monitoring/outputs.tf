output "lambda_error_alarm_names" {
  description = "Names of the Lambda error alarms."
  value       = [for alarm in aws_cloudwatch_metric_alarm.lambda_errors : alarm.alarm_name]
}
