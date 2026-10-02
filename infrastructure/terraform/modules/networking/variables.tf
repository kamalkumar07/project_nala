variable "vpc_cidr" {
  description = "CIDR block for the Nala vpc"
  type        = string
}

variable "public_subnet_cidr" {
  description = "CIDR block for the public subnet"
  type        = string
}

variable "private_subnet_cidr" {
  description = "CIDR block for the private subnet"
  type        = string
}

variable "availability_zone" {
  description = "Availability Zone for Nala infrastructure"
  type        = string
}
