output "cloud_api_base_url" {
  description = "Base URL for the Nala Cloud API"
  value       = aws_apigatewayv2_stage.dev.invoke_url
}
