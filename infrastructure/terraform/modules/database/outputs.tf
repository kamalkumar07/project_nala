output "reports_table_name" {
  description = "Nala reports DynamoDB table name"
  value       = aws_dynamodb_table.reports.name
}

output "reports_table_arn" {
  description = "Nala reports DynamoDB table ARN"
  value       = aws_dynamodb_table.reports.arn
}
