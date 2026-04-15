# Monitoring & Observability

## Prometheus + Grafana (Kubernetes via Helm)

1) Run the setup script:

```
./scripts/setup-minikube.sh
```

2) Apply the ServiceMonitor:

```
kubectl apply -f k8s/servicemonitor.yaml
```

3) Verify targets:

```
kubectl -n monitoring port-forward svc/monitoring-kube-prometheus-prometheus 9090:9090
```

Open: http://localhost:9090/targets

## Grafana access

```
kubectl -n monitoring port-forward svc/monitoring-grafana 3001:80
```

Open: http://localhost:3001
Default user/pass: admin / prom-operator

## Minikube access note

- If using Ingress locally, run: `minikube tunnel`

## Node Exporter

Node Exporter is bundled inside kube-prometheus-stack. You can validate it under Prometheus targets.

## Application metrics

- Backend exposes `/metrics` from prom-client.
- Prometheus scrapes the backend service in the cluster.

## Example alert rule

```yaml
# Example: backend down
- alert: BackendDown
  expr: up{job="task-manager-backend"} == 0
  for: 2m
  labels:
    severity: critical
  annotations:
    summary: "Backend is down"
    description: "No scrape target responded for 2 minutes."
```

## Local Docker monitoring

Use the Docker monitoring stack for local runs:

```
docker compose -f docker/monitoring/docker-compose.monitoring.yml up -d
```

Prometheus: http://localhost:9090
Grafana: http://localhost:3001
