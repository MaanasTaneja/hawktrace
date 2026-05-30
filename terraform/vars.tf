variable "project_name" {
  type        = string
  description = "Short name used for AWS resource names."
  default     = "hawktrace"
}

variable "environment" {
  type        = string
  description = "Deployment environment."
  default     = "prod"
}

variable "deployment_region" {
  type        = string
  description = "AWS region for deployment."
  default     = "us-west-2"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the HawkTrace VPC."
  default     = "10.20.0.0/16"
}

variable "public_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks for public subnets. Only the first is used for the free-tier EC2 deployment."
  default     = ["10.20.1.0/24"]
}

variable "private_cidr_blocks" {
  type        = list(string)
  description = "CIDR blocks for private subnets. RDS requires at least two subnets in different AZs."
  default     = ["10.20.11.0/24", "10.20.12.0/24"]
}

variable "azs" {
  type        = list(string)
  description = "Availability zones for public/private subnets."
  default     = ["us-west-2a", "us-west-2b"]
}

variable "allowed_ssh_cidrs" {
  type        = list(string)
  description = "CIDR blocks allowed to SSH into EC2."
  default     = []
}

variable "ami" {
  type        = string
  description = "Amazon Linux AMI for EC2. Keep region-specific."
  default     = "ami-09a6b3d70f1a1d780"
}

variable "instance_type" {
  type        = string
  description = "Free-tier EC2 instance type."
  default     = "t2.micro"
}

variable "root_volume_gb" {
  type        = number
  description = "EC2 root volume size. Keep small for free-tier awareness."
  default     = 20
}

variable "repo_url" {
  type        = string
  description = "Git repository URL containing the HawkTrace app."
}

variable "repo_branch" {
  type        = string
  description = "Git branch to deploy."
  default     = "main"
}

variable "domain_name" {
  type        = string
  description = "Optional app domain, for example hawktrace.example.com. Leave empty to serve by public IP over HTTP."
  default     = ""
}

variable "route53_zone_id" {
  type        = string
  description = "Optional existing Route 53 hosted zone ID. If empty, no DNS record is created."
  default     = ""
}

variable "certbot_email" {
  type        = string
  description = "Email used for Let's Encrypt certificates when domain_name is set."
  default     = ""
}

variable "rds_db_name" {
  type        = string
  description = "Postgres database name."
  default     = "hawktrace"
}

variable "rds_username" {
  type        = string
  description = "Postgres admin username."
  default     = "hawktrace_admin"
}

variable "rds_password" {
  type        = string
  description = "Postgres admin password. For production, move this out of Terraform state."
  sensitive   = true
}

variable "rds_instance_class" {
  type        = string
  description = "Free-tier RDS instance class."
  default     = "db.t3.micro"
}

variable "rds_allocated_storage" {
  type        = number
  description = "RDS storage in GB."
  default     = 20
}

variable "gemini_api_key_ssm_name" {
  type        = string
  description = "SSM SecureString parameter name containing GEMINI_API_KEY."
  default     = "/hawktrace/prod/gemini-api-key"
}

variable "jwt_secret_ssm_name" {
  type        = string
  description = "SSM SecureString parameter name containing JWT_SECRET_KEY."
  default     = "/hawktrace/prod/jwt-secret"
}

variable "secrets_encryption_key_ssm_name" {
  type        = string
  description = "SSM SecureString parameter name containing a Fernet key for SECRETS_ENCRYPTION_KEY."
  default     = "/hawktrace/prod/secrets-encryption-key"
}

variable "resend_api_key_ssm_name" {
  type        = string
  description = "Optional SSM SecureString parameter name containing RESEND_API_KEY."
  default     = "/hawktrace/prod/resend-api-key"
}

variable "resend_from" {
  type        = string
  description = "From address for failure notification emails."
  default     = "HawkTrace <onboarding@resend.dev>"
}
