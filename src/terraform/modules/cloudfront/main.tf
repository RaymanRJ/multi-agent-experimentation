variable "name" {
  type = string
}

variable "aliases" {
  type = list(string)
}

variable "bucket_regional_domain_name" {
  type = string
}

variable "certificate_arn" {
  type = string
}

variable "price_class" {
  type = string
}

locals {
  origin_id = "site-bucket"
}

resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.name}-site"
  description                       = "CloudFront access to the ${var.name} site bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS-managed policies: caching with gzip/Brotli that honours the objects' Cache-Control headers,
# and standard security headers (HSTS, nosniff, frame options, referrer policy).
data "aws_cloudfront_cache_policy" "caching_optimized" {
  name = "Managed-CachingOptimized"
}

data "aws_cloudfront_response_headers_policy" "security_headers" {
  name = "Managed-SecurityHeadersPolicy"
}

# The app uses hash routes (#/info), so there's no SPA fallback: a missing file is a real 404,
# shown with the site's own 404.html instead of S3's XML error.
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  aliases             = var.aliases
  default_root_object = "index.html"
  is_ipv6_enabled     = true
  http_version        = "http2and3"
  price_class         = var.price_class
  comment             = var.name

  origin {
    origin_id                = local.origin_id
    domain_name              = var.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id           = local.origin_id
    viewer_protocol_policy     = "redirect-to-https"
    allowed_methods            = ["GET", "HEAD"]
    cached_methods             = ["GET", "HEAD"]
    compress                   = true
    cache_policy_id            = data.aws_cloudfront_cache_policy.caching_optimized.id
    response_headers_policy_id = data.aws_cloudfront_response_headers_policy.security_headers.id
  }

  custom_error_response {
    error_code            = 404
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 60
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn      = var.certificate_arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}

output "distribution_id" {
  value = aws_cloudfront_distribution.site.id
}

output "distribution_arn" {
  value = aws_cloudfront_distribution.site.arn
}

output "distribution_domain_name" {
  value = aws_cloudfront_distribution.site.domain_name
}

output "distribution_hosted_zone_id" {
  value = aws_cloudfront_distribution.site.hosted_zone_id
}
