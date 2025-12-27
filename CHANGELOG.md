# Changelog

## 2025-12-27

### feat(custom-quiz): generate private custom quizzes
- Added `POST /api/custom-quizzes` to generate paid-only custom quizzes from topic + difficulty requirements.
- Generation is atomic and links `custom_quizzes` → generated `quizzes`.

### feat(attempt): add completed attempt history API
- Added `GET /api/attempts` for submitted/auto-submitted attempts (includes custom quiz config metadata when available).
- Starting a generated custom quiz now stores `custom_quiz_id` on the attempt and blocks non-owners from starting it.

### fix(catalog): hide custom quizzes from catalog APIs
- Custom quizzes are now excluded from quiz catalog listing and return 404 from the catalog quiz detail endpoint.

### chore(test): mock db transactions in user admin unit tests
- Prevents accidental network DB connections during unit tests by mocking `withTransaction`.

### feat(staff): add preview mode to question editor
- Added `Soạn thảo / Chia đôi / Xem trước` modes for staff question editing (Markdown + LaTeX via `RichText`).
- Replaced `window.confirm` delete prompt with a themed modal and clearer busy/error states.

### feat(staff): add passage detail API
- Added `GET /api/staff/passages/[passageId]` (returns `{ passage, questions }`) and `PATCH /api/staff/passages/[passageId]` (updates `content` + `mediaUrls`).
- Added `passageService` + repo helpers to load and update passages from Postgres.

### feat(staff): add passage editor page
- Added `/staff/questions/passages/[passageId]` to edit a shared passage and all linked questions on one screen.
- Includes inline question editing, Markdown/LaTeX previews, and a themed delete confirmation modal.

## 2025-12-26

### fix(a11y): wire input labels and errors
- Inputs now render a proper `<label htmlFor>` (avoids nested labels) and generate stable IDs.
- Error/helper text is now connected via `aria-describedby`/`aria-errormessage`.

### fix(auth): revoke avatar preview URLs
- Revokes old `blob:` preview URLs when changing/removing the avatar during registration to avoid leaking object URLs.

### fix(a11y): trap focus in quiz preview modal
- Keeps keyboard focus inside the quiz preview modal and restores focus on close.
- Handles `Escape` to close the dialog without leaking the key event to the page.

### fix(catalog): force reload on refresh
- Catalog fetch now includes a `_refresh` query param so manual refreshes don't get stuck behind cached responses.

### fix(attempt): avoid history monkey-patching for leave warnings
- In-progress attempt leave confirmation now uses capture-phase link interception instead of patching `history.pushState/replaceState`.

### refactor(auth): validate auth routes and use controllers
- Auth API routes now validate payloads with `zod` and call controllers (keeps route/service boundaries consistent).
- Google OAuth userinfo verification now prefers `GOOGLE_CLIENT_ID` (falls back to `NEXT_PUBLIC_GOOGLE_CLIENT_ID`).

### fix(quiz): enforce unique question IDs
- Quiz question lists now reject duplicate question IDs and use `questionRepo` to validate question existence (keeps DB access in infra).

### chore(test): align Vitest typings
- `tsconfig.json` now includes `vitest/globals`, and unit tests use explicit domain types to satisfy TypeScript.

### chore(dev): silence negative `performance.measure` errors
- Added a dev-only client runtime init that ignores the noisy `"negative time stamp"` exception thrown by Next/React perf instrumentation during redirects.

### fix(attempt): redirect completed attempts to results on start
- `/quizzes/[quizId]/attempt` now routes straight to `/attempts/[attemptId]/results` when the resumed attempt is not `in_progress`.
- `startOrResumeAttempt` now returns the attempt `status` so the UI can redirect without an extra attempt-state fetch.
- Removed stale `CHALLENGE_ALREADY_ATTEMPTED` messaging and added clearer messages for challenge schedule/time-limit configuration errors.

### fix(staff): add profile to staff nav
- Added “Hồ sơ” to the staff sidebar nav so staff profile pages have the correct active highlight.

## 2025-12-25

### fix(staff): preserve quiz builder state on question save
- Prevented the quiz builder from wiping unsaved question selections when a question is edited and saved.
- Reset builder state cleanly when switching between quizzes.

### fix(a11y): localize quiz builder drag announcements
- Localized drag-and-drop screen reader announcements and removed internal IDs from the live region output.

### fix(staff): stabilize quiz builder hook order
- Fixed a client-side crash when opening the quiz builder by ensuring all hooks run unconditionally.

### chore(lint): fix quiz builder biome warnings
- Tweaked quiz builder hooks/utilities to satisfy Biome lint rules.

### fix(build): type quiz builder drag announcements
- Added explicit typing for dnd-kit accessibility callbacks to satisfy TypeScript strict mode.

### refactor(staff): remove preview action from question modal
- Removed the “Xem trước” button from the staff question edit modal inside the quiz builder flow.

### refactor(staff): hide quiz archive UI
- Removed archive/restore buttons and archived visual indicators from staff quiz cards and filters.
- Replaced the staff-only bookmark control with a draft status chip.

