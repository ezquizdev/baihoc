# Repository Guidelines

- This is a repo for BaiHoc, an online learning and exam-prep platform centered around **quizzes**, **challenges**, and an **AI study companion**.
- The use-case specifications are inside `/ucspec.md`.
- The architecture decision records are in `/arch.md`.
- The UI design screenshots are provided inside /designs, and the user may provide you Figma to those as well. The Figma may not be perfect, so you don't have to follow it 100%, try to make the UI/UX better if you can.
- If there is a frontend without clear design, try to follow the existing UI patterns.
- The app is built with Next.js and Typescript for backend and React for UI (and UI only).
- Supabase is used for the database and storage.
- Brevo is used for email services.
- You are free to adapt the architecture as needed, but only if it is reasonable (e.g. the old architecture is not ergonomic for the new feature). If you do so, please update `/arch.md` accordingly.
- Do not try to make everything too complicated; prefer simplicity and clarity.
- Please commit frequently. Use conventional commits (`feat: add user session refresh`, `fix: handle 401 retries`) to keep history searchable.
- Ensure commits are scoped; avoid mixing feature and refactor work.
- Never commit real secrets; update `/.env.example` when new variables are required.
- If there is any missing permission or missing information, ask the user first before proceeding.
