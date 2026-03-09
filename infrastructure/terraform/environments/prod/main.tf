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
  name                = "sru-prod-vpc"
  cidr_block          = "10.20.0.0/16"
  public_subnet_cidrs = ["10.20.1.0/24", "10.20.2.0/24"]
  azs                 = ["${var.aws_region}a", "${var.aws_region}b"]
  tags                = var.tags
}

module "eks" {
  source            = "../../modules/eks"
  cluster_name      = "sru-prod-eks"
  subnet_ids        = module.vpc.public_subnet_ids
  instance_types    = ["m5.large"]
  node_desired_size = 3
  node_min_size     = 2
  node_max_size     = 6
}

module "s3" {
  source      = "../../modules/s3"
  bucket_name = var.s3_bucket_name
  tags        = var.tags
}

module "mongodb" {
  source        = "../../modules/mongodb"
  project_name  = "sru-prod-project"
  org_id        = var.mongodb_atlas_org_id
  cluster_name  = "sru-prod-cluster"
  region        = "US_EAST_1"
  instance_size = "M20"
  db_username   = var.mongodb_db_username
  db_password   = var.mongodb_db_password
  database_name = "sru_portal"
}
