variable "aws_region" {
  description = "AWS region for the Nala Cloud API"
  type        = string
}

variable "environment" {
  description = "Deployment environment"
  type        = string
}

variable "lambda_function_name" {
  description = "Name of the Nala Cloud API Lambda function"
  type        = string
  default     = "nala-cloud-api"
}
