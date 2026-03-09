variable "project_name" { type = string }
variable "org_id" { type = string }
variable "cluster_name" { type = string }
variable "region" { type = string }
variable "instance_size" { type = string default = "M10" }
variable "db_username" { type = string }
variable "db_password" { type = string sensitive = true }
variable "database_name" { type = string }
