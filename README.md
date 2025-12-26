## BaiHoc Platform

BaiHoc is an online learning and exam-prep platform that mixes quizzes, time-bound challenges, and an AI study companion. Students practice, track progress, and compare results, while staff manage content and analytics.

### Documentation

- Database schema: `db/schema.sql`
- Application layering: `src/application/README.md`
- Changelog: `CHANGELOG.md`

### Tech Stack

- **Framework**: Next.js (App Router) with TypeScript.
- **UI**: React components in `src/app` and `src/components`.
- **Business Logic**: `src/application` (controllers/services/models/infra).
- **Database**: Postgres via `pg` (`DATABASE_URL`) (works with Supabase-hosted Postgres).
- **Storage**: Supabase Storage (bucket `avatars`) for avatar uploads.
- **Email**: Brevo (verification + password reset).
- **Auth**: custom users table + JWT session cookie (not Supabase Auth).
- **Optional**: Google OAuth (GIS) and an LLM API key (no AI features wired yet).

### Local Development

```bash
npm install
```

Create an env file:

```bash
cp .env.example .env.local
```

Environment variables are validated via `src/core/env.ts` (most are required for the app to boot).

Database setup (dev):

```bash
npm run db:init
npm run db:seed
```

Start the app:

```bash
npm run dev
```

Seeded login credentials:
- `staff@baihoc.dev` / `Password123!`
- `student.1@baihoc.dev` / `Password123!`

Notes:
- If you hit “type already exists” or similar during DB init, run `DB_RESET=true npm run db:init` to drop and recreate the `public` schema (dev-only; deletes data).
- Supabase storage: create a bucket named `avatars` and set it to public if you want avatars to render via public URLs.
- Auth flows send real emails via Brevo when triggered; use a real/test Brevo key or be prepared for email actions to fail.

Useful scripts:

- `npm run lint` – Biome checks.
- `npm run format` – Format with Biome.
- `npm run build` – Next.js production build.
- `npm run db:init` – Apply `db/schema.sql`.
- `npm run db:seed` – Seed dev data.
- `npm test` – Run unit tests (Vitest).
- `npm run test:email` – Sends a real transactional email via Brevo.
