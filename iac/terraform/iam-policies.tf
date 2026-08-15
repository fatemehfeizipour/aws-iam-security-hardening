### ---------------------------------------------------------------------
### Developers: EC2 full access (managed) + scoped S3 (custom) + CloudWatch Logs read-only (custom)
### ---------------------------------------------------------------------

resource "aws_iam_group_policy_attachment" "developers_ec2" {
  group      = aws_iam_group.developers.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

resource "aws_iam_policy" "s3_app_files_access" {
  name        = "tf-S3AppFilesAccess"
  description = "Read-write access to the application-files S3 bucket only, not account-wide S3."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TfS3AppFilesAccess"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${var.app_bucket_name}",
          "arn:aws:s3:::${var.app_bucket_name}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "developers_s3" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.s3_app_files_access.arn
}

resource "aws_iam_policy" "cloudwatch_logs_read_only" {
  name        = "tf-CloudWatchLogsReadOnly"
  description = "Read-only CloudWatch Logs access — viewing only, no write/delete."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TfCloudWatchLogsReadOnly"
        Effect = "Allow"
        Action = [
          "logs:GetLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:FilterLogEvents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "developers_logs" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.cloudwatch_logs_read_only.arn
}

### ---------------------------------------------------------------------
### Operations: full EC2, RDS, SSM, CloudWatch — all AWS managed policies
### ---------------------------------------------------------------------

resource "aws_iam_group_policy_attachment" "operations_ec2" {
  group      = aws_iam_group.operations.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2FullAccess"
}

resource "aws_iam_group_policy_attachment" "operations_rds" {
  group      = aws_iam_group.operations.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSFullAccess"
}

resource "aws_iam_group_policy_attachment" "operations_ssm" {
  group      = aws_iam_group.operations.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMFullAccess"
}

resource "aws_iam_group_policy_attachment" "operations_cloudwatch" {
  group      = aws_iam_group.operations.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchFullAccess"
}

### ---------------------------------------------------------------------
### Finance: Billing, Budgets, ViewOnly (managed) + Cost Explorer (custom)
### ---------------------------------------------------------------------

resource "aws_iam_group_policy_attachment" "finance_billing_job_function" {
  group      = aws_iam_group.finance.name
  policy_arn = "arn:aws:iam::aws:policy/job-function/Billing"
}

resource "aws_iam_group_policy_attachment" "finance_billing_read_only" {
  group      = aws_iam_group.finance.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBillingReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "finance_budgets" {
  group      = aws_iam_group.finance.name
  policy_arn = "arn:aws:iam::aws:policy/AWSBudgetsReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "finance_view_only" {
  group      = aws_iam_group.finance.name
  policy_arn = "arn:aws:iam::aws:policy/job-function/ViewOnlyAccess"
}

resource "aws_iam_policy" "cost_explorer_access" {
  name        = "tf-CostExplorerAccess"
  description = "Cost Explorer read access — separate permission surface from Billing/Budgets."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TfCostExplorerAccess"
        Effect = "Allow"
        Action = [
          "ce:GetCostAndUsage",
          "ce:GetCostForecast",
          "ce:GetDimensionValues",
          "ce:GetTags"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "finance_cost_explorer" {
  group      = aws_iam_group.finance.name
  policy_arn = aws_iam_policy.cost_explorer_access.arn
}

### ---------------------------------------------------------------------
### Analysts: read-only RDS + read-only S3, both AWS managed
### ---------------------------------------------------------------------

resource "aws_iam_group_policy_attachment" "analysts_rds" {
  group      = aws_iam_group.analysts.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonRDSReadOnlyAccess"
}

resource "aws_iam_group_policy_attachment" "analysts_s3" {
  group      = aws_iam_group.analysts.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
}

### ---------------------------------------------------------------------
### Administrators: AWS-managed AdministratorAccess
### ---------------------------------------------------------------------

resource "aws_iam_group_policy_attachment" "administrators_full" {
  group      = aws_iam_group.administrators.name
  policy_arn = "arn:aws:iam::aws:policy/AdministratorAccess"
}

### ---------------------------------------------------------------------
### Require-MFA: attached to all five groups
### ---------------------------------------------------------------------

resource "aws_iam_policy" "require_mfa" {
  name        = "tf-Require-MFA"
  description = "Denies nearly all actions unless the user has authenticated with MFA."

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "AllowViewAccountInfo"
        Effect = "Allow"
        Action = [
          "iam:GetAccountPasswordPolicy",
          "iam:ListVirtualMFADevices"
        ]
        Resource = "*"
      },
      {
        Sid    = "AllowManageOwnMFA"
        Effect = "Allow"
        Action = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:ResyncMFADevice",
          "iam:DeactivateMFADevice",
          "iam:DeleteVirtualMFADevice"
        ]
        Resource = "arn:aws:iam::*:mfa/$${aws:username}"
      },
      {
        Sid       = "DenyAllExceptMFAWhenUnauthenticated"
        Effect    = "Deny"
        NotAction = [
          "iam:CreateVirtualMFADevice",
          "iam:EnableMFADevice",
          "iam:GetUser",
          "iam:ListMFADevices",
          "iam:ListVirtualMFADevices",
          "iam:ResyncMFADevice",
          "sts:GetSessionToken"
        ]
        Resource = "*"
        Condition = {
          BoolIfExists = {
            "aws:MultiFactorAuthPresent" = "false"
          }
        }
      }
    ]
  })
}

resource "aws_iam_group_policy_attachment" "developers_mfa" {
  group      = aws_iam_group.developers.name
  policy_arn = aws_iam_policy.require_mfa.arn
}

resource "aws_iam_group_policy_attachment" "operations_mfa" {
  group      = aws_iam_group.operations.name
  policy_arn = aws_iam_policy.require_mfa.arn
}

resource "aws_iam_group_policy_attachment" "finance_mfa" {
  group      = aws_iam_group.finance.name
  policy_arn = aws_iam_policy.require_mfa.arn
}

resource "aws_iam_group_policy_attachment" "analysts_mfa" {
  group      = aws_iam_group.analysts.name
  policy_arn = aws_iam_policy.require_mfa.arn
}

resource "aws_iam_group_policy_attachment" "administrators_mfa" {
  group      = aws_iam_group.administrators.name
  policy_arn = aws_iam_policy.require_mfa.arn
}
