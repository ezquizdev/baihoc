#### 1. System Overview

BaiHoc is an online learning and exam-prep platform centered around **quizzes**, **challenges**, and an **AI study companion**.

Main capabilities:

* Students register, verify email, log in, and manage their profiles.
* Students browse/filter/attempt quizzes, view results, track practice history, and compete on leaderboards.
* Paid Students get premium features: custom quiz generation and AI companion for explanations, weakness analysis, and study planning.
* Teachers manage quizzes, questions, and users, and view analytics dashboards based on quiz data.
* The system integrates with:

  * An **Email Provider** for verification and password reset.
  * An external **LLM Service** for AI companion features.

---

#### 2. Actors & Roles

* **Guest**

  * Unauthenticated user, can browse general info and **Register**.

* **Student**

  * Registered user, can **Login**, do standard quizzes, view profile, practice history, results, leaderboard, etc.

* **Paid Student**

  * Inherits all Student features.
  * Additional abilities:

    * **Generate custom quiz** based on configuration.
    * **Ask AI companion** with context (on questions, attempts, overall history).

* **Teacher**

  * Manages content and students.
  * Uses a **Teacher Dashboard** to:

    * Manage quizzes and questions.
    * Manage users (students, Paid Students).
    * View analytics.

* **Email Provider (external system)**

  * Sends verification emails and password reset links.

* **LLM Service (external system)**

  * Provides AI responses for explanations, tutoring, performance analysis, and study plans.

---

#### 3. Core Student/Guest Features (Use Cases)

1. **Register (UC001)**

   * Guest fills registration form (email, password, confirm password, full name, school, profile picture, DOB optional).
   * Validations: required fields, email format, unique email, password strength, password match, Terms checkbox.
   * Create account in DB → status **“Pending Verification”**.
   * Performance: registration should complete < 10 seconds.

2. **Verify email (UC002)**

   * System sends unique verification link/token to email.
   * Guest clicks link → token validated (authenticity + expiry).
   * Account status changes **Pending Verification → Activated**.
   * Handle expired/invalid/used tokens; allow **resend verification email**.

3. **Login (UC003)**

   * Auth with email + password.
   * Validate credentials: email existence + password match.
   * Security: passwords hashed, no plaintext, SQL injection prevention.
   * On success, redirect to Home.
   * Handle unregistered email, wrong password, etc.

4. **Recover password (UC004)**

   * From login page: “Forgotten Password”.
   * Enter email → system sends reset link via Email Provider.
   * User sets new password via link (must differ from old and meet security requirements).
   * Email should be sent within 1 minute.

5. **Profile & History**

   * **View own profile (UC005.1)**: name, email, avatar, study statistics; must load within 2s.
   * **View others’ profile (UC005.2)**: public info only (no sensitive info like email), rank, badges.
   * **Edit profile (UC006)**: modify personal info, avatar; validate formats; avatar JPG/PNG ≤ 2MB.
   * **View practice history (UC007)**: list attempts with date, quiz name, result, time taken; sorted by newest; pagination if >20 entries; can drill down to specific attempt.

6. **Browse & Filter Quizzes**

   * **Browse quizzes (UC008)**:

     * “Quizzes” tab shows:

       * Categories (Math, Physics, English, etc.).
       * Featured carousel.
       * Grid of quiz cards (category, title, thumbnail, difficulty, rating, estimated time).
     * Infinite scroll / lazy load 20 quizzes at a time.
     * Handle premium quizzes: free users see “locked” state and upsell modal.
     * Handle network/timeouts and optionally cached data.

   * **Filter quizzes (UC009)**:

     * Filter by subject, category, difficulty, number of questions, etc.
     * Dynamic quiz count.
     * Asynchronous update without full page reload, within 1s.
     * “Clear filter” and “Reset all” flows.

7. **Leaderboard (UC010)**

   * Student views global rankings based on XP.
   * Display:

     * Podium for top 3 (gold/silver/bronze).
     * List ranks 4–50 with rank, trend, avatar, name, XP.
   * Can filter by subject and time period (weekly, monthly, all-time).
   * Global leaderboard recalculated at most every 15 minutes.

8. **Attempt quiz (UC011) and Answer question (UC012)**

   * Quiz start screen shows metadata (title, number of questions, time limit).
   * Student can navigate questions in any order; answers autosaved.
   * Support multiple question types:

     * MCQ (single/multi-select).
     * Short answer.
     * Passage-based questions (shared passage multiple sub-questions).
   * Time-limited quizzes:

     * Countdown timer (accurate and visible).
     * Auto-submit on time expiry.
   * System periodically persists answers and remaining time at least every 30s.
   * Student can exit early → confirmation, then finalize attempt with current answers.

