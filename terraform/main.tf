terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "ap-southeast-2"
}

# Import existing resources to track them in state
import {
  to = aws_ecr_repository.backend_repo
  id = "hawk-travelmate-backend"
}

import {
  to = aws_s3_bucket.uploads_bucket
  id = "hawk-travemate-uploads"
}

import {
  to = aws_iam_role.apprunner_access_role
  id = "AppRunnerECRAccessRole"
}

import {
  to = aws_iam_policy.s3_access_policy
  id = "arn:aws:iam::564827067264:policy/AppRunnerS3AccessPolicy"
}

import {
  to = aws_apprunner_service.backend
  id = "arn:aws:apprunner:ap-southeast-2:564827067264:service/hawk-travelmate-backend/96364abdb9524136b9d9d2516374a40e"
}

# 1. ECR Repository
resource "aws_ecr_repository" "backend_repo" {
  name                 = "hawk-travelmate-backend"
  image_tag_mutability = "MUTABLE"
  force_delete         = true

  image_scanning_configuration {
    scan_on_push = true
  }
}

# 2. S3 Bucket for Uploads
resource "aws_s3_bucket" "uploads_bucket" {
  bucket        = "hawk-travemate-uploads" 
  force_destroy = true # Warn: deletes all files on destroy
}

resource "aws_s3_bucket_public_access_block" "uploads_bucket_access" {
  bucket = aws_s3_bucket.uploads_bucket.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}



# 3. IAM Role for App Runner
resource "aws_iam_role" "apprunner_access_role" {
  name = "AppRunnerECRAccessRole"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "build.apprunner.amazonaws.com"
        }
      },
       {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "tasks.apprunner.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "apprunner_access_policy" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess"
}

# Policy for S3 Access
resource "aws_iam_policy" "s3_access_policy" {
  name        = "AppRunnerS3AccessPolicy"
  description = "Allow App Runner to access uploads bucket"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Effect   = "Allow"
        Resource = [
          aws_s3_bucket.uploads_bucket.arn,
          "${aws_s3_bucket.uploads_bucket.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "s3_access_attachment" {
  role       = aws_iam_role.apprunner_access_role.name
  policy_arn = aws_iam_policy.s3_access_policy.arn
}

# 4. App Runner Service
resource "aws_apprunner_service" "backend" {
  service_name = "hawk-travelmate-backend"

  source_configuration {
    authentication_configuration {
      access_role_arn = aws_iam_role.apprunner_access_role.arn
    }
    image_repository {
      image_identifier      = "${aws_ecr_repository.backend_repo.repository_url}:latest"
      image_repository_type = "ECR"
      image_configuration {
        port = "3001"
        runtime_environment_variables = {
          USE_S3           = "true"
          S3_BUCKET_NAME   = "hawk-travemate-uploads"
          AWS_REGION       = "ap-southeast-2"
          DATABASE_URL     = "postgresql://neondb_owner:npg_cGZgh15lQteo@ep-orange-mountain-a7nxjzpi-pooler.ap-southeast-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
        }
      }
    }
    auto_deployments_enabled = true
  }

  instance_configuration {
    cpu    = "1 vCPU"
    memory = "2 GB"
    instance_role_arn = aws_iam_role.apprunner_access_role.arn
  }

  network_configuration {
    egress_configuration {
      egress_type = "DEFAULT"
    }
    ingress_configuration {
      is_publicly_accessible = true
    }
  }

  tags = {
    Name = "HawkTravelmateBackend"
  }
}

output "app_runner_url" {
  value = aws_apprunner_service.backend.service_url
}

output "ecr_repository_url" {
  value = aws_ecr_repository.backend_repo.repository_url
}

output "s3_bucket_name" {
  value = aws_s3_bucket.uploads_bucket.id
}
