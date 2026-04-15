# Deployment Guide

## Kubernetes (local or managed cluster)

1. Update image names in:
   - k8s/backend-deployment.yaml
   - k8s/frontend-deployment.yaml

2. Update domain + secrets in:
   - k8s/configmap.yaml
   - k8s/secret.yaml
   - k8s/ingress.yaml

3. Apply manifests:

```
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/secret.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/mongo.yaml
kubectl apply -f k8s/backend-deployment.yaml
kubectl apply -f k8s/backend-service.yaml
kubectl apply -f k8s/frontend-deployment.yaml
kubectl apply -f k8s/frontend-service.yaml
kubectl apply -f k8s/ingress.yaml
kubectl apply -f k8s/hpa.yaml
```

4. Validate:

```
kubectl -n local-devops get pods
kubectl -n local-devops get svc
kubectl -n local-devops get ingress

5. Minikube access:

```
minikube tunnel
minikube service task-manager-frontend -n local-devops
```
```

## Terraform (AWS)

1. Set variables in terraform/terraform.tfvars:

```
aws_region = "us-east-1"
admin_cidr = "YOUR_PUBLIC_IP/32"
db_username = "postgres"
db_password = "REPLACE_ME"
```

2. Init and apply:

```
cd terraform
terraform init
terraform plan
terraform apply
```

3. Capture outputs and update backend env:
- rds_endpoint -> PG_HOST
- ec2_public_ip -> app host
