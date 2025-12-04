# Changelog

## 2025-12-25

### feat(ui): add attempt loading states
- Added route-level loading UIs for attempt + results pages so navigation shows a clear spinner while server data loads.

### feat(ui): redirect quiz catalog start to attempt-prep screen
- Changed “Làm bài/Thử thách” CTA to navigate immediately to `/quizzes/[quizId]/attempt`, then create/resume the attempt there with a clear loading state.

### fix(ui): improve attempt hover colors
- Fixed hover states so selected MCQ options and the active question navigator button keep their highlight colors.
- Added consistent hover feedback for attempt action + modal buttons.

### fix(ui): prevent accidental success modal dismissal
- Disabled Escape/backdrop dismissal for the submit success modal so users aren’t navigated away unintentionally.

### fix(ui): show friendly attempt load errors
- Rendered in-page error cards for attempt and results pages (with retry + back-to-quizzes links) instead of falling into a generic Next.js error boundary.

### fix(ui): add attempt tablet breakpoint
- Added a dedicated `max-width: 760px` layout for the attempt header so the timer, title, and status pills wrap cleanly.

### feat(ui): add quiz attempt screen
- Wired quiz catalog CTA to start/resume an attempt and navigate to `/attempts/[attemptId]`.
- Added attempt-taking UI (timer, question navigator, autosave, submit confirm/success modals) and a minimal results page at `/attempts/[attemptId]/results`.
- Added a 5-second submit grace window to tolerate network latency at the deadline.

### feat(attempt): add attempt domain models
- Added attempt status + attempt question/answer domain types.

### feat(attempt): add attempt repositories
- Implemented attempt DB repository for start/resume, state queries, autosave, submit writes, and grading data fetch.
- Added XP insert helper used during attempt submission.

### feat(attempt): implement attempt service and controller
- Added attempt service with timer enforcement, server-side grading, and XP awarding on submit.
- Added controller wrappers for attempt lifecycle endpoints.

### feat(api): add attempt start/autosave/submit routes
- Added authenticated attempt APIs under `/api/attempts` for start, state fetch, autosave, and submit.

### test(attempt): add attempt service coverage
- Added unit coverage for start/resume, autosave expiry rules, submit grading, and double-submit protection.

### chore(seed): set challenge_id on seeded attempts
- Populated `attempts.challenge_id` for challenge quizzes to exercise once-per-user constraints in dev seed data.

### docs(changelog): log attempt engine backend
- Recorded the attempt engine backend changes.

## 2025-12-24

### fix(ui): center catalog state cards
- Centered catalog empty/error cards within the quiz grid column (with proper spacing from filters and leaderboard).

### fix(ui): align modal right section on mobile
- Switched the modal right-side block (difficulty + meta) to a side-by-side layout on small screens.

### fix(ui): center modal topic counts on mobile
- Centered the per-topic question count text within the remaining row space on small screens.

### fix(ui): center catalog loading overlay
- Switched quiz catalog loading state to an overlay so it stays centered without shifting the grid layout.

### fix(ui): show pagination for single page
- Kept catalog pagination visible even when there is only 1 page (with prev/next disabled).

### fix(ui): add non-shifting card hover
- Added a hover lift/shadow effect for quiz cards using transform to avoid layout reflow.

### fix(ui): make quiz cards open preview
- Made the entire quiz card clickable to open the quick-view modal; CTA now triggers a placeholder start action.

### fix(ui): remove challenge CTA arrows
- Removed decorative arrow glyphs from the challenge quiz card CTA button.

### fix(ui): color quiz cards by type
- Updated quiz catalog cards to use yellow styling for challenge quizzes and blue styling for normal quizzes.

### feat(user-admin): staff user management + allowlist backend
- Added staff-only user admin APIs under `/api/staff/users/**` and `/api/staff/allowlist` with role/tier allowlist entries.
- Added user admin services/controllers and audit logging for role/tier/status updates, email verification overrides, and reset triggers.
- Allowlist audits store email in metadata (target_id null).

### feat(auth): allowlist-aware signup role/tier
- Registration checks `course_student_allowlist` for role/tier, auto-verifies allowlisted signups, and records membership history for paid tier.
- `/api/auth/register` now returns the created user status.

### chore(db): extend allowlist table
- Added `role` and `tier` columns to `course_student_allowlist` with defaults.

