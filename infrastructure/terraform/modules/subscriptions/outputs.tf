output "subscriptions_table_name" {
  value = aws_dynamodb_table.subscriptions.name
}

output "subscriptions_table_arn" {
  value = aws_dynamodb_table.subscriptions.arn
}
