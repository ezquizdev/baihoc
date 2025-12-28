# Changelog

## 2025-12-28

### feat(staff): improve passage editor + type-first question creation
- `/staff/questions/new` now starts with a question-type picker (MCQ 1, MCQ multi, short-answer, passage).
- Passage create flow now supports drafting the passage + first question, then continues in the passage editor UI.
- `/staff/questions/passages/[passageId]` now supports adding new questions inline and deleting the whole passage group from one screen.
- Added `DELETE /api/staff/passages/[passageId]` with guards for in-progress attempts and quiz usage.

### feat(staff): paste images into question markdown (Supabase upload)
- Staff question + passage editors now support pasting images (Ctrl/Cmd+V) to auto-upload to Supabase Storage and insert markdown image syntax.
- Added `POST /api/staff/media/images` (multipart upload, returns `{ url }`).
- `RichText` now renders markdown images (responsive styling).
- Staff quiz builder modals now render question stems via `RichText` so pasted images display while building quizzes.
- Suppressed Biome `noImgElement` warning locally in `RichText` (markdown images are dynamic).
- Removed legacy passage `mediaUrls` and dropped `passages.media_urls` (images are embedded in markdown `content` now).

### feat(staff): add excel-like sort/filter to question bank
- `/staff/questions` now supports sorting/filtering via table headers (subject/type/difficulty/status) and removes the standalone filter bar.
- `GET /api/staff/questions` now accepts `subjectIds`, `difficultyLevels`, `types`, `statuses`, `sortBy`, and `sortDir`.

### fix(leaderboard): cap searched user rank totals
- Leaderboard search now uses the same 300-cap + ranking logic as the main leaderboard table.

### chore(test): update repo mocks for new exports
- Updated unit test mocks for attempt/question repos after adding in-progress locking and IRT stats lookups.

## 2025-12-27

### chore(logging): remove unused logger
- Removed unused `src/lib/logger.ts`.

### refactor(auth): centralize next redirect sanitization
- Centralized duplicated `next` query validation into `src/lib/urls.ts` and reused it in login/profile-complete/logout.

### fix(auth): strip unknown fields in auth APIs
- Auth API payload schemas no longer use `.passthrough()`; unknown fields are stripped by default.

### feat(ui): add global error and not-found pages
- Added `src/app/error.tsx` and `src/app/not-found.tsx` for a clearer production UX on failures/404s.

### fix(a11y): set document language to Vietnamese
- Updated `<html lang>` to `vi` to better match the Vietnamese UI.

### fix(auth): pin session JWT algorithm to HS256
- JWT verification now explicitly allows only `HS256` when reading the session cookie.

### fix(staff): validate challenge schedule timestamps
- Staff quiz APIs now validate `challenge.startAt/endAt` as ISO datetimes and reject invalid/illogical schedules.

### fix(next): derive server actions allowed origins from app URL
- `experimental.serverActions.allowedOrigins` now derives from `NEXT_PUBLIC_APP_URL` instead of being hard-coded to localhost.

### fix(security): guard server-only modules from client imports
- Added runtime checks to prevent importing env/session/db/email/storage modules from Client Components.

### chore: biome format
- Applied Biome auto-formatting.

### feat(profile): refresh profile UI
- Redesigned `/profile` to match the dashboard-style layout (profile card + stats + score summary + AI placeholder).
- Improved edit flow: click avatar to upload/clear; added a “Bảo mật” tab in the profile card.

### feat(profile): allow viewing student profiles
- Students can view other students at `/profile/[userId]` (read-only; no edit controls; no AI card).
- Leaderboard names now link to profile pages.

### feat(profile): simplify staff profile settings
- Staff `/profile` is now a compact settings view (change name + password only), without student stats/score panels.

### feat(auth): add password change endpoint
- Added `POST /api/auth/password/change` with current-password verification (and supports setting a password for accounts without one).

### feat(custom-quiz): generate private custom quizzes
- Added `POST /api/custom-quizzes` to generate paid-only custom quizzes from topic + difficulty requirements.
- Generation is atomic and links `custom_quizzes` → generated `quizzes`.

