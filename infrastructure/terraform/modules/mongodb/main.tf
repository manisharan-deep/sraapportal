resource "mongodbatlas_project" "this" {
  name   = var.project_name
  org_id = var.org_id
}

resource "mongodbatlas_cluster" "this" {
  project_id   = mongodbatlas_project.this.id
  name         = var.cluster_name
  cluster_type = "REPLICASET"

  provider_name               = "AWS"
  provider_region_name        = var.region
  provider_instance_size_name = var.instance_size
  mongo_db_major_version      = "7.0"
}

resource "mongodbatlas_database_user" "this" {
  username           = var.db_username
  password           = var.db_password
  project_id         = mongodbatlas_project.this.id
  auth_database_name = "admin"

  roles {
    role_name     = "readWrite"
    database_name = var.database_name
  }
}
