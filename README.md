## BaiHoc Platform

BaiHoc is an online learning and exam-prep platform focused on quizzes, challenges, and an AI study companion. This repository implements the product with a layered architecture.

### Architecture

The codebase follows the structure defined in `arch.md`:

- `src/app`: Next.js App Router pages/layouts (Presentation layer).
- `src/application`: Controllers, services, models, and infra helpers.

Use `/ucspec.md` for the detailed use cases and `/arch.md` for architectural decisions.

### Getting Started

```bash
npm install
npm run dev
```

Environment variables are defined in `.env.example` and validated via `src/core/env.ts`.

### Tooling

- [`Biome`](https://biomejs.dev/) for linting/formatting (`npm run lint`, `npm run format`).
- Testing stack TBD (Vitest/Playwright) in upcoming commits.

### Contribution Guidelines

- Use conventional commits (`feat:`, `fix:`, `chore:` ...).
- Keep feature work scoped to dedicated modules.
- Update `arch.md` if architecture changes.
- Never commit real secrets; sync `.env.example` when new variables are required.
