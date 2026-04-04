resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = toset(var.lambda_function_names)

  alarm_name          = "${var.app_name}-${replace(each.value, "/", "-")}-errors"
  alarm_description   = "Errors detected in ${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Errors"
  namespace           = "AWS/Lambda"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    FunctionName = each.value
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = merge(var.tags, {
    Name = "${var.app_name}-${replace(each.value, "/", "-")}-errors"
  })
}