### refactor(challenge): remove challenge rules
- Removed the `challenge_settings.rules` column and the staff UI/API field.

### refactor(quiz): remove thumbnail support
- Removed `thumbnail_url` from the quizzes table and seed data.
- Removed thumbnail fields from staff quiz APIs and UI.

### fix(ui): polish staff quiz cards
- Centered and stabilized the action button row (prevents awkward wrapping).
- Matched quiz/challenge visual styling with the quiz catalog card tone and decorations.
- Moved time to the meta section and relied on card styling to indicate quiz vs challenge.

### fix(build): resolve TypeScript build errors
- Fixed question payload validator types to allow `null` for `options`/`shortAnswers` in PATCH updates.
- Fixed a React effect cleanup to return `void` (not the boolean result of `delete`).

### chore(deps): add dnd-kit for sortable drag
- Added `@dnd-kit/*` dependencies to support drag-to-reorder in staff quiz builder.

### feat(staff): drag to reorder quiz questions
- Added handle-based drag-and-drop reordering (with keyboard support) in the quiz builder question list.
- Prevented Escape during an active drag from closing the quiz builder modal.

### fix(ui): prevent stale multi-select toggles
- Fixed MCQ multi-select so rapid clicks no longer lose selections due to stale state.

### fix(question): allow clearing options/short answers
- Staff question updates can explicitly clear `options` / `shortAnswers` (via `null`) while still preventing invalid question states.

### perf(attempt): reduce autosave question meta lookup
- Autosave now fetches question type metadata only for the questions being saved, instead of loading metadata for the whole quiz each time.

### fix(challenge): redirect to existing attempt when already done
- Starting a challenge that you already submitted now returns the existing attempt id (no conflict error), so the UI can route users to their previous attempt/results.

### fix(attempt): block results before submission
- Results page no longer renders for in-progress attempts; users are guided back to the attempt screen.

### chore(db): add attempt event index and challenge schedule check
- Added an index for `attempt_answer_events` by `(attempt_id, created_at)` and a DB constraint ensuring `challenge_settings.end_at > start_at`.

### fix(ui): group attempt action buttons
- Adjusted attempt action layout so “Nộp bài” stays on the left, while “Đánh dấu” + “Câu tiếp” stay grouped on the right (and stack cleanly on small screens).

### fix(ui): show message when MCQ has no options
- When an MCQ question has no options (data issue), the attempt screen now shows a clear in-page warning instead of rendering an empty area.

### fix(question): validate updates for type/options
- Hardened question update validation to prevent creating invalid states when changing question type (e.g. switching to MCQ without providing options).

### chore(seed): ensure demo challenge is active
- Seed now always creates a “Demo Challenge” quiz whose schedule is active (start = now-1 day, end = now+7 days) so challenge attempt flow can be tested reliably.

### perf(ui): start attempts via server redirect
- Starting a quiz from the catalog now creates/resumes the attempt server-side and redirects straight to `/attempts/[attemptId]` (less client-side waiting).
- Added a minimal route `loading.tsx` spinner for `/quizzes/[quizId]/attempt`.

### perf(attempt): include quiz title in attempt state
- `controllerGetAttemptState` now returns `quizTitle` from the attempt state query so attempt/results pages avoid an extra quiz fetch.

### perf(ui): polish quiz attempt screen
- Isolated the ticking timer into a small subcomponent so the full attempt UI doesn't re-render every second.
- Tweaked MCQ option/navigator hover colors and added focus-visible outlines for keyboard users.
- Added a leave-attempt warning for in-progress attempts (covers in-app navigations and refresh/close).

### chore(seed): refine passage question copy
- Adjusted seeded passage text to avoid duplicating the UI heading and use "thông tin chung" wording.

### feat(ui): render markdown + math in quiz content
- Added a `RichText` renderer (Markdown + LaTeX-like via KaTeX) and used it for question passages/stems/options and short answers on attempt + results pages.
- Added a basic unit test to ensure markdown + KaTeX rendering works.

### chore(seed): add markdown + math examples
- Updated seed question/passage text to include Markdown formatting and LaTeX-like formulas for easy visual verification.

### chore(dev): ignore Playwright dev artifacts
- Ignored `.playwright-dev.*` files so local UI testing doesn’t dirty `git status`.

### fix(catalog): fix quiz search SQL placeholders
- Fixed placeholder substitution so search filters like `(title ILIKE ... OR description ILIKE ...)` no longer produce invalid SQL.

### fix(ui): hide search on attempt screens
- Hid the dashboard search bar on attempt start/attempt/results pages since it doesn’t apply there.

### fix(ui): improve attempt accessibility
- Added focus trapping + ARIA labelling for attempt modals.
- Improved screen-reader labels for the question navigator (answered/flagged/current state).

### fix(attempt): enforce challenge schedule window
- Prevented starting new challenge attempts outside `challenge_settings.start_at/end_at` (resuming an in-progress attempt is still allowed).

### fix(attempt): prevent autosave after submission
- Guarded autosave writes with an attempt row lock to avoid autosaves overwriting graded answers after submit (multi-tab safety).

