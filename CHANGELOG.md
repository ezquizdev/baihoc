# Changelog

## 2025-12-25

### feat(staff-dashboard): add staff overview and role redirects
- Added staff-only “Tổng quan” dashboard at `/staff/dashboard` matching the teacher mock (charts are placeholders), plus stub staff pages for sidebar navigation.
- Implemented role-based redirects for `/` and `/auth/**` (staff → `/staff/dashboard`, student → `/dashboard`) and redirect staff away from the student dashboard.
- Added staff dashboard repo/service/controller to compute overview metrics, recent activity, leaderboard, and competency distributions with per-subject XP bucket configs.

### fix(ui): match staff competency card layout
- Styled the “Điểm Năng lực Trung bình” card to match the teacher dashboard mock (top split layout + 4 subject tiles row).

### fix(ui): balance staff competency widget
- Widened the right column and reduced typography sizing in the competency block for better visual balance.

### fix(ui): stabilize staff dashboard responsive widths
- Increased the staff dashboard right-column minimum width and stacked earlier to keep the competency widget readable across screen sizes.

### fix(shell): improve dashboard navigation and profile actions
- Prevented topbar search from submitting when no handler is provided.
- Switched the dashboard page title to an `h1` for better document structure.
- Updated sidebar navigation + profile menu to use real links where possible, and added a working logout action.

### feat(dashboard): add student dashboard stub pages
- Added stub student pages for `/dashboard/history` and `/dashboard/leaderboard` so sidebar navigation routes exist.
- Wired default dashboard nav items to these new routes.

### fix(dashboard): make dashboard CTAs navigable
- Updated dashboard cards to support link-based actions (avoids dead “Xem …” buttons).
- Wired student dashboard CTA to `/quizzes` and switched staff dashboard links to `next/link` for smoother navigation.

### perf(staff-dashboard): compute competency for 4 core subjects
- Restricted staff dashboard subject competency calculations to the 4 core subjects (vi/en/math/sci) to avoid unnecessary aggregation work.

### fix(ui): align staff dashboard loading layout
- Matched the staff dashboard loading skeleton grid/breakpoints to the final layout to reduce layout shift.

### chore(db): add indexes for dashboard metrics
- Added `attempts(submitted_at)` submitted-only index and `xp_events` indexes to keep staff dashboard aggregations responsive as data grows.

### fix(shell): satisfy typed-route Link hrefs
- Updated dashboard/staff nav item href typing to align with Next.js typed routes and avoid build-time type errors.

### fix(ui): improve dashboard shell interactions
- Added consistent hover/active/focus-visible states to navigation, topbar controls, and support CTA.
- Improved topbar search focus ring and prevented scroll chaining in the sidebar.

### fix(ui): polish dashboard card CTAs
- Improved CTA affordance (hover/active/focus-visible) for the student welcome banner and card header actions.
- Added subtle leaderboard row hover highlighting for easier scanning.

### fix(ui): prevent leaderboard table overflow
- Wrapped leaderboard tables in a scroll container so narrow screens don’t clip columns.

### fix(ui): polish staff dashboard interactions
- Added focus/hover/active states for staff dashboard CTAs and section links.
- Improved numeric alignment and prevented long topic names from overflowing.

### fix(ui): add icons to profile menu
- Added icons to profile menu items and styled “Đăng xuất” as a destructive (red) action.

### feat(ui): add notifications popover shell
- Added a clickable notifications button in the topbar that opens a styled popover (placeholder content for now).

### fix(ui): disable dashboard search autofill
- Disabled browser autofill/autocorrect for the dashboard search input to avoid noisy suggestions.

### feat(shell): add dashboard feature search omnibox
- Added a suggest-as-you-type feature search dropdown on dashboards with keyboard (↑/↓/Enter/Escape) and click navigation.

### fix(dashboard): make student quick actions clickable
- Made the student dashboard quick actions render as interactive tiles; “TẤT CẢ” navigates to `/quizzes` while the rest are disabled placeholders.

### fix(build): satisfy typed routes in dashboard navigation
- Fixed TypeScript typed-route navigation for the dashboard omnibox and quick-action links so production builds pass.

### fix(shell): improve dashboard feature search UX
- Show feature suggestions on focus/typing, added `aria-activedescendant`, and prevented click blur issues in the omnibox dropdown.

### fix(shell): close profile menu on outside click
- Made the profile dropdown dismiss on outside click or Escape for more predictable topbar behavior.

### fix(shell): make profile menu links role-aware
- Pointed “Cài đặt” in the profile menu to the current dashboard’s settings route and close the menu after selection/logout.

### fix(ui): format dashboard leaderboard scores
- Formatted leaderboard score values using Vietnamese number formatting for easier scanning.

### feat(ui): add icons to staff stat cards
- Added decorative icons to the staff dashboard stat tiles for quicker visual scanning.

### fix(staff-dashboard): reuse quiz subject badge for “Chủ đề sai nhiều”
- Exposed subject slug in the staff dashboard “most wrong topic” metric and rendered it using the same SubjectBadge styling as quiz cards.

### fix(auth): redirect to dashboards after login
- When no `next` query is provided, redirect users to their role dashboard (`/dashboard` or `/staff/dashboard`) instead of `/profile` after login; profile completion now redirects to the same target.

### fix(staff-dashboard): refine stats/competency typography
- Removed the icon from the “Chủ đề sai nhiều” tile to make room for the subject badge.
- Increased emphasis for the student count + today attempts numbers, and bumped competency bucket list typography.

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
