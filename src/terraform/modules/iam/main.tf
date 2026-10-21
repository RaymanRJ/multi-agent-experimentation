variable "name" {
  type = string
}

variable "oidc_subject_prefix" {
  description = "Start of the OIDC \"sub\" claim that identifies the repository allowed to deploy."
  type        = string
}

variable "github_deploy_branch" {
  type = string
}

variable "create_oidc_provider" {
  type = bool
}

variable "bucket_arn" {
  type = string
}

variable "distribution_arn" {
  type = string
}

locals {
  oidc_url = "https://token.actions.githubusercontent.com"
}

# GitHub's OIDC provider is one per AWS account, so it's usually created once and looked up after that.
resource "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 1 : 0

  url            = local.oidc_url
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = var.create_oidc_provider ? 0 : 1

  url = local.oidc_url
}

locals {
  oidc_provider_arn = var.create_oidc_provider ? aws_iam_openid_connect_provider.github[0].arn : data.aws_iam_openid_connect_provider.github[0].arn
}

# Only workflows on the deploy branch of this one repository can assume the role.
resource "aws_iam_role" "deploy" {
  name        = "GitHubActionsDeploy-${var.name}"
  description = "Deploys the ${var.name} site from GitHub Actions"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.oidc_provider_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:sub" = "${var.oidc_subject_prefix}:ref:refs/heads/${var.github_deploy_branch}"
        }
      }
    }]
  })
}

# Just enough to sync the build into the bucket and invalidate the cache.
resource "aws_iam_role_policy" "deploy" {
  name = "deploy-site"
  role = aws_iam_role.deploy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = "s3:ListBucket"
        Resource = var.bucket_arn
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:DeleteObject"]
        Resource = "${var.bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = "cloudfront:CreateInvalidation"
        Resource = var.distribution_arn
      },
    ]
  })
}

output "role_arn" {
  value = aws_iam_role.deploy.arn
}
