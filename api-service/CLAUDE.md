# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development (hot reload via tsx watch)
npm run dev

# Type-check
npx tsc --noEmit

# Compile to dist/
npm run build

# Run compiled output
npm start

# Start PostgreSQL and Redis (from parent directory: ../booking_system/)
docker-compose up -d
```

Copy `.env.example` to `.env` before running locally.

## Architecture

Layered architecture: **server → app → routes → controller → service → repository → database**

```
src/
├── server.ts          # Entry point: loads env, inits DB, starts HTTP server
├── app.ts             # Express app setup and route mounting
├── config/
│   └── database.ts    # TypeORM DataSource (reads from env vars)
├── entities/
│   └── booking.entity.ts
├── routes/
│   └── booking.routes.ts
├── controllers/
│   └── booking.controller.ts
├── services/
│   └── booking.service.ts
└── repositories/
    └── booking.repository.ts
```

- `server.ts` is the only file that calls `AppDataSource.initialize()` — all other layers import the DataSource directly and rely on it already being initialized.
- All files use `kebab-case.type.ts` naming (e.g. `booking.entity.ts`, `booking.service.ts`).
- DB credentials come from env vars with fallback defaults for local dev (see `.env.example`).
- `synchronize: true` is enabled only when `NODE_ENV !== "production"`.
- `logging` is enabled only when `NODE_ENV === "development"`.
- TypeORM decorators require `experimentalDecorators`, `emitDecoratorMetadata`, and `useDefineForClassFields: false` in tsconfig — all set.
