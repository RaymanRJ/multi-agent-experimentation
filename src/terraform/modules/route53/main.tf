variable "zone_id" {
  type = string
}

variable "aliases" {
  type = list(string)
}

variable "distribution_domain_name" {
  type = string
}

variable "distribution_hosted_zone_id" {
  type = string
}

locals {
  # An IPv4 (A) and IPv6 (AAAA) alias for every name, since the distribution serves both.
  records = {
    for pair in setproduct(var.aliases, ["A", "AAAA"]) : "${pair[0]}-${pair[1]}" => {
      name = pair[0]
      type = pair[1]
    }
  }
}

resource "aws_route53_record" "site" {
  for_each = local.records

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type

  alias {
    name                   = var.distribution_domain_name
    zone_id                = var.distribution_hosted_zone_id
    evaluate_target_health = false
  }
}
