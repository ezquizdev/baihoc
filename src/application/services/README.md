# Services

Business logic belongs here. Services should be stateless functions or classes that:

- Encapsulate workflows for a domain (auth, quizzes, leaderboard, etc.).
- Accept dependencies (repositories, clients) via arguments for testability.
- Throw domain errors for controllers to handle.

Services never touch HTTP or UI concerns directly.
