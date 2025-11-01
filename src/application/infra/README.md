# Infrastructure Helpers

All data access and external integrations live inside `src/application/infra`.

- Supabase repositories (users, quizzes, attempts...).
- Email provider wrappers (Brevo).
- LLM connectors for AI companion features.

Infra files should expose lightweight helpers consumed by services. Do not embed business rules here.
