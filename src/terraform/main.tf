locals {
  aliases = concat([var.domain_name], var.include_www ? ["www.${var.domain_name}"] : [])

  tags = merge(var.tags, {
    Project   = var.project_name
    ManagedBy = "Terraform"
  })
}

data "aws_route53_zone" "site" {
  name         = var.hosted_zone_name
  private_zone = false
}

module "s3" {
  source = "./modules/s3"

  # Bucket names are global, so derive it from the domain, which is already unique to its owner.
  bucket_name      = "${replace(var.domain_name, ".", "-")}-site"
  distribution_arn = module.cloudfront.distribution_arn
}

module "acm" {
  source = "./modules/acm"
  providers = {
    aws           = aws
    aws.us_east_1 = aws.us_east_1
  }

  domain_name = var.domain_name
  aliases     = local.aliases
  zone_id     = data.aws_route53_zone.site.zone_id
}

module "cloudfront" {
  source = "./modules/cloudfront"

  name                        = var.project_name
  aliases                     = local.aliases
  bucket_regional_domain_name = module.s3.bucket_regional_domain_name
  certificate_arn             = module.acm.certificate_arn
  price_class                 = var.price_class
}

module "route53" {
  source = "./modules/route53"

  zone_id                     = data.aws_route53_zone.site.zone_id
  aliases                     = local.aliases
  distribution_domain_name    = module.cloudfront.distribution_domain_name
  distribution_hosted_zone_id = module.cloudfront.distribution_hosted_zone_id
}

module "iam" {
  source = "./modules/iam"

  name                 = var.project_name
  oidc_subject_prefix  = coalesce(var.github_oidc_subject_prefix, "repo:${var.github_repository}")
  github_deploy_branch = var.github_deploy_branch
  create_oidc_provider = var.create_github_oidc_provider
  bucket_arn           = module.s3.bucket_arn
  distribution_arn     = module.cloudfront.distribution_arn
}
