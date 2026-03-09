variable "name" { type = string }
variable "cidr_block" { type = string }
variable "public_subnet_cidrs" { type = list(string) }
variable "azs" { type = list(string) }
variable "tags" { type = map(string) default = {} }
