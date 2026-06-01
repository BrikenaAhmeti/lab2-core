# department-service

`department-service` is a standalone MedSphere microservice responsible only for department data and department business rules. It follows the same Express, TypeScript, Prisma, Zod, Jest, and JWT middleware conventions as the existing auth service, while keeping auth ownership out of this codebase.

## Stack

- Node.js
- Express
- TypeScript
- Prisma + PostgreSQL
- Zod validation
- Jest + Supertest
- CQRS-style flow: `Controller -> Command/Query -> Handler -> Service -> Repository -> Prisma`

## Project structure

- `src/app.ts` and `src/server.ts` wire the HTTP app
- `src/config/env.ts` centralizes env access
- `src/shared` contains buses, errors, JWT verification, and middleware
- `src/modules/departments` contains the full department module
- `prisma/schema.prisma` defines the database models
- `prisma/seed.ts` seeds only department-service permission metadata
- `tests/unit` and `tests/integration` cover service, handler, and route behavior

## Environment

Copy `.env.example` and provide:

- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `FRONTEND_ORIGINS`
- `REDIS_URL` for distributed appointment slot locks; without it the service falls back to in-memory locks
- `MONGODB_URI` for report template persistence; without it report templates are kept in memory
- `INTERNAL_API_KEY` for internal endpoints, notification-service calls, and AI-service background jobs
- `AI_SERVICE_URL` if automatic lab-result AI interpretation should be enabled
- `NOTIFICATION_SERVICE_URL` if notification delivery should be enabled
- `SENTRY_DSN` if backend error tracking should be enabled

## Scripts

- `npm run dev` starts the service with hot reload
- `npm run build` compiles TypeScript
- `npm run start` runs the compiled build
- `npm test` runs all tests
- `npm run test:unit` runs unit tests only
- `npm run test:integration` runs integration tests only
- `npm run prisma:generate` generates Prisma client
- `npm run prisma:migrate` creates/applies local migrations
- `npm run prisma:migrate:deploy` applies existing migrations, used by Docker
- `npm run seed` seeds department permission definitions
- `npm run docker:up` builds and starts the service with Postgres, Redis, and MongoDB
- `npm run docker:down` stops the full Docker stack
- `npm run docker:infra` starts only Postgres, Redis, and MongoDB for local service development
- `npm run docker:infra:down` stops the local infrastructure stack

## Docker

The repo includes Docker support for this service and the shared infrastructure required by the MedSphere sprint plan.

Full stack for this repo:

```bash
cp .env.example .env
npm run docker:up
```

This starts:

- `postgres` with a persistent `postgres_data` volume
- `redis` with password auth and append-only persistence
- `mongodb` with a persistent `mongodb_data` volume
- `core-service-migrate`, a one-time migration container
- `core-service`, exposed on `http://localhost:3007`

Health check:

```bash
curl http://localhost:3007/health
```

For development, start only infrastructure and run the service natively:

```bash
npm run docker:infra
npm run prisma:migrate
npm run dev
```

Inside Docker, service-to-service URLs use container names. For example, `DATABASE_URL` points to `postgres:5432`, not `localhost:5432`.

## Auth compatibility

This service does not implement login, registration, refresh tokens, password reset, or user storage.

It trusts Bearer access tokens issued by the auth service:

- Header format: `Authorization: Bearer <token>`
- Secret: `JWT_ACCESS_SECRET`
- Payload:
  - `sub: string`
  - `email: string`
  - `roles: string[]`
  - `permissions: string[]`

The middleware attaches:

```ts
req.user = {
    id: payload.sub,
    email: payload.email,
    roles: payload.roles,
    permissions: payload.permissions,
};
```

Permission checks stay compatible with the auth service and support:

- `own`
- `department`
- `all`

## Endpoints

- `GET /health`
- Swagger UI: `GET /api/docs`
- OpenAPI JSON: `GET /api/docs.json`
- The OpenAPI document covers the current Core Service routes for departments, services, staff, schedules, patients, appointments, medical records, prescriptions, lab, billing, pharmacy, dashboard, reports, search, data exchange, feedback, contact, settings, audit logs, and internal appointment reminders.

## Notes

- Deletes are soft deletes implemented as deactivation.
- Department names are normalized before save and checked for duplicates case-insensitively.
- `ServicePermission` is a lightweight local catalog so this service can seed only its own permission definitions without pulling auth business logic into the module layer.
- This service does not call OpenAI directly and does not require `OPENAI_API_KEY`. The current lab AI endpoint returns a `not_configured` stub; production AI work should live behind the separate AI Service described in the project docs.
