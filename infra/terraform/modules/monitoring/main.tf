resource "aws_cloudwatch_metric_alarm" "lambda_errors" {
  for_each = toset(var.lambda_function_names)

  alarm_name          = "${var.app_name}-lambda-${replace(each.value, "/", "-")}-errors"
  alarm_description   = "Errors detected in lambda ${each.value}"
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
    Name = "${var.app_name}-lambda-${replace(each.value, "/", "-")}-errors"
  })
}

# NOTE: Lambda throttle and DynamoDB read/write throttle alarms were intentionally
# removed to stay within CloudWatch's 10 always-free alarm metrics. The Lambda
# functions run at low volume and the DynamoDB tables are PAY_PER_REQUEST
# (on-demand), so capacity throttling effectively cannot occur. Errors and system
# errors are still alarmed below.

resource "aws_cloudwatch_metric_alarm" "dynamodb_system_errors" {
  for_each = toset(var.dynamodb_table_names)

  alarm_name          = "${var.app_name}-dynamodb-${each.value}-system-errors"
  alarm_description   = "System errors detected in dynamodb table ${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "SystemErrors"
  namespace           = "AWS/DynamoDB"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    TableName = each.value
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = merge(var.tags, {
    Name = "${var.app_name}-dynamodb-${each.value}-system-errors"
  })
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_http_5xx" {
  for_each = toset(var.api_gateway_http_ids)

  alarm_name          = "${var.app_name}-api-http-${each.value}-5xx"
  alarm_description   = "5xx errors detected in HTTP API Gateway ${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = each.value
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = merge(var.tags, {
    Name = "${var.app_name}-api-http-${each.value}-5xx"
  })
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_http_latency" {
  for_each = toset(var.api_gateway_http_ids)

  alarm_name          = "${var.app_name}-api-http-${each.value}-latency"
  alarm_description   = "High latency detected in HTTP API Gateway ${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "Latency"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Average"
  threshold           = 1000 # 1 second
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = each.value
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = merge(var.tags, {
    Name = "${var.app_name}-api-http-${each.value}-latency"
  })
}

resource "aws_cloudwatch_metric_alarm" "api_gateway_ws_5xx" {
  for_each = toset(var.api_gateway_websocket_ids)

  alarm_name          = "${var.app_name}-api-ws-${each.value}-5xx"
  alarm_description   = "5xx errors detected in WebSocket API Gateway ${each.value}"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "5XXError"
  namespace           = "AWS/ApiGateway"
  period              = 300
  statistic           = "Sum"
  threshold           = 1
  treat_missing_data  = "notBreaching"

  dimensions = {
    ApiId = each.value
  }

  alarm_actions = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
  ok_actions    = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  tags = merge(var.tags, {
    Name = "${var.app_name}-api-ws-${each.value}-5xx"
  })
}
