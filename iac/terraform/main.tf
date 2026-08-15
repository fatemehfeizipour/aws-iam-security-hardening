terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Local state for this portfolio project. In production, use a remote
  # backend (S3 + DynamoDB lock table) instead of local state.
  # backend "s3" {
  #   bucket         = "your-terraform-state-bucket"
  #   key            = "iam-security-project/terraform.tfstate"
  #   region         = "ca-central-1"
  #   dynamodb_table = "terraform-state-lock"
  #   encrypt        = true
  # }
}

provider "aws" {
  region = var.aws_region
}
