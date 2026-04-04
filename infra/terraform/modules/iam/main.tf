data "aws_iam_policy_document" "lambda_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      identifiers = ["lambda.amazonaws.com"]
      type        = "Service"
    }
  }
}

resource "aws_iam_role" "lambda" {
  name               = "${var.app_name}-lambda-role"
  assume_role_policy = data.aws_iam_policy_document.lambda_assume_role.json

  tags = merge(var.tags, {
    Name = "${var.app_name}-lambda-role"
  })
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role       = aws_iam_role.lambda.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

data "aws_iam_policy_document" "runtime_access" {
  statement {
    actions = [
      "dynamodb:DeleteItem",
      "dynamodb:GetItem",
      "dynamodb:PutItem",
      "dynamodb:Query",
      "dynamodb:UpdateItem",
    ]
    resources = [
      var.rooms_table_arn,
      var.connections_table_arn,
      var.connections_room_code_index_arn,
    ]
  }

  statement {
    actions = ["execute-api:ManageConnections"]
    resources = [
      "arn:aws:execute-api:${var.aws_region}:*:*/*/@connections/*",
    ]
  }
}

resource "aws_iam_role_policy" "runtime_access" {
  name   = "${var.app_name}-runtime-access"
  role   = aws_iam_role.lambda.id
  policy = data.aws_iam_policy_document.runtime_access.json
}
