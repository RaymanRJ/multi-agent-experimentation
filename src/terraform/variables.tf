variable "project_name" {
  description = "Short name used to name and tag resources, e.g. \"multi-agent-experiment\"."
  type        = string
}

variable "domain_name" {
  description = "Domain the site is served from, e.g. \"multi-agent-experiment.example.com\"."
  type        = string
}

variable "hosted_zone_name" {
  description = "Existing public Route 53 hosted zone that contains domain_name, e.g. \"example.com\"."
  type        = string
}

variable "include_www" {
  description = "Also serve the site from www.<domain_name>."
  type        = bool
  default     = false
}

variable "aws_region" {
  description = "Region for the S3 bucket and IAM resources. The certificate always goes in us-east-1."
  type        = string
}

variable "github_repository" {
  description = "GitHub repository allowed to deploy, as \"owner/name\"."
  type        = string
}

variable "github_oidc_subject_prefix" {
  description = <<-EOT
    Start of the "sub" claim in GitHub's OIDC tokens for the repository. Leave null for the classic
    "repo:owner/name" form. Repositories using GitHub's immutable subject format include IDs
    ("repo:owner@123/name@456"); get the exact value with
    gh api repos/OWNER/NAME/actions/oidc/customization/sub --jq .sub_claim_prefix
  EOT
  type        = string
  default     = null
}

variable "github_deploy_branch" {
  description = "Only workflows running on this branch may assume the deploy role."
  type        = string
  default     = "main"
}

variable "create_github_oidc_provider" {
  description = "Create the account-wide GitHub Actions OIDC provider. Leave false if the account already has one."
  type        = bool
  default     = false
}

variable "price_class" {
  description = "CloudFront price class (which edge locations serve the site)."
  type        = string
  default     = "PriceClass_100"
}

variable "tags" {
  description = "Extra tags for every resource."
  type        = map(string)
  default     = {}
}
