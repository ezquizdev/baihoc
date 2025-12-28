# WIP Notes (Design + Implementation Log)

Use this file as a lightweight design doc and running log for in-progress work. Keep it scoped to the feature/refactor you are actively shipping.

Suggested structure:

## Feature / Change
- What: ...
- Why: ...
- Roles impacted: student / staff

## Flows
- Main flow:
- Edge cases / failure cases:

## Data / DB
- Tables touched:
- Schema changes (if any):
- Backfill/migration notes:

## API surface
- Routes/actions added or changed:
- Authz requirements:

## UI/UX
- Pages/components changed:
- Loading/empty/error states:

## Refactors (only if necessary)
- What changed:
- Why it’s safe (no behavior change):

## Testing
- Tests added/updated:
- Manual checks:

## Follow-ups
- TODOs / deferred items:

---

## Staff question editor: save blockers warning (2025-12-28)
- What: Show a warning panel listing why the question cannot be saved when the save button is disabled.
- Why: Make validation requirements visible instead of a silent disabled state.
- Roles impacted: staff.

### UI/UX
- Component: `src/components/manage-questions/question-editor-screen.tsx` + `src/components/manage-questions/question-editor-screen.module.css`.

### Testing
- Run `npm exec -- biome check --write`.
- Manual: open `/staff/questions/[questionId]`, clear required fields, confirm warning list appears and updates.

## Leaderboard search: name-only + multi-match results (2025-12-28)
- What: Change `/dashboard/leaderboard` search to match by student name only and return all matching rows (not single-entry lookup).
- Why: Align behavior with user search expectations and allow multiple students with similar names to appear.
- Roles impacted: student.

### Flows
- Main flow: student types a name → API returns all matching leaderboard rows → UI lists all matches.
- Edge cases / failure cases: empty query returns 400; no matches shows empty state; API error shows retry.

### Data / DB
- Tables touched: `users` (read-only).
- Schema changes: none.

### API surface
- Route changed: `GET /api/catalog/leaderboard/table/search` now returns `{ items: LeaderboardTableEntry[] }`.
- Authz: `requireAuthenticatedApi` (student).

### UI/UX
- Page: `/dashboard/leaderboard` search placeholder + result list updated.
- States: loading/error/empty preserved, now with list rendering.

### Testing
- Run `npm exec -- biome check --write`.
- Manual: search by common name on `/dashboard/leaderboard` and confirm multiple matches render.

## Seed script: align dev data with implemented flows (2025-12-28)
- What: Make `npm run db:seed` generate dev data that matches the implemented product flows end-to-end (no partial/shortcut rows).
- Why: Current seed inserts “submitted” attempts + XP without the snapshot/answer artifacts that the app expects, causing empty/misaligned UI on `/dashboard/history`, `/attempts/[id]/results`, and making highlight challenge/allowlist/custom quiz flows hard to validate.
- Roles impacted: student, staff.

### Flows covered
- Catalog → start/resume attempt → take quiz → results/review.
- Attempt history filters (practice/challenge/custom) + leaderboard totals.
- Student dashboard highlight challenge card (configured + optional prior submission).
- Staff settings allowlist + highlight config surfaces.
- Custom quiz “ready” instances excluded from catalog but present in history.

### Data / DB
- Tables touched (seeded): `users`, `course_student_allowlist`, `membership_history`, `user_status_changes`, `audit_logs`, `subjects`, `topics`, `questions`, `question_options`, `short_answer_keys`, `passages`, `question_passages`, `question_topics`, `quizzes`, `challenge_settings`, `quiz_questions`, `custom_quizzes`, `attempts`, `attempt_answers`, `attempt_answer_events`, `attempt_question_snapshots`, `user_quiz_first_attempts`, `question_irt_stats`, `xp_events`, `dashboard_highlight_challenge`, `dashboard_highlight_challenge_submissions`.
- Notes:
  - Submitted attempts must include snapshot fields on `attempts` (title/difficulty/duration/isChallenge + subjectScores + quizContentHash) and corresponding `attempt_*` rows so the app renders in snapshot mode (no legacy fallback).
  - `xp_events.metadata.subjectAllocations` should be populated so the XP trigger updates per-subject totals consistently with app behavior.

