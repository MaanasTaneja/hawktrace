resource "aws_iam_role" "ec2" {
  name = "${local.name_prefix}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_policy" "ec2_app" {
  name = "${local.name_prefix}-ec2-app-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.deployment_region}:*:parameter${var.gemini_api_key_ssm_name}",
          "arn:aws:ssm:${var.deployment_region}:*:parameter${var.jwt_secret_ssm_name}",
          "arn:aws:ssm:${var.deployment_region}:*:parameter${var.secrets_encryption_key_ssm_name}",
          "arn:aws:ssm:${var.deployment_region}:*:parameter${var.resend_api_key_ssm_name}"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_app" {
  role       = aws_iam_role.ec2.name
  policy_arn = aws_iam_policy.ec2_app.arn
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2.name
}
