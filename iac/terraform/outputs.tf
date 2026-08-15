output "group_arns" {
  description = "ARNs of all five IAM groups, for verification after apply"
  value = {
    developers     = aws_iam_group.developers.arn
    operations     = aws_iam_group.operations.arn
    finance        = aws_iam_group.finance.arn
    analysts       = aws_iam_group.analysts.arn
    administrators = aws_iam_group.administrators.arn
  }
}

output "require_mfa_policy_arn" {
  description = "ARN of the Require-MFA customer-managed policy"
  value       = aws_iam_policy.require_mfa.arn
}

output "created_usernames" {
  description = "All IAM usernames created, grouped by role"
  value = {
    developers     = [for u in aws_iam_user.developers : u.name]
    operations     = [for u in aws_iam_user.operations : u.name]
    finance        = [for u in aws_iam_user.finance : u.name]
    analysts       = [for u in aws_iam_user.analysts : u.name]
    administrators = [for u in aws_iam_user.administrators : u.name]
  }
}