### Testing
- Run `npm exec -- biome check --write`.
- Smoke check (manual): `DB_RESET=true npm run db:init && npm run db:seed`, then verify `/dashboard`, `/dashboard/history`, `/attempts/*/results`, `/staff/settings`, `/quizzes`.

## StaffLineChart: span gaps for percent series (2025-12-28)
- What: Make `StaffLineChart` connect across `null` points (span gaps) by default when `unit="percent"`; expose override via `spanGaps` prop.
- Why: Accuracy charts on `/staff/dashboard` and `/staff/analytics` include many `null` days (0 attempts), which caused visibly broken line segments.
- Roles impacted: staff.

### UI/UX
- Component: `src/components/staff-dashboard/staff-line-chart.tsx` (presentation-only change; underlying `null` values are preserved for tooltip/hover logic).

## Staff analytics layout sizing (2025-12-28)
- What: Upsize charts + legends on `/staff/analytics` and align the stats grid visuals with the staff dashboard cards (icons + subject badge).
- Why: Analytics charts/legend were too small and stats cards didn't match the established staff dashboard styling.
- Roles impacted: staff.

### UI/UX
- Page: `/staff/analytics` (`src/components/staff-dashboard/staff-analytics-screen.tsx` + `src/components/staff-dashboard/staff-dashboard-screen.module.css`).
- States: Loading/error/empty chart states preserved; only sizing and layout tweaks.

## Staff quizzes: move quiz content builder to page (2025-12-28)
- What: Replace the quiz info modal’s “Tiếp tục” (open builder modal) with “Quản lý nội dung quiz” that navigates to `/staff/quizzes/[quizId]/content`, which renders the existing quiz builder UI.
- Why: Avoid stacked modals and make quiz content management deep-linkable.
- Roles impacted: staff.

### Flows
- Main flow: `/staff/quizzes` → “Chỉnh sửa” → “Quản lý nội dung quiz” → manage questions/reorder/publish → close/back → `/staff/quizzes`.
- Create-question shortcut: from quiz builder → “Tạo câu hỏi mới” (new tab) → save question → quiz builder auto-adds the new question into the list → tab closes back to builder.
- Failure cases: save errors stay in the modal/page; auth guard redirects to login/profile completion; forbidden staff access redirects to `/dashboard`.

### Data / DB
- Tables touched: none directly (reuses existing staff quiz/question APIs).
- Schema changes: none.

### API surface
- Added page route: `GET /staff/quizzes/[quizId]/content` (staff-only).
- Reused APIs: `GET/PATCH /api/staff/quizzes/[quizId]`, `PUT /api/staff/quizzes/[quizId]/questions`, `POST /api/staff/quizzes/[quizId]/publish`, `GET/PATCH /api/staff/questions/**`.

### UI/UX
- Updated modal: `src/components/manage-quiz/modals/quiz-info-modal.tsx` now navigates to content page after saving.
- Added page/screen: `src/app/staff/quizzes/[quizId]/content/page.tsx` + `src/components/manage-quiz/manage-quiz-content-screen.tsx` (renders the existing builder UI as page content; no backdrop/fixed modal wrapper; no dialog-card container in page variant).
- Quiz builder now supports a new-question callback flow: opens `/staff/questions/new?from=quiz-builder&quizId=...` in a new tab and listens for a cross-tab message to append the created question immediately.
- Scroll lock: `QuestionBankPickerModal` and `QuestionEditModal` now manage `body.modal-open` themselves so the page version behaves like the old modal stack.

### Testing
- Ran `npm exec -- biome check --write` and `npm run build`.
- Playwright: verified navigation + responsive rendering and captured screenshots (small/medium/large + question bank open).

## Custom quiz modal: customizable time limit (2025-12-28)
- What: Let students override the time limit (minutes) when generating a custom quiz; keep the recommended duration as a hint.
- Why: Custom quiz generation should allow a user-defined time cap instead of only the derived default.
- Roles impacted: student.

