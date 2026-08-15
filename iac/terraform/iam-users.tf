### Users are created without console passwords or access keys by default.
### Generate credentials separately (aws_iam_user_login_profile / aws_iam_access_key)
### only for users who actually need them, and never commit the output.

resource "aws_iam_user" "developers" {
  for_each = toset(var.developer_usernames)
  name     = each.value
}

resource "aws_iam_user_group_membership" "developers" {
  for_each = aws_iam_user.developers
  user     = each.value.name
  groups   = [aws_iam_group.developers.name]
}

resource "aws_iam_user" "operations" {
  for_each = toset(var.operations_usernames)
  name     = each.value
}

resource "aws_iam_user_group_membership" "operations" {
  for_each = aws_iam_user.operations
  user     = each.value.name
  groups   = [aws_iam_group.operations.name]
}

resource "aws_iam_user" "finance" {
  for_each = toset(var.finance_usernames)
  name     = each.value
}

resource "aws_iam_user_group_membership" "finance" {
  for_each = aws_iam_user.finance
  user     = each.value.name
  groups   = [aws_iam_group.finance.name]
}

resource "aws_iam_user" "analysts" {
  for_each = toset(var.analyst_usernames)
  name     = each.value
}

resource "aws_iam_user_group_membership" "analysts" {
  for_each = aws_iam_user.analysts
  user     = each.value.name
  groups   = [aws_iam_group.analysts.name]
}

resource "aws_iam_user" "administrators" {
  for_each = toset(var.admin_usernames)
  name     = each.value
}

resource "aws_iam_user_group_membership" "administrators" {
  for_each = aws_iam_user.administrators
  user     = each.value.name
  groups   = [aws_iam_group.administrators.name]
}
