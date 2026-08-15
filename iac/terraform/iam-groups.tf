resource "aws_iam_group" "developers" {
  name = "tf-Developers"
}

resource "aws_iam_group" "operations" {
  name = "tf-Operations"
}

resource "aws_iam_group" "finance" {
  name = "tf-Finance"
}

resource "aws_iam_group" "analysts" {
  name = "tf-Analysts"
}

resource "aws_iam_group" "administrators" {
  name = "tf-Administrators"
}
