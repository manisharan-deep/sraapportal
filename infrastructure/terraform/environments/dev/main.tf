terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    mongodbatlas = {
      source  = "mongodb/mongodbatlas"
      version = "~> 1.17"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "mongodbatlas" {
  public_key  = var.mongodb_atlas_public_key
  private_key = var.mongodb_atlas_private_key
}

module "vpc" {
  source              = "../../modules/vpc"
  name                = "sru-dev-vpc"
  cidr_block          = "10.10.0.0/16"
  public_subnet_cidrs = ["10.10.1.0/24", "10.10.2.0/24"]
  azs                 = ["${var.aws_region}a", "${var.aws_region}b"]
  tags                = var.tags
}

module "eks" {
  source         = "../../modules/eks"
  cluster_name   = "sru-dev-eks"
  subnet_ids     = module.vpc.public_subnet_ids
  instance_types = ["t3.medium"]
}

module "s3" {
  source      = "../../modules/s3"
  bucket_name = var.s3_bucket_name
  tags        = var.tags
}

module "mongodb" {
  source        = "../../modules/mongodb"
  project_name  = "sru-dev-project"
  org_id        = var.mongodb_atlas_org_id
  cluster_name  = "sru-dev-cluster"
  region        = "US_EAST_1"
  db_username   = var.mongodb_db_username
  db_password   = var.mongodb_db_password
  database_name = "sru_portal"
}

resource "aws_iam_role" "github_actions_role" {
  name = "sru-dev-github-actions-role"
  assume_role_policy = jsonencode({
    Version = "2012-10-17",
    Statement = [{
      Effect = "Allow",
      Principal = { Federated = "arn:aws:iam::${var.aws_account_id}:oidc-provider/token.actions.githubusercontent.com" },
      Action = "sts:AssumeRoleWithWebIdentity",
      Condition = {
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:${var.github_repo}:*"
        }
      }
    }]
  })
}