### fix(repo): restore checks and typings
- Updated Next.js route handler params typing and wrapped email verification in Suspense for build stability.
- Tightened quiz/question/auth typing (difficulty, challenge, repo return types) and added missing pg/bcryptjs type deps.
- Resolved Biome/a11y issues across catalog/dashboard UI and aligned tests/mocks with current enums and email mapping.

### feat(api): add quiz subject breakdown endpoint
- Added quiz subject breakdown aggregation in repo/service/controller layers.
- Exposed `/api/catalog/quizzes/[quizId]/subjects` for per-quiz subject counts.

### fix(ui): adjust catalog filter wrap and badges
- Forced filter row to wrap below tabs earlier to prevent overlap at tight widths.
- Reduced subject dropdown option size and allowed subject badges to wrap to two lines.
- Extended the wrap breakpoint so filters no longer overlap the tabs on wide screens.

### fix(ui): align quiz catalog filter groups
- Kept status tabs left-aligned without stretching full width.
- Right-aligned filter controls and enabled clean wrapping with 1-per-row on small screens.
- Switched filter wrapping to explicit 1-row/2-row/2x2/1-column layouts to avoid 3+1 rows.
- Standardized filter dropdown widths/heights and moved wrap breakpoint earlier to prevent overlap.
- Let flex wrapping + min-width drive row breaks and reduced breakpoint usage for filter layout.
- Allowed topbar search to expand to all remaining horizontal space.
- Hid profile name on small screens (kept search in the topbar row).
- Increased quiz subject badge max width to 110px for better wrapping.
- Updated subject and difficulty badge labels/colors/icons to match the new spec (incl. “Tổng hợp” yellow-on-black).
- Adjusted subject badge radius and reduced difficulty badge size to 48px.

## 2025-12-20

### feat(ui): refresh quiz card layout
- Rebuilt quiz cards to match the legacy layout with tone backgrounds, date pill, stacked info, and internal CTA.
- Added reusable difficulty and subject badge components and swapped to phosphor-react icons.

### feat(ui): align filters and pagination styles
- Updated filter dropdown sizing, checkbox styling, and slider layering to match catalog v10.
- Aligned pagination layout and responsive breakpoints with the updated mock.

### feat(ui): add quiz quick-view modal
- Added the quiz quick-view modal layout and styling to match catalog v10.
- Wired quiz cards to open the modal with current quiz data.

### fix(ui): align filter dropdown labels
- Adjusted dropdown label alignment to better match the v10 reference layout.

### fix(ui): catalog dropdowns and badges
- Allowed dropdown panels to render outside the filter container.
- Updated difficulty badges to render as N★ and improved mobile filter stacking.

### fix(ui): catalog multi-subject and layout polish
- Added subject breakdown metadata for multi-subject quizzes and updated modal rendering.
- Adjusted card decorations, bookmark icon styling, filter active states, and leaderboard stacking.

### chore(db): add seed script
- Added a database seed script to populate quizzes, subjects, questions, attempts, and XP for catalog testing.
- Added `db:seed` npm script for convenience.

### chore(db): speed up seed script
- Limited seed subjects to vi/en/sci/math and added multi-subject quiz coverage.
- Batched inserts and removed per-row hashing to make seeding faster.

### feat(quiz): derive subject/topic and numeric difficulty
- Removed quiz ratings and switched quiz/question difficulty to numeric 1–5 with UI label mapping.
- Derived quiz subjects/topics from question data and updated catalog API/UI to match.

### chore(db): update seed for passage groups
- Seed now generates question topics, passage groups with ordered positions, and numeric difficulty levels.

### docs: update quiz model notes
- Updated WIP notes to reflect derived subject/topic rules, numeric difficulty, and passage grouping.

### fix(api): parse numeric difficulty
- Catalog API now parses numeric `difficultyLevels` params and forwards validated values.

### feat(ui): build quiz catalog page
- Added the `/quizzes` page with dashboard shell integration, filters, quiz grid, leaderboard, and pagination states.
- Wired search input to catalog filters and added responsive catalog layout.

### feat(api): expand catalog endpoints
- Added catalog endpoints for quizzes (paged with totals), subjects, and leaderboard.
- Extended query parsing helpers for multi-select and range filters.

### feat(catalog): add controllers and services
- Added subject/leaderboard services and controllers alongside catalog page controller.
- Added minute-to-second conversion in quiz catalog service layer.

### feat(catalog): add infra queries
- Added catalog query returning totals, subject info, and attempt counts with status/sort filters.
- Added subject and leaderboard repositories plus new domain models.

