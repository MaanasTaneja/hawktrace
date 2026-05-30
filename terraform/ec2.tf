resource "aws_eip" "web" {
  domain = "vpc"

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web-eip"
  })
}

resource "aws_eip_association" "web" {
  instance_id   = aws_instance.web.id
  allocation_id = aws_eip.web.id
}

resource "aws_instance" "web" {
  ami                         = var.ami
  instance_type               = var.instance_type
  iam_instance_profile        = aws_iam_instance_profile.ec2.name
  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.compute.id]
  associate_public_ip_address = true
  key_name                    = aws_key_pair.ec2.key_name

  root_block_device {
    volume_size = var.root_volume_gb
    volume_type = "gp3"
  }

  user_data = <<-EOF
    #!/bin/bash
    set -euo pipefail

    APP_DIR="/opt/hawktrace"
    AWS_REGION="${var.deployment_region}"
    DOMAIN_NAME="${var.domain_name}"
    CERTBOT_EMAIL="${var.certbot_email}"

    yum update -y
    yum install -y docker git nginx awscli certbot python3-certbot-nginx postgresql15

    systemctl enable docker
    systemctl start docker
    systemctl enable nginx

    if ! command -v docker-compose >/dev/null 2>&1; then
      curl -L "https://github.com/docker/compose/releases/download/v2.29.7/docker-compose-linux-x86_64" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
    fi

    rm -rf "$APP_DIR"
    git clone --branch "${var.repo_branch}" "${var.repo_url}" "$APP_DIR"
    cd "$APP_DIR"

    get_ssm() {
      aws ssm get-parameter \
        --region "$AWS_REGION" \
        --with-decryption \
        --name "$1" \
        --query 'Parameter.Value' \
        --output text
    }

    GEMINI_API_KEY="$(get_ssm "${var.gemini_api_key_ssm_name}")"
    JWT_SECRET_KEY="$(get_ssm "${var.jwt_secret_ssm_name}")"
    SECRETS_ENCRYPTION_KEY="$(get_ssm "${var.secrets_encryption_key_ssm_name}")"
    RESEND_API_KEY="$(get_ssm "${var.resend_api_key_ssm_name}" 2>/dev/null || true)"

    cat > .env.prod <<ENV
    DATABASE_URL=postgresql+psycopg://${var.rds_username}:${var.rds_password}@${aws_db_instance.postgres.address}:5432/${var.rds_db_name}
    REDIS_URL=redis://hawktrace_cache:6379/0
    GEMINI_API_KEY=$GEMINI_API_KEY
    JWT_SECRET_KEY=$JWT_SECRET_KEY
    SECRETS_ENCRYPTION_KEY=$SECRETS_ENCRYPTION_KEY
    RESEND_API_KEY=$RESEND_API_KEY
    RESEND_FROM=${var.resend_from}
    VITE_BACKEND_URL=${local.backend_url}
    VITE_BACKEND_WS_URL=${local.backend_ws_url}
    ENV
    chmod 0600 .env.prod

    cat > docker-compose.prod.yml <<'COMPOSE'
    services:
      hawktrace_backend:
        build: ./backend
        container_name: hawktrace_webservice
        env_file:
          - .env.prod
        ports:
          - "127.0.0.1:8001:8001"
        volumes:
          - ./backend/flows:/app/flows
          - ./backend/runs:/app/runs
        depends_on:
          - hawktrace_cache
        restart: unless-stopped

      hawktrace_frontend:
        build: ./frontend
        container_name: hawktrace_frontend
        env_file:
          - .env.prod
        ports:
          - "127.0.0.1:3001:3001"
        depends_on:
          - hawktrace_backend
        restart: unless-stopped

      hawktrace_cache:
        image: redis:7-alpine
        container_name: hawktrace_cache
        command: redis-server --appendonly yes
        volumes:
          - redis_data:/data
        restart: unless-stopped

      hawktrace_celery_worker:
        build: ./backend
        container_name: hawktrace_celery_worker
        command: celery -A tasks worker --loglevel=info --concurrency=1
        env_file:
          - .env.prod
        volumes:
          - ./backend/flows:/app/flows
          - ./backend/runs:/app/runs
        depends_on:
          - hawktrace_cache
          - hawktrace_backend
        restart: unless-stopped

      hawktrace_celery_beat:
        build: ./backend
        container_name: hawktrace_celery_beat
        command: celery -A tasks beat --loglevel=info
        env_file:
          - .env.prod
        depends_on:
          - hawktrace_cache
          - hawktrace_backend
        restart: unless-stopped

    volumes:
      redis_data:
    COMPOSE

    docker-compose -f docker-compose.prod.yml up -d --build

    SERVER_NAME="_"
    if [ -n "$DOMAIN_NAME" ]; then
      SERVER_NAME="$DOMAIN_NAME"
    fi

    cat > /etc/nginx/conf.d/hawktrace.conf <<NGINX
    server {
        listen 80;
        server_name $SERVER_NAME;

        client_max_body_size 100m;

        location /ws/ {
            proxy_pass http://127.0.0.1:8001;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \\$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \\$host;
            proxy_set_header X-Real-IP \\$remote_addr;
            proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \\$scheme;
        }

        location ~ ^/(users|flows|agents|health) {
            proxy_pass http://127.0.0.1:8001;
            proxy_set_header Host \\$host;
            proxy_set_header X-Real-IP \\$remote_addr;
            proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \\$scheme;
        }

        location / {
            proxy_pass http://127.0.0.1:3001;
            proxy_set_header Host \\$host;
            proxy_set_header X-Real-IP \\$remote_addr;
            proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \\$scheme;
        }
    }
    NGINX

    nginx -t
    systemctl restart nginx

    if [ -n "$DOMAIN_NAME" ] && [ -n "$CERTBOT_EMAIL" ]; then
      certbot --nginx -d "$DOMAIN_NAME" --non-interactive --agree-tos -m "$CERTBOT_EMAIL" || true
      echo "0 3 * * * root certbot renew --quiet" >> /etc/crontab
    fi
  EOF

  tags = merge(local.common_tags, {
    Name = "${local.name_prefix}-web"
  })

  depends_on = [aws_db_instance.postgres]
}
