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

## Scripts

- `npm run dev` starts the service with hot reload
- `npm run build` compiles TypeScript
- `npm run start` runs the compiled build
- `npm test` runs all tests
- `npm run test:unit` runs unit tests only
- `npm run test:integration` runs integration tests only
- `npm run prisma:generate` generates Prisma client
- `npm run prisma:migrate` creates/applies local migrations
- `npm run seed` seeds department permission definitions

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
- `GET /api/docs`
- `GET /api/docs.json`
- `POST /api/departments`
- `GET /api/departments`
- `GET /api/departments/:id`
- `PATCH /api/departments/:id`
- `DELETE /api/departments/:id`

## Notes

- Deletes are soft deletes implemented as deactivation.
- Department names are normalized before save and checked for duplicates case-insensitively.
- `ServicePermission` is a lightweight local catalog so this service can seed only its own permission definitions without pulling auth business logic into the module layer.