### docs(catalog): add design notes
- Documented quiz catalog flows, filters, API shapes, and UI expectations in WIP notes.

### fix(dashboard): placeholder nav items
- Replaced sidebar and profile menu links with placeholder anchors to avoid typed-routes errors before routes exist.
- Added no-op click handler for placeholder links while keeping existing styles.

## 2025-12-18

### feat(db): add quiz & question repositories
- Added transaction helper to `pg` pool for safe multi-step writes.
- Implemented quiz/question repositories with topic/challenge handling, search vectors, and catalog/staff listing helpers.

### feat(quiz): add domain services
- Added quiz services for create/update/publish/archive flows with challenge validation and question ordering support.
- Added question services with MCQ/short-answer validation, passage handling, and repository orchestration.

### feat(api): expose quiz & question routes
- Added controllers and Next.js API endpoints for staff quiz/question CRUD, publishing/archiving, and question ordering.
- Added catalog endpoints for authenticated users to list and view published quizzes with filters and validation via zod.

### fix(quiz): align flow guardrails
- Catalog listing now supports min/max question filters and returns question counts.
- Staff can hard-delete quizzes only when no attempts exist; otherwise archive.
- Staff question delete now hard-deletes only when unused, otherwise archives.

### refactor(api): shared enums & query parsing
- Centralized quiz/question enums and value lists for zod schemas and services.
- Added reusable query parsing helpers for pagination and filters across API routes.
- Delete guards now surface structured codes for quiz/question deletes to support better UI messaging.

### chore(tests): fix lint regressions
- Cleaned up mock types and helpers in auth and middleware tests to satisfy Biome lint rules.

### feat(auth): add route-level guards
- Introduced reusable `requireAuthenticatedPage`/`requireAuthenticatedApi` guards to handle login/profile/role gating per route.
- Updated core pages to use the new guards and simplified middleware to stop path-based protection.
- Protected profile completion API with the new auth guard.

### test(auth): add unit coverage
- Added Vitest-based unit tests for auth service flows (register, login status gating, email verify, reset, Google login status) with mocks for DB, email, and storage.
- Added guard and middleware unit tests for key redirect/authorization paths.
- Mocked email test to avoid sending real emails while still validating payload formatting.

## 2025-02-14

### chore: make db init resilient
- Wrapped enum creation in guards and added `DB_RESET=true` option to drop/recreate the schema when running `db:init` (dev only). Documented in README/env example.

### feat: backend auth services and routes
- Added auth services for email registration/login, email verification, password reset, Google OAuth upsert + profile completion, and transactional emails. New Next.js API routes under `/api/auth/**`. Updated env and schema to support OAuth fields.

### feat: add Brevo email service and test
- Implemented Brevo-based transactional email helper with sender env vars, added `vitest` setup, and created `npm run test:email` to send a verification email to `huytrinhm@gmail.com`.

### fix: ensure citext extension
- Updated `db/schema.sql` to enable the `citext` extension before creating tables so Supabase init succeeds.

### chore: simplify db init flow
- Removed automatic predev DB init; added `pg`/`dotenv` dependencies and clarified manual `npm run db:init` after setting `DATABASE_URL`. Devs can drop and re-init DB if schema changes.

### chore: auto-init database on dev start
- Added `db/schema.sql`, a `scripts/db/init.js` bootstrap, and `npm run db:init` hooked into `predev` to auto-create tables when a `DATABASE_URL` is provided. Updated docs/env example accordingly.

### docs: remove agent references from README
- Reworded the README documentation section so it speaks only to human contributors and doesn’t mention internal agent resources.

### chore: keep agent guide at root
- Restored `AGENTS.md` to the repository root (while keeping it git-ignored) so the latest instructions are easy to find locally.

### chore: move docs to agent resources
- Moved `AGENTS.md`, `arch.md`, and `ucspec.md` into the git-ignored `/agent-resources` folder and refreshed the public README to focus on human contributors.

### chore: document agent resources and changelog
- Added `/agent-resources` guidance to AGENTS.md, ensured the directory stays git-ignored, and introduced `CHANGELOG.md` for tracking commits.

### chore: remove template assets and fonts
- Removed create-next-app imagery and favicon, switched to system font stacks, and set BaiHoc-branded landing placeholder.

### chore: scaffold BaiHoc architecture
- Documented architecture expectations, added env/config/logging scaffolding, and initialized application directories per Nest-style layering.
