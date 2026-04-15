# Self-hosted GitHub Actions Runner

## Register the runner

1) In GitHub: Settings -> Actions -> Runners -> New self-hosted runner
2) Select the OS and copy the commands
3) Run the commands on the local machine

## Requirements

- Docker Desktop
- kubectl
- Minikube
- Terraform

## Runner service

Install as a service to keep it online:

```
./svc.sh install
./svc.sh start
```

## Secrets required

- DOCKERHUB_USERNAME
- DOCKERHUB_TOKEN
