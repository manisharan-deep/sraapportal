# Local DevOps Architecture

## Components

- React frontend (Nginx) -> Backend API
- Backend API (Express + Sequelize + Mongoose)
- PostgreSQL for Users/Tasks
- MongoDB for Logs
- Prometheus + Grafana for metrics
- Minikube for orchestration

## Data flow

1) Client hits frontend
2) Frontend calls API (/api)
3) API reads/writes PostgreSQL
4) API writes logs to MongoDB
5) Prometheus scrapes /metrics
6) Grafana visualizes metrics
