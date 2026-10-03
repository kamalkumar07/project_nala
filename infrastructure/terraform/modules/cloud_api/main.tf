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

  role       = aws_iam_role.lambda.name

  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"

}

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/index.mjs"
  output_path = "${path.module}/lambda/function.zip"
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
      ENVIRONMENT = var.environment
    }
  }

  tags = {
    Name        = var.lambda_function_name
    Environment = var.environment
    Project     = "nala"
  }
}

resource "aws_apigatewayv2_api" "cloud_api" {
  name            = "nala-cloud-api-${var.environment}"
  protocol_type   = "HTTP"

  tags = {
    Name          = "nala-cloud-api-${var.environment}"
    Environment   = var.environment
    Project       = "nala"
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

resource "aws_apigatewayv2_stage" "dev" {
  api_id        = aws_apigatewayv2_api.cloud_api.id
  name          = var.environment
  auto_deploy   = true 

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
