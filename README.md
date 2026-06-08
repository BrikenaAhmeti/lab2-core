# MedSphere Core Service

Main clinical and operations API for the Lab2 MedSphere platform. Core owns the shared healthcare domain: departments, service catalog, staff profiles and schedules, patients, appointments, medical records, prescriptions, lab, billing, pharmacy, inventory, reports, search, import/export, feedback, contact messages, settings, dashboard stats, file metadata, and audit logs.

Auth, CMS, Notifications, and AI live in separate Lab2 backend services. Core verifies Auth-issued JWTs, publishes events to Notifications, serves internal clinical context to AI, and exposes internal appointment tools for AI/Vapi voice booking.

## Port

- Local and Docker API: `http://localhost:3007`
- Container port: `3007`
- Health: `GET /health`
- REST API base path: `/api`
- Swagger UI: `http://localhost:3007/api/docs`
- OpenAPI JSON: `http://localhost:3007/api/docs.json`

## Data Stores

- PostgreSQL via Prisma for Core relational domain data.
- Redis for distributed appointment slot locks.
- MongoDB for saved report templates.

Docker Compose starts Postgres, Redis, MongoDB, a one-time Prisma migration container, and the Core Service.

Owned PostgreSQL tables include departments, service catalog, staff position types, staff profiles, staff department assignments, staff schedules, schedule exceptions, patients, appointments, medical records and amendments, prescriptions and items, lab tests/orders/items, pharmacy queue and dispensing items, inventory categories/items/transactions, billings/items/payments, feedback, contact messages, settings, files, audit logs, and service permissions.

## Environment

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

Docker and datastore helper keys:

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

`JWT_ACCESS_SECRET` must match the Auth Service access-token secret. `INTERNAL_API_KEY` must match the other backend services when service-to-service routes are enabled.

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

Docker starts Postgres, Redis, MongoDB, runs `prisma migrate deploy`, then starts Core.

## Build And Tests

```bash
npm run build
npm run test
```

Additional commands:

```bash
npm run test:unit
npm run test:integration
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
npm run prisma:studio
npm run seed
```

## Route Groups

Public and authenticated route groups:

- `GET /health`
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

Internal service routes use `x-internal-api-key`:

- `GET /internal/appointments/reminders`
- `GET /internal/appointments/:id/ai-clinical-context`
- `POST /internal/appointments/vapi/tools`
- `POST /internal/patients/link-by-personal-number`
- `GET /internal/patients/by-user/:userId`

Swagger is the source of truth for request and response shapes.

## Integrations

- Auth provides JWT identity, user profile lookup, and user-account provisioning for staff/patients.
- Notifications receives appointment, billing, lab, pharmacy, inventory, feedback, contact, and dashboard activity events.
- AI receives lab interpretation requests and consultation clinical context. Core does not call OpenAI directly.
- AI/Vapi calls Core's internal appointment tools for appointment context resolution, availability checks, and booking.

## Database Normalization

The Prisma schema is normalized to 3NF for owned relational data:

- Many-to-many relationships use join tables such as `staff_position_type_departments` and `staff_department_assignments`.
- Lookup/master entities such as departments, service catalog, staff position types, lab tests, inventory categories, and payment methods are separated from transactions.
- Transaction details are split into header/item/payment tables for prescriptions, lab orders, pharmacy dispensing, inventory, and billing.
- Auth-owned user identities are referenced by UUID fields instead of duplicated as full user records.

Intentional controlled exceptions are kept for product correctness:

- Appointment `departmentId`, `serviceCatalogId`, `durationMinutes`, and `basePrice` preserve the booked service context even if catalog data later changes.
- Billing subtotals, totals, amount paid, and item totals are financial snapshots that must remain stable for invoices and PDFs.
- Inventory `currentStock` is a cached operational total backed by immutable `inventory_transactions`.
- Audit logs, settings, medical snapshots, vitals, allergies, and report template data use JSON because their structure is event/configuration payload data rather than reusable relational master data.

These exceptions are updated only through service-layer workflows and should not be treated as canonical replacement tables.

## Notes

- Deletes are implemented as soft deactivation where historical records need to remain available.
- Patient personal numbers are stored with encrypted/hashed handling in the service layer.
- Keep `.env.example`, Swagger, and this README aligned whenever ports, route groups, or service contracts change.
