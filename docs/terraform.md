# Terraform Notes

- The AWS RDS instance is private and reachable from the EC2 security group only.
- Update `admin_cidr` to your workstation CIDR for SSH access.
- Store secrets in a secure secrets manager for production (e.g. AWS Secrets Manager).

## Local example

- See docs/local-terraform.md
