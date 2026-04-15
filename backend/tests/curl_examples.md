# Curl Examples

## Register
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"DevOps User","email":"user@example.com","password":"Password123"}'
```

## Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"Password123"}'
```

## List Tasks
```bash
curl -X GET http://localhost:4000/api/tasks \
  -H "Authorization: Bearer <token>"
```

## Create Task
```bash
curl -X POST http://localhost:4000/api/tasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Ship monitoring","description":"Deploy Prometheus + Grafana"}'
```

## Update Task
```bash
curl -X PUT http://localhost:4000/api/tasks/<taskId> \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"status":"Completed"}'
```

## Delete Task
```bash
curl -X DELETE http://localhost:4000/api/tasks/<taskId> \
  -H "Authorization: Bearer <token>"
```
