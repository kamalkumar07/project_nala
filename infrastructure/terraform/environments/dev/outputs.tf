output "vpc_id" {
  description = "Nala development VPC ID"
  value       = module.networking.vpc_id
}

output "public_subnet_id" {
  description = "Nala development public subnet ID"
  value       = module.networking.public_subnet_id
}

output "private_subnet_id" {
  description = "Nala development private subnet ID"
  value       = module.networking.private_subnet_id
}
output "cloud_api_base_url" {
  description = "Base URL for the Nala Cloud API"
  value       = module.cloud_api.cloud_api_base_url
}
output "uploads_bucket_name" {
  description = "Nala uploads S3 bucket"
  value       = module.storage.uploads_bucket_name
}

output "uploads_bucket_arn" {
  description = "Nala uploads S3 bucket ARN"
  value       = module.storage.uploads_bucket_arn
}
output "reports_table_name" {
  description = "Nala reports DynamoDB table"
  value       = module.database.reports_table_name
}

output "reports_table_arn" {
  description = "Nala reports DynamoDB table ARN"
  value       = module.database.reports_table_arn
}
