variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "ca-central-1"
}

variable "app_bucket_name" {
  description = "S3 bucket name for application files (Developers group scope)"
  type        = string
  # No default on purpose — must be supplied via terraform.tfvars or -var
}

variable "developer_usernames" {
  description = "IAM usernames for the Developers group"
  type        = list(string)
  default     = ["tf-dev1", "tf-dev2", "tf-dev3", "tf-dev4"]
}

variable "operations_usernames" {
  description = "IAM usernames for the Operations group"
  type        = list(string)
  default     = ["tf-ops1", "tf-ops2"]
}

variable "finance_usernames" {
  description = "IAM usernames for the Finance group"
  type        = list(string)
  default     = ["tf-finance-manager"]
}

variable "analyst_usernames" {
  description = "IAM usernames for the Analysts group"
  type        = list(string)
  default     = ["tf-analyst1", "tf-analyst2", "tf-analyst3"]
}

variable "admin_usernames" {
  description = "IAM usernames for the Administrators group"
  type        = list(string)
  default     = ["tf-admin"]
}
