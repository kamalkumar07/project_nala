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

resource "aws_internet_gateway" "nala" {
  vpc_id = aws_vpc.nala.id

  tags = {
    Name        = "nala-internet-gateway"
    Environment = "dev"
    Project     = "nala"
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.nala.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.nala.id
  }

  tags = {
    Name        = "nala-public-route-table"
    Environment = "dev"
    Project     = "nala"
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