### Flows
- Main flow: student updates minutes in the “Thời gian” field → create custom quiz → generated quiz uses the chosen time limit.
- Edge cases / failure cases: empty/invalid minutes block submission with inline error; changing question count updates the recommended hint but does not overwrite a user-edited time.

### Data / DB
- Tables touched: `custom_quizzes` (config) and `quizzes` (estimated_time_seconds) via existing flow.
- Schema changes: none.

### API surface
- Route used: `POST /api/custom-quizzes` (durationSeconds already supported).

## Dashboard quick actions + quiz catalog params (2025-12-28)
- What: Wire dashboard quick actions to catalog URL params (all quizzes, all challenges, open custom quiz modal) and add a random quiz entry that starts the attempt flow.
- Why: Make the quick nav buttons functional and reduce clicks to common quiz flows.
- Roles impacted: student.

### Flows
- Main flow: dashboard quick action → `/quizzes` with `status`/`custom` params → catalog applies filters or opens custom modal.
- Random flow: dashboard quick action → `/quizzes/random` → server picks an unattempted quiz and redirects to `/quizzes/[quizId]/attempt`.
- Edge cases / failure cases: if no unattempted quizzes exist, `/quizzes/random` redirects back to `/quizzes?status=all`.

### Data / DB
- Tables touched: `quizzes`, `attempts`, `custom_quizzes` (read-only for random selection).
- Schema changes: none.

### API surface
- Added page route: `/quizzes/random` (requires authenticated session).
- Authz: `requireAuthenticatedPage` (student session).

### UI/UX
- Dashboard quick actions now link to catalog params and random quiz route.
- Quiz catalog reads `status` and `custom` query params on first load.

## VIP gating: premium quiz + custom quiz + AI (2025-12-28)
- What: Enforce VIP-only access for premium quizzes and custom quiz generation, with clear messaging on attempted access.
- Why: Ensure paid features are gated consistently for free students.
- Roles impacted: student.

### Flows
- Catalog: clicking a premium quiz start now shows a VIP-only notice instead of starting the attempt.
- Custom quiz: opening the generator as a free student shows a VIP-only notice (including `?custom=1` deep link).
- Attempts: direct navigation to premium quiz attempts is blocked server-side with a VIP-only error.

### Data / DB
- Tables touched: `quizzes`, `attempts`, `custom_quizzes`, `users` (read-only for access checks).
- Schema changes: none.

### API surface
- Attempt start now validates quiz visibility against user tier.

### UI/UX
- Added VIP notice modal to the quiz catalog page for premium quiz and custom quiz access attempts.
- Authz: `requireAuthenticatedApi` (student).

### UI/UX
- Component: `src/components/quiz-catalog/generate-custom-quiz-modal.tsx`.
- States: uses existing submit error banner for invalid minutes.

### Testing
- Run `npm exec -- biome check --write`.

## Staff quizzes: block publish without questions (2025-12-28)
- What: Prevent publishing a quiz with zero questions and surface a clear UI message.
- Why: Publishing empty quizzes leads to broken student experiences and should be blocked.
- Roles impacted: staff.

### Flows
- Main flow: staff attempts to publish a draft with zero questions → UI shows error and publish is blocked.
- Edge cases / failure cases: API returns 409 with `QUIZ_PUBLISH_EMPTY` when status is set to published via metadata edit.

### Data / DB
- Tables touched: `quiz_questions` (read-only count).
- Schema changes: none.

### API surface
- Route changed: `POST /api/staff/quizzes/[quizId]/publish` now returns `409` with error code when quiz has no questions.
- Authz: `requireAuthenticatedApi` (staff).

### UI/UX
- Components: `src/components/manage-quiz/staff-quiz-card.tsx`, `src/components/manage-quiz/modals/quiz-builder-modal.tsx`.
- States: inline error + notice modal when publish is blocked.

### Testing
- Run `npm exec -- biome check --write`.
- Manual: `/staff/quizzes` publish draft with 0 questions (error), add a question then publish succeeds.
