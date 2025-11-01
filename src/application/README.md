# Application Layer

All non-UI logic lives here, inspired by the NestJS structure:

- `controllers/`: route handlers responsible for validation, guards, and translating HTTP ↔ DTOs.
- `services/`: business logic orchestrators; stateless and testable.
- `models/`: domain entities/value objects shared by services and controllers.
- `infra/`: integrations such as Supabase repos, Brevo email client, and LLM adapters exposed as service dependencies.

Controllers may only call services. Services encapsulate all business rules and talk to infra abstractions when persistence or external I/O is needed.
