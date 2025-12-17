## 1. Overall Style

* Keep a **3-layer architecture** inspired by NestJS.

  * Presentation (React UI).
  * Application (controllers + services + models).
  * Infrastructure (repos + external clients, colocated under `src/application/infra`).

---

## 2. Layers

### 2.1 Presentation Layer (UI)

* **Responsibility**: UI only.
* **Talks to**: Application controllers via fetch/server actions.
* **No** business logic, DB, or external service calls.

---

### 2.2 Application Layer (Controllers, Services, Models)

* **Responsibility**: Validation, guards, and business logic.
* **Contents**:

  * Controllers (Next.js route handlers/server actions) handling DTOs & guards.
  * Services encapsulating workflows.
  * Models/entities shared across services.
  * Infra adapters injected into services.
* **Rules**:

  * Controllers validate input → call services.
  * Services own business rules and call `infra/` helpers for persistence/external APIs.
  * Keep services stateless; inject dependencies via arguments for easy testing.

---

### 2.3 Infrastructure Layer (within Application)

* **Responsibility**: Real data access & integrations.
* **Contents**:

  * Supabase client, repositories, and raw SQL helpers.
  * External clients: Brevo, LLM, storage, cache.
* **Rules**:

  * Exposed as functions/classes in `src/application/infra/**`.
  * No business rules; only mapping/IO.

---

## 4. Key Rules for the AI Agent

1. Keep controllers, services, models, and infra under `src/application/`.
2. Controllers handle validation/auth and delegate to services.
3. Services own business rules and only call infra helpers for persistence/integrations.
4. React components stay pure UI; they invoke controllers via server actions or fetch.
