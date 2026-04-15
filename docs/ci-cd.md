# CI/CD Flow

## Diagram

```mermaid
flowchart LR
  A[Push/PR] --> B[Self-hosted Runner]
  B --> C[Install Deps]
  C --> D[Run Tests]
  D --> E[Build Images]
  E --> F[Push to Docker Hub]
  F --> G[Deploy to Minikube]
  G --> H[Verify Rollout]
```

## Explanation

- Push or PR triggers the self-hosted runner.
- The runner installs dependencies and runs unit/integration tests.
- Docker images are built and pushed to Docker Hub.
- The deployment script applies Kubernetes manifests in Minikube.
- Rollout is verified by checking pod status.
