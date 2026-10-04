resource "aws_dynamodb_table" "subscriptions" {
  name         = "nala-subscriptions-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"

  hash_key = "subscriptionId"

  attribute {
    name = "subscriptionId"
    type = "S"
  }

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "nala-subscriptions-${var.environment}"
    Environment = var.environment
    Project     = "nala"
  }
}
