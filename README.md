# SR University Portal (Enterprise Full-Stack + DevSecOps)

Production-grade university portal using Node.js + Express MVC + EJS SSR with complete DevSecOps assets for Docker, Kubernetes, Terraform, and ArgoCD.

## Tech Stack

- Frontend: EJS, Bootstrap 5, Animate.css, Vanilla JS
- React frontend: Vite + React + Tailwind CSS in `frontend-react/`
- Backend: Node.js, Express.js (MVC)
- Database: MongoDB (Mongoose)
- Cache: Redis
- Auth: JWT access/refresh + bcrypt
- RBAC: STUDENT, STAFF, ADMIN
- Validation: Zod
- Security: Helmet, CORS, CSRF, rate limiting, input sanitization, HPP
- Logging: Winston + Morgan
- Notifications: Nodemailer + WhatsApp placeholder service
- Monitoring: Prometheus + Grafana

## Project Structure

- backend
  - src/{config,controllers,models,routes,middlewares,services,utils,views}
  - tests/{unit,integration}
  - package.json
  - Dockerfile
- frontend-react
  - Vite + React + Tailwind app for teacher, student, and admin portals
  - src/{components,context,lib,pages,styles}
- infrastructure
  - docker/
  - kubernetes/{backend-deployment.yaml,backend-service.yaml,ingress.yaml,configmap.yaml,secret.yaml,hpa.yaml}
  - terraform/{modules/{vpc,eks,mongodb,s3},environments/{dev,prod}}
  - argocd/application.yaml
- monitoring/{prometheus.yml,grafana-dashboard.json}
- .github/workflows/ci-cd.yaml
- docker-compose.yml

## Local Run (Docker Compose)

1. Update values in `backend/.env.example` for your environment.
2. Start stack:
   - `docker compose up --build`
3. Open:
   - App: http://localhost:3000
   - Health: http://localhost:3000/health
   - Metrics: http://localhost:3000/metrics

## React Frontend

1. Install dependencies:
  - `cd frontend-react`
  - `npm install`
2. Start the dev server:
  - `npm run dev`
3. The Vite dev server proxies API requests to `http://localhost:3000`.
4. Build output is served from `frontend-react/dist` when deployed behind Express.

## Sample Seed Data

1. Set a password before running the seed script:
  - `SEED_PORTAL_PASSWORD=YourStrongPassword123!`
2. Seed admin, teacher, student, course, attendance, and marks demo records:
  - `node backend/scripts/seedUniversityPortal.js`
3. Demo login identifiers:
  - Admin email: `admin@university.local`
  - Teacher email: `teacher@university.local`
  - Student email: `student@university.local`

## Authentication

- Student login: enrollment number + password
- Staff login: username + password
- Admin login: username + password
- Login redirects:
  - STUDENT -> /student/dashboard
  - STAFF -> /staff/dashboard
  - ADMIN -> /admin/dashboard

Seed default admin (for first run):
- `POST /seed/admin`

## Student Features

- Dashboard: full name, branch, CGPA, backlogs, mentor, alpha/sigma/penalty coins
- Attendance:
  - Last 10 days
  - Course-wise summary
  - 75% calculator
  - PDF generation + email + WhatsApp placeholder
- Academics: course registration, results (CIE/ETE), semester memos
- Exams: timetable + hall ticket
- Fees: exam + semester fees
- Feedback: faculty, mentor, college
- Leaderboard: alpha/sigma rankings and penalty tracking
- File access: batch-based
- Announcements: global, batch, individual
- Calendar: academic events placeholder
- External links guarded via animated warning page

## Staff Features

- Mark attendance
- Upload files
- Create announcements
- Assign coins
- View mentoring students

## Admin Features

- Profile edit approval workflow
- User visibility

## Security Controls

- Bcrypt password hashing
- JWT expiration for access and refresh tokens
- Helmet security headers
- CORS restrictions
- Rate limiting for auth and APIs
- CSRF protection for forms
- NoSQL injection sanitization (`express-mongo-sanitize`)
- Parameter pollution protection (`hpp`)
- Environment-based secrets
- No hardcoded production credentials

## CI/CD (GitHub Actions)

Workflow: `.github/workflows/ci-cd.yaml`

Stages:
1. Install dependencies
2. Lint code
3. Unit tests
4. Integration tests
5. npm audit
6. Docker build
7. Trivy image scan
8. Push image to GHCR
9. Deploy to Kubernetes when pushing `staging` branch

## Kubernetes + ArgoCD

- K8s manifests in `infrastructure/kubernetes`
- ArgoCD app in `infrastructure/argocd/application.yaml`
- Update image and host values for your environment before deploy.

## Terraform

- Reusable modules:
  - VPC
  - EKS
  - MongoDB Atlas
  - S3
- Environment entry points:
  - `infrastructure/terraform/environments/dev`
  - `infrastructure/terraform/environments/prod`

Run example (dev):

1. `cd infrastructure/terraform/environments/dev`
2. `cp terraform.tfvars.example terraform.tfvars`
3. Fill values
4. `terraform init`
5. `terraform plan`
6. `terraform apply`

## Monitoring

- Prometheus scrape config: `monitoring/prometheus.yml`
- Grafana dashboard template: `monitoring/grafana-dashboard.json`
- Metrics tracked:
  - API response time
  - CPU usage
  - Memory usage
  - Error rate

## Notes

- Replace placeholder domains, image repository, secrets, and Atlas credentials before production.
- MongoDB + Redis are local in Docker Compose; production should use managed services.

## Render Deployment (Frontend + Backend + Atlas)

This project serves frontend static files from Express, so a single Render Web Service is enough.

1. Push this repo to GitHub.
2. In Render, create a new Web Service from the repo.
3. Render will detect `render.yaml` and auto-fill build/start commands.
4. Set environment variables in Render:
  - `MONGO_URI` = your Atlas URI (example includes `/sru_portal` database)
  - `BASE_URL` = your Render URL (for example `https://sraap-portal.onrender.com`)
  - `CORS_ORIGIN` = same Render URL
  - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SESSION_SECRET` = strong random strings
5. Deploy. Check:
  - `https://your-service.onrender.com/health`
  - `https://your-service.onrender.com/index.html`

### Atlas Connection Format

Use this format for `MONGO_URI`:

`mongodb+srv://<db_user>:<db_password>@cluster1.bfkru39.mongodb.net/sru_portal?retryWrites=true&w=majority&appName=Cluster1`

Note: If password contains special characters like `@` or `/`, URL-encode the password first.
