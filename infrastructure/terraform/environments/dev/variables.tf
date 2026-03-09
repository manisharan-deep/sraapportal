variable "aws_region" { type = string }
variable "aws_account_id" { type = string }
variable "github_repo" { type = string }
variable "s3_bucket_name" { type = string }
variable "mongodb_atlas_public_key" { type = string sensitive = true }
variable "mongodb_atlas_private_key" { type = string sensitive = true }
variable "mongodb_atlas_org_id" { type = string }
variable "mongodb_db_username" { type = string }
variable "mongodb_db_password" { type = string sensitive = true }
variable "tags" { type = map(string) default = { environment = "dev", project = "sru-portal" } }
