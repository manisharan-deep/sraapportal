# Logging & Debugging

## View logs

```
kubectl -n local-devops logs deploy/task-manager-backend
kubectl -n local-devops logs deploy/task-manager-frontend
```

## Describe a failed pod

```
kubectl -n local-devops describe pod <pod-name>
```

## Debug failed pods

```
kubectl -n local-devops get pods
kubectl -n local-devops logs <pod-name>
```

## Scale deployment

```
kubectl -n local-devops scale deploy/task-manager-backend --replicas=3
```
