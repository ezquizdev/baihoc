# Application Layer

All non-UI logic lives here, inspired by a controller/service layering (similar to NestJS), adapted for Next.js:

- `controllers/`: application controllers (request orchestration + DTO mapping) called from Next.js route handlers and server components.
- `services/`: business logic orchestrators; stateless and testable.
- `models/`: domain entities/value objects shared by services and controllers.
- `infra/`: I/O only (Postgres repos, auth/session helpers, Supabase Storage, Brevo).

Notes:
- Next.js route handlers live in `src/app/api/**` and are responsible for transport concerns (parsing/validation, auth guards, JSON responses).
- Controllers may only call services. Services encapsulate business rules and talk to infra helpers when persistence or external I/O is needed.
