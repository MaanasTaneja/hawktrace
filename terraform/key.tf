resource "tls_private_key" "ec2" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "ec2" {
  key_name   = "${local.name_prefix}-ec2-key"
  public_key = tls_private_key.ec2.public_key_openssh

  tags = local.common_tags
}

resource "local_file" "private_key_pem" {
  content         = tls_private_key.ec2.private_key_pem
  filename        = "${path.module}/${local.name_prefix}-ec2-key.pem"
  file_permission = "0400"
}
