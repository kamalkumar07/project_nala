data "aws_caller_identity" "current" {}

resource "aws_s3_bucket" "uploads" {
  bucket = "nala-upload-${var.environment}-${data.aws_caller_identity.current.account_id}"

  tags = {
    Name        = "nala-uploads-${var.environment}"
    Environment = var.environment
    Project     = "nala"
   }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  block_public_acls      = true
  block_public_policy    = true
  ignore_public_acls     = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    object_ownership = "BucketOwnerEnforced" 
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_methods = ["PUT"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

resource "aws_s3_object" "delhi_wards" {
  bucket = aws_s3_bucket.uploads.id
  key    = "reference-data/delhi-mcd-2022.geojson"

  source = "${path.module}/../../../data/wards/delhi-wards-2022.geojson"
  etag   = filemd5("${path.module}/../../../data/wards/delhi-wards-2022.geojson")

  content_type = "application/geo+json"
}
