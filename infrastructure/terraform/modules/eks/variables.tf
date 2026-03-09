variable "cluster_name" { type = string }
variable "subnet_ids" { type = list(string) }
variable "instance_types" { type = list(string) default = ["t3.medium"] }
variable "node_desired_size" { type = number default = 2 }
variable "node_min_size" { type = number default = 1 }
variable "node_max_size" { type = number default = 4 }
