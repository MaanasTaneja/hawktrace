terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "~> 2.5"
    }
  }
}

provider "aws" {
  region = var.deployment_region
}

locals {
  name_prefix    = "${var.project_name}-${var.environment}"
  has_domain     = var.domain_name != ""
  has_route53    = var.route53_zone_id != "" && var.domain_name != ""
  backend_url    = ""
  backend_ws_url = ""

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
