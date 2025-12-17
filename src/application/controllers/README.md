# Controllers

Route handlers (server actions/API routes) live here. They:

- Parse and validate requests.
- Apply authentication/authorization guards.
- Instantiate and call services.
- Map service results back to HTTP responses.

Keep controllers thin and focused on translating between transport and application concerns.
