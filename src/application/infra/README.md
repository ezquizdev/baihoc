# Infrastructure Helpers

All data access and external integrations live inside `src/application/infra`.

- Postgres repos (SQL) via `pg` (`infra/db/**`).
- Email provider wrappers (Brevo).
- Auth/session cookie + guards.
- Storage client (Supabase Storage) for avatar uploads.

Infra files should expose lightweight helpers consumed by services. Do not embed business rules here.
