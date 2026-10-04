data "aws_caller_identity" "current" {}
resource "aws_iam_role" "lambda" {
  name = "${var.lambda_function_name}-${var.environment}-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Principal = {
          Service = "lambda.amazonaws.com"
        }

        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = {
    Name        = "${var.lambda_function_name}-${var.environment}-role"
    Environment = var.environment
    Project     = "nala"
  }
}

resource "aws_iam_role_policy_attachment" "lambda_logs" {

  role = aws_iam_role.lambda.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

}

resource "aws_iam_role_policy" "lambda_s3_uploads" {
  name = "${var.lambda_function_name}-${var.environment}-s3-uploads"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "s3:PutObject"
        ]

        Resource = "arn:aws:s3:::nala-upload-${var.environment}-${data.aws_caller_identity.current.account_id}/*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "lambda_dynamodb_reports" {
  name = "${var.lambda_function_name}-${var.environment}-dynamodb-reports"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"

        Action = [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ]

        Resource = [
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/nala-reports-${var.environment}",
          "arn:aws:dynamodb:${var.aws_region}:${data.aws_caller_identity.current.account_id}:table/nala-reports-${var.environment}/index/*"
        ]
      }
    ]
  })
}

data "archive_file" "lambda_zip" {
  type = "zip"

  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/lambda/function.zip"

  excludes = [
    "function.zip"
  ]
}

resource "aws_lambda_function" "cloud_api" {
  function_name = var.lambda_function_name
  role          = aws_iam_role.lambda.arn

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  handler = "index.handler"
  runtime = "nodejs20.x"

  timeout     = 10
  memory_size = 256

  environment {
    variables = {
      ENVIRONMENT         = var.environment
      UPLOADS_BUCKET_NAME = "nala-upload-${var.environment}-${data.aws_caller_identity.current.account_id}"
      REPORTS_TABLE_NAME  = "nala-reports-${var.environment}"
    }
  }

  tags = {
    Name        = var.lambda_function_name
    Environment = var.environment
    Project     = "nala"
  }
}

resource "aws_apigatewayv2_api" "cloud_api" {
  name          = "nala-cloud-api-${var.environment}"
  protocol_type = "HTTP"

  tags = {
    Name        = "nala-cloud-api-${var.environment}"
    Environment = var.environment
    Project     = "nala"
  }
}

resource "aws_apigatewayv2_integration" "lambda" {
  api_id                 = aws_apigatewayv2_api.cloud_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.cloud_api.invoke_arn
  integration_method     = "POST"
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "GET /cloud/health"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_route" "presign" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "POST /cloud/uploads/presign"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_route" "create_report" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "POST /cloud/reports"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_route" "get_report" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "GET /cloud/reports/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_route" "list_reports" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "GET /cloud/reports"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_route" "update_report" {
  api_id    = aws_apigatewayv2_api.cloud_api.id
  route_key = "PATCH /cloud/reports/{id}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda.id}"

  depends_on = [
    aws_apigatewayv2_integration.lambda
  ]
}

resource "aws_apigatewayv2_stage" "dev" {
  api_id      = aws_apigatewayv2_api.cloud_api.id
  name        = var.environment
  auto_deploy = true

  tags = {
    Environment = var.environment
    Project     = "nala"
  }
}

resource "aws_lambda_permission" "api_gateway" {
  statement_id  = "AllowApiGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.cloud_api.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.cloud_api.execution_arn}/*/*"
}