### feat(attempt): add completed attempt history API
- Added `GET /api/attempts` for submitted/auto-submitted attempts (includes custom quiz config metadata when available).
- Starting a generated custom quiz now stores `custom_quiz_id` on the attempt and blocks non-owners from starting it.

### feat(history): show in-progress attempt
- `/dashboard/history` now shows the current `in_progress` attempt (if any) with a “Tiếp tục” action.
- `GET /api/attempts` now includes `activeAttempt` so the client can surface the running quiz.

### fix(attempt): enforce single running attempt
- Users can only have **one** `in_progress` attempt at a time; starting a different quiz now returns 409 and prompts the user to finish the running attempt first.
- When starting a quiz, any other timed/challenge attempts that should have ended are auto-submitted at their expected end time.

### fix(quiz): block delete while attempts in progress
- Staff hard-delete now returns 409 when any attempt is `in_progress` (archive remains allowed).
- Deleting a quiz with completed attempts now backfills snapshot metadata and `attempt_question_snapshots` so history/results stay viewable after quiz deletion.

### fix(quiz): block content edits while attempts in progress
- Staff can no longer edit quiz meta/questions (or edit questions/passages used by those quizzes) while any attempt is `in_progress` (returns 409).

### perf(attempt): snapshot-first history and redo gating
- Attempt history listing now reads from `attempts.snapshot_*` (avoids quiz joins and heavy per-request subject-score recomputation).
- History entries now include `canRedo` so students can’t redo archived quizzes (but can still view results/history).

### fix(auth): restrict attempt flow to students
- Staff can no longer start/autosave/submit attempts via `/api/attempts/**`.
- Attempt-taking and results pages now redirect staff to `/staff/dashboard`.

### fix(custom-quiz): align duration and validate difficulty
- `POST /api/custom-quizzes` now accepts `durationSeconds=0` (treated as no time limit).
- Custom quiz generation now validates `difficulty` defensively in the service layer.

### feat(catalog): add custom quiz generator modal
- Added a “Tạo quiz tuỳ chỉnh” modal on `/quizzes` to generate premium custom quizzes by topic.
- Added `GET /api/catalog/topics` to power topic pickers in the modal.
- Custom quiz generation now accepts an optional title and uses it for the generated quiz.

### perf(attempt): speed up attempt meta and history queries
- Attempt meta lookup now uses a single lateral join for custom quiz ownership (less duplicated SQL work).
- Added a partial index for completed attempt history listing by user.

### chore: biome format
- Applied Biome auto-fixes.

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

### fix(staff): route passage questions to passage editor
- Passage questions in `/staff/questions` now link to the passage editor instead of the single-question editor.
- Visiting `/staff/questions/[questionId]` for a passage question now redirects to `/staff/questions/passages/[passageId]`.

### fix(staff): redirect passage question saves to passage editor
- Saving a question with a passage now routes to `/staff/questions/passages/[passageId]` to avoid duplicating passages on repeated saves.
- Save is now disabled when passage content/position is invalid.

### fix(staff): require mediaUrls for passage updates
- `PATCH /api/staff/passages/[passageId]` now requires `mediaUrls` (avoids accidental clearing when omitted).
- Passage `mediaUrls` are trimmed server-side.

### fix(staff): refresh passage editor after question delete
- After deleting a question inside the passage editor, the page now refreshes passage/question data from the server.
- If the passage disappears (last question deleted), the UI routes back to `/staff/questions`.

### fix(a11y): improve staff editor controls
- View-mode toggles now use semantic toggle groups (`<fieldset>` + `aria-pressed`) instead of ARIA tab roles.
- Passage delete modal now includes `aria-labelledby`/`aria-describedby`.

### chore(db): narrow passage selects
- Passage read/update queries now select explicit columns instead of `SELECT *` / `RETURNING *`.

### fix(profile): clear avatar persists null
- Clearing an avatar now stores `NULL` (instead of an empty string) so the UI falls back to the default placeholder correctly.

### fix(auth): validate session role
- Session parsing now enforces `student|staff` roles and clears invalid sessions.

