# Local DevOps Task Management Platform

Production-ready full stack + DevOps blueprint with Node.js, React, PostgreSQL, MongoDB, Docker, Kubernetes, Terraform, and CI.

## Git setup

- Branching, commit conventions, and hooks: docs/git.md

## Quickstart

1. Copy env files:
   - backend/.env.example -> backend/.env
   - frontend/.env.example -> frontend/.env

2. Run with Docker Compose:
   - docker compose -f docker/docker-compose.yml up --build

3. Open:
   - API: http://localhost:4000/health
   - UI: http://localhost:3000

## Required installations (local machine)

- Docker Desktop
- kubectl
- Minikube
- Helm
- Terraform
- Node.js 18+

If winget is available:

- scripts/install-tools.ps1 (run as Administrator)

## Step-by-step execution order

1) Install prerequisites
2) Copy env files
3) Start Docker Compose (local dev)
4) Run backend tests
5) Start Minikube and install monitoring
6) Deploy to Minikube
7) Verify services and pods
8) Optional: Terraform local or AWS example

## Testing commands

- Backend tests:
   - cd backend
   - npm install
   - npm run test:integration

- Frontend tests:
   - cd frontend
   - npm install
   - npm test

## Verification commands

- Health check:
   - curl http://localhost:4000/health

- Metrics:
   - curl http://localhost:4000/metrics

## Minikube setup

- ./scripts/setup-minikube.sh
- ./scripts/deploy-minikube.sh

## Monitoring

- docs/monitoring.md

## Logging and debugging

- docs/logging-debugging.md

## CI/CD flow (self-hosted runner)

1) Checkout code
2) Start databases via Docker Compose
3) Install deps and run tests
4) Build Docker images
5) Push images to Docker Hub
6) Deploy to Minikube
7) Verify rollout

See docs/ci-runner.md for runner setup.
See docs/ci-cd.md for the flow diagram and explanation.

## Architecture

- docs/architecture.md

## Database migrations + seed

- Run migrations:
   - cd backend
   - npm run db:migrate

- Seed admin user (optional):
   - Set `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` in backend/.env
   - npm run db:seed

## Tests

- Backend integration tests:
   - Ensure PostgreSQL is running
   - cd backend
   - npm run test:integration

## Deployment docs

- Kubernetes + Terraform steps: docs/deployment.md
- Production Nginx + HTTPS: docs/production-nginx.md

## Monitoring

- Prometheus + Grafana (separate compose):
  - docker compose -f docker/monitoring/docker-compose.monitoring.yml up
  - Prometheus: http://localhost:9090
  - Grafana: http://localhost:3001
