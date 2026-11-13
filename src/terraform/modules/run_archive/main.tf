variable "bucket_name" {
  type = string
}

# The agents' run logs (src/agents/runs/), kept off the laptop: every number on the site traces back to them, and
# logs from an earlier machine were already lost. Private, never served: the logs hold full prompts and model
# answers, and the published reports are the curated public view.
resource "aws_s3_bucket" "logs" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Versioned, so a sync that deletes or overwrites by mistake can be undone.
resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Logs stay in standard storage (the owner's call: no move to Glacier). Only housekeeping: versions replaced by a
# later sync are dropped after 90 days, and uploads left unfinished after 7.
resource "aws_s3_bucket_lifecycle_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    id     = "housekeeping"
    status = "Enabled"
    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }

  depends_on = [aws_s3_bucket_versioning.logs]
}

# HTTPS only.
resource "aws_s3_bucket_policy" "logs" {
  bucket = aws_s3_bucket.logs.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.logs.arn, "${aws_s3_bucket.logs.arn}/*"]
      Condition = {
        Bool = { "aws:SecureTransport" = "false" }
      }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.logs]
}

output "bucket_name" {
  value = aws_s3_bucket.logs.id
}
