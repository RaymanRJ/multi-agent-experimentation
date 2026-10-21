variable "bucket_name" {
  type = string
}

variable "distribution_arn" {
  description = "The only CloudFront distribution allowed to read the bucket."
  type        = string
}

resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket = aws_s3_bucket.site.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Private bucket: CloudFront reads it through Origin Access Control, nobody else. ListBucket lets S3
# answer 404 rather than 403 for a missing file; CloudFront never forwards query strings, so it
# can't be used to list the bucket.
resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontRead"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = ["s3:GetObject", "s3:ListBucket"]
      Resource  = [aws_s3_bucket.site.arn, "${aws_s3_bucket.site.arn}/*"]
      Condition = {
        StringEquals = { "AWS:SourceArn" = var.distribution_arn }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.site]
}

output "bucket_name" {
  value = aws_s3_bucket.site.id
}

output "bucket_arn" {
  value = aws_s3_bucket.site.arn
}

output "bucket_regional_domain_name" {
  value = aws_s3_bucket.site.bucket_regional_domain_name
}
