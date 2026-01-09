# AGENTS

Project-specific guidance for any future work in this repo.

## Repo structure

-   `client/`: SvelteKit 5 (w/ Runes & Remote Functions) frontend.
-   `server/`: Fastify + tRPC backend (Drizzle + SQLite via libsql).
-   `packages/shared/`: shared env/schema utilities.

## Environment & DB

-   Root `.env` is the source of truth.
-   `DB_FILENAME` accepts a repo-relative path or `file:` URL; runtime resolves it against repo root.
-   Drizzle config lives in `server/drizzle.config.ts`.

## Conventions

-   Shared zod schemas live in `packages/shared/src/schema/` and are exported via `packages/shared/src/schema/index.ts`.
-   Form schemas trim string inputs and include user-friendly, short error messages (e.g. `Name is required`).
-   String limits are enforced (character and line counts) with small shared helpers (see `packages/shared/src/utils/`).
-   Utilities follow short JSDoc comments describing purpose/params/returns. Follow style of existing utilities.

## Development commands

-   `bun run dev`: run server + client in parallel.
-   `bun run build`: build server + client.
-   `bun run start`: start server + preview client.
