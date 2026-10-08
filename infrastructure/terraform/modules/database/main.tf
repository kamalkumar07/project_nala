resource "aws_dynamodb_table" "reports" {
  name         = "nala-reports-${var.environment}"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "reportId"

  attribute {
    name = "reportId"
    type = "S"
  }

  attribute {
    name = "geohash"
    type = "S"
  }

  attribute {
    name = "createdAt"
    type = "S"
  }

attribute {
  name = "geohashPrefix5"
  type = "S"
}

  global_secondary_index {
    name            = "geohash-createdAt-index"
    hash_key        = "geohash"
    range_key       = "createdAt"
    projection_type = "ALL"
  }

global_secondary_index {
  name            = "geohashPrefix5-createdAt-index"
  hash_key        = "geohashPrefix5"
  range_key       = "createdAt"
  projection_type = "ALL"
}

  point_in_time_recovery {
    enabled = true
  }

  server_side_encryption {
    enabled = true
  }

  tags = {
    Name        = "nala-reports-${var.environment}"
    Environment = var.environment
    Project     = "nala"
  }
}