9. **View quiz results (UC013)**

   * Shows attempt summary:

     * Correct/total questions, overall score, time taken, IRT-based estimated test score.
   * Shows per-question detail:

     * Question stem/options.
     * Student answer.
     * Correct answer.
     * Explanation (if available).
   * Access from immediate completion or from practice history.
   * Only owner can view their attempts; load within 5s.
   * From this screen, user can call AI companion:

     * For a specific question.
     * For overall attempt analysis and weaknesses.

10. **Attempt challenge (UC014)**

    * Special, time-limited challenge pinned on home dashboard.
    * User can attempt **once**.
    * Integrates **Attempt quiz** flow; result affects challenge leaderboard/history.
    * Must prevent cheating (e.g., refresh exploits) and support robust timer and pre-loading.

11. **Generate custom quiz (UC015) – Paid Student**

    * Configure:

      * Difficulty, question count, topics.
      * Optional advanced matrix (distribution by difficulty/topics).
    * System validates that question bank can satisfy configuration.
    * On success, create **custom quiz instance** attached to that student.
    * User can start immediately or later (quiz saved and visible in browsing).
    * Provide reasonable defaults and presets; generation < 10s.

---

#### 4. AI Companion Feature (UC016)

* **Entry points**:

  * Question-level: during Attempt quiz, tied to current question.
  * Result-level: from View quiz results for a specific attempt.
  * Home-level: from dashboard for whole-history analysis or general study questions.

* **Context passed to LLM**:

  * Question-level: question text, options, student answer, correct answer, explanation, quiz metadata.
  * Result-level: attempt stats, IRT score, topic/difficulty breakdown, per-question correctness.
  * Home-level: aggregated history (scores, attempts, weaknesses) + allowed profile info.

* **Capabilities**:

  * Explain question and concept.
  * Show step-by-step solution.
  * Provide hints (without giving direct answer if desired).
  * Analyze weaknesses and suggest study plan (e.g., next month).
  * General tutoring and Q&A.

* **Constraints & Safety**:

  * Must obey academic integrity and safety policies.
  * Label AI-generated content distinctly from official keys/grades.
  * Handle:

    * No history (generic help).
    * LLM unavailable/timeouts.
    * Unsafe/disallowed prompts → safe fallback response.

---

#### 5. Teacher / Admin Features

1. **Manage quizzes (UC017)**

   * List of quizzes with metadata: title, subject, topics, difficulty, status, creation date, attempts count, whether it’s a challenge, visibility (free vs paid).
   * Actions:

     * **Create** new quiz:

       * Set metadata (title, description, subject/topic, difficulty, visibility).
       * Configure challenge settings (optional): start/end, time limit, rules.
       * Select questions manually or via constraints from the **question bank**, or import from file.
       * Define question order and per-question scoring.
     * **Edit** quiz: update metadata, question set, scoring.
     * **Archive/Delete**:

       * If no attempts: hard delete.
       * If attempts exist: archive only (hide from future but keep history).

2. **Manage questions (UC018)**

   * Shared question bank used by quizzes and custom quizzes.
   * Question types: MCQ, short answer, passage-based, with rich text, images, math formulas.
   * Metadata: subject, topic, default difficulty, tags (e.g., skill type), explanation.
   * Actions:

     * Create question.
     * Edit question.
     * Archive/Delete:

       * If used in active quizzes: archive only.
       * Otherwise: permanent delete.
     * Bulk import from file (predefined structure) with validation and error reporting.
   * Must support:

     * Rich text editor.
     * Math formula rendering (LaTeX/MathML).
     * Search/sort/filter (subject, topic, difficulty, status).

3. **Manage users (UC019)**

   * Teacher manages students (free and paid).
   * List view shows: name, avatar, type (Student/Paid), basic progress indicators, activation status.
   * Filtering and search by name, type, etc.
   * For each student:

     * View profile and high-level performance summary.
     * Edit type (upgrade/downgrade free vs paid).
     * Change password.
     * Activate/deactivate.
     * Manually verify account or trigger verification emails.
   * Course students list:

     * List of emails that will automatically be assigned as Paid Student upon registration.
     * Add/remove emails manually or by import file.
   * All management changes must be logged (who/what/when).

4. **View Analytics (UC020)**

   * Teacher dashboard for analytics on quiz data.
   * Overview:

     * Average score over time.
     * Number of attempts/completions over time.
     * Score distribution by difficulty/subject.
     * Top weak topics per class or group.
   * Filters:

     * Time range (presets and custom).
     * Subject/topic.
     * Tag / student group / specific students.
     * Specific quiz or challenge.
   * Visualization:

     * Bar charts, line charts, tables.
     * Drill-down into individual student or quiz, linking to practice history / quiz results.
   * Performance: analytics queries should load within ~5s; handle very large datasets with limits/safeguards.
