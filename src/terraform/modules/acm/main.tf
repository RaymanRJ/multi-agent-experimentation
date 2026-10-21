terraform {
  required_providers {
    aws = {
      source                = "hashicorp/aws"
      configuration_aliases = [aws.us_east_1]
    }
  }
}

variable "domain_name" {
  type = string
}

variable "aliases" {
  description = "Every name the certificate covers, including domain_name."
  type        = list(string)
}

variable "zone_id" {
  description = "Route 53 zone that holds the DNS validation records."
  type        = string
}

resource "aws_acm_certificate" "site" {
  provider = aws.us_east_1

  domain_name               = var.domain_name
  subject_alternative_names = [for alias in var.aliases : alias if alias != var.domain_name]
  validation_method         = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

locals {
  # Keyed by the names we already know, so the plan doesn't depend on values ACM only returns later.
  validation = {
    for alias in var.aliases : alias => one([
      for option in aws_acm_certificate.site.domain_validation_options : option if option.domain_name == alias
    ])
  }
}

resource "aws_route53_record" "validation" {
  for_each = toset(var.aliases)

  zone_id         = var.zone_id
  name            = local.validation[each.key].resource_record_name
  type            = local.validation[each.key].resource_record_type
  records         = [local.validation[each.key].resource_record_value]
  ttl             = 300
  allow_overwrite = true
}

resource "aws_acm_certificate_validation" "site" {
  provider = aws.us_east_1

  certificate_arn         = aws_acm_certificate.site.arn
  validation_record_fqdns = [for record in aws_route53_record.validation : record.fqdn]
}

output "certificate_arn" {
  # From the validation resource, so CloudFront waits until the certificate is issued.
  value = aws_acm_certificate_validation.site.certificate_arn
}
