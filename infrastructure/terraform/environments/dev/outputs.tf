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
