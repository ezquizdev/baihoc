# Services

Business logic belongs here. Services should be stateless functions or classes that:

- Encapsulate workflows for a domain (auth, quizzes, leaderboard, etc.).
- Call infra helpers for DB/external I/O.
- Throw domain/service errors for controllers/route handlers to handle.

Services never touch HTTP or UI concerns directly.