### fix(a11y): add username field for password forms
- Password change forms now include a hidden `username` field so browsers/password managers can associate credentials correctly.

### refactor(profile): reuse study time formatter
- Deduplicated the profile study time display by moving the formatter into `src/lib/formatters.ts`.

### feat(attempt): include answer keys in review state
- Attempt review state now returns `correctOptionIds`, `shortAnswerKeys`, and question `explanation` (when available) so results pages can show correct answers.
- Legacy review mode is enriched by querying question review details by question IDs.

### feat(ui): improve attempt results review
- Results page now shows each question with all options, your choice(s), correct answer(s), and explanation (with a quick show/hide toggle).
- Updated layout to match the dashboard theme and added clearer summary/actions.

### fix(ui): simplify attempt results header
- Results header no longer shows the attempt status.
- Explanation toggles now use native `<details>/<summary>` (less client JS), and server-rendered icons use inline SVG for RSC compatibility.

### feat(staff-settings): add allowlist manager
- Added a staff settings page to surface key environment/config status (URLs, email sender, OAuth, etc).
- Added an allowlist manager UI with search, pagination, bulk add/update, remove, and “copy register link”.
- Allowlist API now supports search and returns `{ items, total }` for pagination.

### refactor(staff): simplify quiz builder controls
- Removed redundant “move up/down” and “required” controls from the quiz builder (drag-to-reorder remains).
- Quiz info modal now edits quiz `status` (draft/published) instead of `featuredRank`.

### fix(ui): layer manage quiz hero figure
- Manage quiz hero figure is now decorative (removed from layout flow) so the “Tạo quiz” CTA can sit on top.

### fix(ui): normalize manage quiz card heights
- Staff quiz cards now stretch to the row height so cards stay aligned when action buttons wrap.

### fix(ui): replace browser alerts with in-app popups
- Replaced remaining `window.alert` usage with an in-app notice popup (quiz catalog + quiz builder).

### fix(ui): show manage quiz errors in popup
- Staff manage quiz publish/delete failures now show as a popup instead of rendering inside the quiz card.

### feat(ui): add confirm and textarea modals
- Added reusable in-app confirm + textarea modals to replace browser dialogs.

### refactor(ui): remove browser confirm/prompt dialogs
- Replaced remaining `window.confirm` / `window.prompt` usage with in-app modals across staff screens.
- Quiz builder “Tạo câu hỏi mới” now uses a normal link (avoids `window.open`).

### fix(attempt): replace browser leave prompts with in-app modal
- In-progress attempt navigation warnings no longer use browser dialogs (`beforeunload`/`confirm`); leaving now uses an in-app modal.

### feat(staff-dashboard): add charts
- Added staff dashboard line charts for answer frequency + accuracy by subject over a configurable time window.
- Added repo/service/controller support for daily subject answer aggregates.

### feat(staff): add student management
- Added a staff “Quản lý học sinh” screen with filters, search, pagination, detail panel, and history.
- Added actions for verifying email, triggering password resets, and updating tier/status (with optional reason).
- Improved table accessibility: rows are now keyboard-selectable (Enter/Space).

### feat(audit): add staff audit logs
- Added staff audit-log API + UI (filters, facets, and detail view).
- Added a DB index for `audit_logs.created_at` to speed up listing.
- Audit search now trims whitespace and avoids expensive metadata scans for very short queries; unexpected errors return `500`.

### fix(auth): prefill register email
- Register now pre-fills the email from `?email=` and uses `Suspense` for `useSearchParams`.

### fix(auth): prevent login redirect loops
- Added `/logout` route that clears the session cookie and redirects to login (used when a stale cookie points to a missing/deactivated user).

### chore(seed): include draft quiz
- Seed now includes at least one quiz with `status = draft` (useful for testing staff “lưu nháp” flows).

### feat(leaderboard): search user rank
- `/dashboard/leaderboard` search now looks up a student by email/ID (or a unique name) and shows their rank + XP breakdown.
- Added `GET /api/catalog/leaderboard/table/search` to return a single leaderboard row for the active sort column/direction.

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
