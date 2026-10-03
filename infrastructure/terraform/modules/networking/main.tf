resource "aws_vpc" "nala" {
  cidr_block          = var.vpc_cidr
  enable_dns_support  = true
  enable_dns_hostnames= true  

  tags = {
    Name       = "nala-vpc"
    Environment= "dev"
    Project    = "nala"
  }
}

resource "aws_subnet" "public" {
  vpc_id                 = aws_vpc.nala.id
  cidr_block             = var.public_subnet_cidr
  availability_zone      = var.availability_zone
  map_public_ip_on_launch= true

  tags = {
    Name         = "nala-public-subnet"
    Environment  = "dev"
    Project      = "nala"
   }
}

resource "aws_subnet" "private" {
   vpc_id             = aws_vpc.nala.id
   cidr_block         = var.private_subnet_cidr
   availability_zone  = var.availability_zone 

   tags = {
     Name         = "nala-private-subnet"
     Environment  = "dev"
     Project      = "nala"
    }
}
