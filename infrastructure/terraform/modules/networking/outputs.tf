output "vpc_id" {
   description = "ID of the Nala VPC"
   value       = aws_vpc.nala.id
}

output "public_subnet_id" {
   description = "ID of the Public subnet"
   value       = aws_subnet.public.id
}

output "private_subnet_id" {
   description = "ID of the private subnet"
   value = aws_subnet.private.id
}
