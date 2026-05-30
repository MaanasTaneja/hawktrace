output "app_url" {
  value = local.has_domain ? "https://${var.domain_name}" : "http://${aws_eip.web.public_ip}"
}

output "ec2_public_ip" {
  value = aws_eip.web.public_ip
}

output "rds_endpoint" {
  value = aws_db_instance.postgres.endpoint
}

output "s3_bucket_name" {
  value = aws_s3_bucket.artifacts.bucket
}

output "ssh_private_key_path" {
  value = local_file.private_key_pem.filename
}
