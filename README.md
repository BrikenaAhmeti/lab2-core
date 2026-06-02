# MedSphere Core Service

Main clinical and operations API for the Lab2 MedSphere platform. It owns the shared healthcare domain: departments, service catalog, staff, schedules, patients, appointments, medical records, prescriptions, lab, billing, pharmacy, inventory, reports, search, import/export, feedback, contact messages, settings, dashboard stats, and audit logs.

Auth, CMS, Notifications, and AI live in separate Lab2 services. Core verifies Auth-issued JWTs and calls other services through internal API keys when needed.

## Port

- Local and Docker API: `http://localhost:3007`
- Container port: `3007`
- Health: `GET /health`
- API base path: `/api`

## Data Stores

- PostgreSQL via Prisma for core domain data.
- Redis for distributed appointment slot locks.
- MongoDB for saved report templates.

Docker Compose starts Postgres, Redis, MongoDB, a one-time migration container, and the Core Service.

## Environment Keys

Copy `.env.example` to `.env`.

Service keys:

- `NODE_ENV`
- `PORT`
- `LOG_LEVEL`
- `AUDIT_LOGGING_ENABLED`
- `SENTRY_DSN`
- `JWT_ACCESS_SECRET`
- `PATIENT_DATA_ENCRYPTION_KEY`
- `FRONTEND_ORIGINS`
- `INTERNAL_API_KEY`
- `AUTH_SERVICE_URL`
- `AI_SERVICE_URL`
- `NOTIFICATION_SERVICE_URL`
- `DATABASE_URL`
- `REDIS_URL`
- `MONGODB_URI`

Docker/Postgres/Redis/Mongo helper keys:

- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `POSTGRES_DB`
- `POSTGRES_PORT`
- `REDIS_PASSWORD`
- `REDIS_PORT`
- `MONGO_ROOT_USERNAME`
- `MONGO_ROOT_PASSWORD`
- `MONGO_DATABASE`
- `MONGO_PORT`
- `CORE_SERVICE_PORT`
- `AUTH_SERVICE_URL_DOCKER`
- `AI_SERVICE_URL_DOCKER`
- `NOTIFICATION_SERVICE_URL_DOCKER`

## Start Locally

```bash
npm install
cp .env.example .env
npm run docker:infra
npm run prisma:generate
npm run prisma:migrate
npm run seed
npm run dev
```

Stop only local infrastructure:

```bash
npm run docker:infra:down
```

## Run With Docker

```bash
cp .env.example .env
npm run docker:up
```

Stop the stack:

```bash
npm run docker:down
```

Docker starts Postgres, Redis, MongoDB, runs `prisma migrate deploy`, then starts the Core Service.

## Build And Tests

```bash
npm run build
npm run test
```

Additional test commands:

```bash
npm run test:unit
npm run test:integration
```

Useful Prisma commands:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
```

## Swagger

- Swagger UI: `http://localhost:3007/api/docs`
- OpenAPI JSON: `http://localhost:3007/api/docs.json`

Swagger covers the current Core routes for health, departments, services, staff, schedules, patients, appointments, medical records, prescriptions, lab tests/orders, billing, pharmacy, inventory, dashboard, reports, search, data exchange, feedback, contact, settings, audit logs, and internal appointment/patient endpoints.

## Main Route Groups

- `/api/departments`
- `/api/services`
- `/api/staff-position-types`
- `/api/staff`
- `/api/public/departments`
- `/api/public/services`
- `/api/public/staff`
- `/api/public/appointments`
- `/api/public/settings`
- `/api/patients`
- `/api/appointments`
- `/api/medical-records`
- `/api/prescriptions`
- `/api/lab-tests`
- `/api/lab-orders`
- `/api/billings`
- `/api/pharmacy`
- `/api/inventory`
- `/api/dashboard`
- `/api/reports`
- `/api/search`
- `/api/export`
- `/api/import`
- `/api/feedback`
- `/api/contact`
- `/api/settings`
- `/api/audit-logs`
- `/internal/appointments`
- `/internal/patients`

## Notes

- Deletes are implemented as soft deactivation where the domain requires historical records.
- `INTERNAL_API_KEY` must match Auth, Notifications, CMS, and AI when service-to-service calls are enabled.
- Core does not call OpenAI directly; lab interpretation is delegated to the AI Service.
