locals {
  websocket_management_endpoint = "https://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.aws_region}.amazonaws.com/${var.stage_name}"
  websocket_url                 = "wss://${aws_apigatewayv2_api.websocket.id}.execute-api.${var.aws_region}.amazonaws.com/${var.stage_name}"

  common_environment = merge(var.environment_variables, {
    CONNECTIONS_TABLE_NAME        = var.connections_table_name
    ROOMS_TABLE_NAME              = var.rooms_table_name
    WEBSOCKET_MANAGEMENT_ENDPOINT = local.websocket_management_endpoint
    WEBSOCKET_URL                 = local.websocket_url
  })

  lambda_definitions = {
    create-room = {
      handler = "http/createRoom.handler"
      memory  = 256
      timeout = 10
    }
    join-room = {
      handler = "http/joinRoom.handler"
      memory  = 256
      timeout = 10
    }
    ws-connect = {
      handler = "ws/connect.handler"
      memory  = 256
      timeout = 10
    }
    ws-disconnect = {
      handler = "ws/disconnect.handler"
      memory  = 256
      timeout = 10
    }
    ws-message = {
      handler = "ws/message.handler"
      memory  = 512
      timeout = 15
    }
  }
}

resource "aws_apigatewayv2_api" "http" {
  name          = "${var.app_name}-http"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers  = ["content-type"]
    allow_methods  = ["OPTIONS", "POST"]
    allow_origins  = var.http_allowed_origins
    expose_headers = ["content-type"]
    max_age        = 3600
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-http"
  })
}

resource "aws_apigatewayv2_api" "websocket" {
  name                       = "${var.app_name}-ws"
  protocol_type              = "WEBSOCKET"
  route_selection_expression = "$request.body.type"

  tags = merge(var.tags, {
    Name = "${var.app_name}-ws"
  })
}

resource "aws_lambda_function" "this" {
  for_each = local.lambda_definitions

  architectures    = ["arm64"]
  filename         = var.lambda_zip_path
  function_name    = "${var.app_name}-${each.key}"
  handler          = each.value.handler
  memory_size      = each.value.memory
  role             = var.lambda_role_arn
  runtime          = "nodejs20.x"
  source_code_hash = var.lambda_source_code_hash
  timeout          = each.value.timeout

  environment {
    variables = local.common_environment
  }

  tags = merge(var.tags, {
    Name = "${var.app_name}-${each.key}"
  })
}

resource "aws_cloudwatch_log_group" "lambda" {
  for_each = aws_lambda_function.this

  name              = "/aws/lambda/${each.value.function_name}"
  retention_in_days = var.log_retention_days

  tags = merge(var.tags, {
    Name = "/aws/lambda/${each.value.function_name}"
  })
}

resource "aws_apigatewayv2_integration" "http" {
  for_each = {
    create-room = aws_lambda_function.this["create-room"].invoke_arn
    join-room   = aws_lambda_function.this["join-room"].invoke_arn
  }

  api_id                 = aws_apigatewayv2_api.http.id
  integration_method     = "POST"
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "http" {
  for_each = {
    "POST /rooms"      = aws_apigatewayv2_integration.http["create-room"].id
    "POST /rooms/join" = aws_apigatewayv2_integration.http["join-room"].id
  }

  api_id    = aws_apigatewayv2_api.http.id
  route_key = each.key
  target    = "integrations/${each.value}"
}

resource "aws_apigatewayv2_stage" "http" {
  api_id      = aws_apigatewayv2_api.http.id
  auto_deploy = true
  name        = "$default"

  tags = merge(var.tags, {
    Name = "${var.app_name}-http-default"
  })
}

resource "aws_apigatewayv2_integration" "websocket" {
  for_each = {
    "$connect"    = aws_lambda_function.this["ws-connect"].invoke_arn
    "$disconnect" = aws_lambda_function.this["ws-disconnect"].invoke_arn
    "$default"    = aws_lambda_function.this["ws-message"].invoke_arn
    "auth"        = aws_lambda_function.this["ws-message"].invoke_arn
    "action"      = aws_lambda_function.this["ws-message"].invoke_arn
    "ping"        = aws_lambda_function.this["ws-message"].invoke_arn
  }

  api_id             = aws_apigatewayv2_api.websocket.id
  integration_method = "POST"
  integration_type   = "AWS_PROXY"
  integration_uri    = each.value
}

resource "aws_apigatewayv2_route" "websocket" {
  for_each = aws_apigatewayv2_integration.websocket

  api_id    = aws_apigatewayv2_api.websocket.id
  route_key = each.key
  target    = "integrations/${each.value.id}"
}

resource "aws_apigatewayv2_stage" "websocket" {
  api_id      = aws_apigatewayv2_api.websocket.id
  auto_deploy = true
  name        = var.stage_name

  tags = merge(var.tags, {
    Name = "${var.app_name}-${var.stage_name}"
  })
}

resource "aws_lambda_permission" "http" {
  for_each = {
    create-room = aws_lambda_function.this["create-room"].function_name
    join-room   = aws_lambda_function.this["join-room"].function_name
  }

  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.http.execution_arn}/*/*"
  statement_id  = "AllowHttpApiInvoke${replace(title(each.key), "-", "")}"
}

resource "aws_lambda_permission" "websocket" {
  for_each = {
    ws-connect    = aws_lambda_function.this["ws-connect"].function_name
    ws-disconnect = aws_lambda_function.this["ws-disconnect"].function_name
    ws-message    = aws_lambda_function.this["ws-message"].function_name
  }

  action        = "lambda:InvokeFunction"
  function_name = each.value
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.websocket.execution_arn}/*/*"
  statement_id  = "AllowWebsocketInvoke${replace(title(each.key), "-", "")}"
}
