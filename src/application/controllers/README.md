# Controllers

Application controllers live here. They:

- Orchestrate a request at the application layer.
- Map between transport DTOs and domain types.
- Call services (and only services).

In this repo, **Next.js route handlers** live under `src/app/api/**` and handle HTTP concerns (zod parsing, `requireAuthenticatedApi(...)`, `NextResponse`).

Keep controllers thin and focused on translating between transport and application concerns, without importing Next.js request/response types.
