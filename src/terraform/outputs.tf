# These four feed the deploy workflow (.github/workflows/site.yaml) as GitHub repository secrets
# (see README.md in this folder).

output "aws_region" {
  description = "Region of the bucket and deploy role (repo secret AWS_REGION)."
  value       = var.aws_region
}

output "bucket_name" {
  description = "Bucket holding the built site (repo secret SITE_BUCKET)."
  value       = module.s3.bucket_name
}

output "distribution_id" {
  description = "CloudFront distribution to invalidate after a deploy (repo secret CLOUDFRONT_DISTRIBUTION_ID)."
  value       = module.cloudfront.distribution_id
}

output "deploy_role_arn" {
  description = "Role GitHub Actions assumes to deploy (repo secret AWS_DEPLOY_ROLE_ARN)."
  value       = module.iam.role_arn
}

output "site_urls" {
  description = "Where the site is served."
  value       = [for alias in local.aliases : "https://${alias}"]
}
