## BaiHoc Platform

BaiHoc is an online learning and exam-prep platform that mixes quizzes, time-bound challenges, and an AI study companion. Students practice, track progress, and compare results, while staff manage content and analytics.

### Tech Stack

- **Framework**: Next.js (App Router) with TypeScript.
- **UI**: React components in `src/app`.
- **Business Logic**: Controllers/services/models under `src/application`.
- **Data/Integrations**: Supabase (database/storage), Brevo (email), plus an external LLM for AI explanations.

### Local Development

```bash
npm install
npm run dev
```

Environment variables live in `.env.example` and are validated via `src/core/env.ts`. Include a `DATABASE_URL` (Postgres/Supabase connection string).

Database setup (dev):
- After setting `DATABASE_URL`, run `npm run db:init` once to create tables from `db/schema.sql`.
- If you hit “type already exists” or similar, run with `DB_RESET=true npm run db:init` to drop and recreate the `public` schema (dev-only; this deletes data).

Useful scripts:

- `npm run lint` – Biome lint + type-aware checks.
- `npm run format` – Format with Biome.
- `npm run build` – Next.js production build.
- `npm run db:init` – Create/update tables in your Supabase/Postgres database from `db/schema.sql`.
- `npm run test:email` – Sends a real transactional email via Brevo (requires valid Brevo env vars).

### Documentation

Product specs, architecture notes, and design references are available from the maintainers on request. Reach out if you need the latest copies before making major changes.