### fix(ui): make attempt autosave more reliable
- Serialized per-question autosave requests to avoid out-of-order overwrites during rapid answering/typing.
- Stabilized the “Đang lưu...” indicator for concurrent saves and handled 409 already-submitted autosaves by showing the success modal.

### fix(ui): prevent attempt modal overlap after submit/expiry
- Ensured auto-submit closes the confirmation modal (no double-modal overlap at the deadline).
- Disabled attempt navigation/actions once an attempt is no longer in progress.

### chore(format): biome
- Applied Biome formatting fixes to keep `npm run lint` passing.

### chore(seed): diversify question variants
- Seeded `mcq_single`, `mcq_multi`, and `short_answer` questions (including passage groups) with proper `question_options` / `short_answer_keys`.
- Added a demo quiz that includes all question types for quick UI verification.

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

### feat(staff): add manage quiz filters and grid
- Added manage quiz filter controls and staff quiz grid/card building blocks.

### feat(staff): add manage quiz modals
- Added quiz info, quiz builder, and question edit modals for staff quiz management.

### feat(staff): add manage quiz screen hydration
- Added the staff manage quiz screen with full-dataset hydration, client-side filtering, and pagination.

### feat(staff): add staff quizzes page
- Added the staff-only `/staff/quizzes` page with initial server preload and auth guard.

### chore(changelog): log staff manage quiz commits
- Logged the above staff manage quiz UI commits.

### fix(staff): add staff nav items to manage quiz
- Added staff dashboard navigation items to the manage quiz screen.

### fix(staff): make manage quiz modals scrollable
- Kept manage quiz modal actions visible by making dialog bodies scroll within the viewport.

### fix(staff): localize manage quiz visibility labels
- Localized quiz visibility labels to Vietnamese (Miễn phí/VIP) in manage quiz modals.

### chore(changelog): log manage quiz polish commits
- Logged the manage quiz polish commits.

### fix(attempt): create challenge attempts safely
- Avoided `ON CONFLICT` against a deferrable unique constraint by retrying on unique-violation and returning the existing attempt.

### fix(db): compute search_vector on insert
- Fixed quiz/question inserts to build `search_vector` from the inserted title/stem + description/explanation values.

### fix(db): fix dynamic SQL placeholder replacement
- Replaced single-use `.replace()` with `.replaceAll()` so SQL fragments with multiple `$idx` placeholders work correctly.

### feat(staff): add question bank + quiz builder picker
- Added staff `/staff/questions` question bank page with table UX and full CRUD flows.
- Added question-bank picker modal for quickly adding questions inside the quiz builder.

### fix(question): preserve null-clearing semantics on update
- Allowed PATCH payloads to pass `null` through for `options`, `shortAnswers`, and `passage` so staff editors can clear/replace related rows safely.
- Added unit coverage for update null-handling.

### fix(staff): prevent duplicate MCQ option positions
- Ensured the question editor assigns a unique `position` when adding new MCQ options after deletions.

### fix(staff): remove hard caps from quiz range filters
- Made quiz duration/question range filters adapt to the actual dataset so large quizzes are not hidden by default.

### fix(ui): make nested modal escape close top-most
- Prevented the quiz builder from closing when pressing Escape inside the question-bank picker modal.

### fix(security): add noopener to staff blank links
- Added `rel=\"noopener noreferrer\"` to staff links that open in a new tab.

### feat(staff): expose all quiz/challenge fields in UI
- Extended the staff quiz info modal to edit `thumbnailUrl`, `featuredRank`, and `challenge.rules` (JSON).

### chore(format): biome
- Applied Biome formatting fixes.

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

### fix(ui): render staff dashboard scaffolding during load
- Updated staff dashboard fallbacks so titles/labels/icons render immediately; only values and rows use skeletons while data streams in.

### chore(db): add indexes for dashboard metrics
- Added `attempts(submitted_at)` submitted-only index and `xp_events` indexes to keep staff dashboard aggregations responsive as data grows.

### feat(profile): add full profile pages (self + staff view)
- Replaced the minimal `/profile` with a dashboard-styled profile page that supports viewing and editing name/school/DOB/avatar.
- Added staff-only `/profile/[userId]` for viewing another user’s profile (students get 404 unless it’s their own ID).

### feat(leaderboard): link staff leaderboard to profiles
- Made staff dashboard leaderboard names link to `/profile/[userId]` for quick profile inspection.

### fix(leaderboard): allow dynamic profile links
- Relaxed leaderboard row link typing so dynamic `/profile/${userId}` hrefs compile under Next.js typed routes.

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

### fix(shell): show “Enter” hint only for active suggestion
- Hid the “Enter” hint pill for non-active items in the dashboard feature search dropdown.

### fix(shell): refresh sidebar brand and nav contrast
- Switched sidebar brand to a larger blue logo mark (icon-only) and removed the subtitle for a cleaner header.
- Increased sidebar nav label contrast and active-state emphasis.

### fix(staff-dashboard): stream sections with skeletons
- Staff dashboard now renders static layout immediately and streams each data section independently with skeleton loading placeholders.
- Updated the “Chủ đề sai nhiều” subject badge to render as text-only (no icon) to save space.

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
