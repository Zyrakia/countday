# AGENTS

Project-specific guidance for any future work in this repo.

## Repo structure

-   `client/`: SvelteKit frontend.
-   `server/`: Fastify + tRPC backend (Drizzle + SQLite via libsql).
-   `packages/shared/`: shared env/schema utilities.

## Environment & DB

-   Root `.env` is the source of truth.
-   `DB_FILENAME` should be a `file:` URL (e.g. `file:server/local.sql`).
-   Drizzle config lives in `server/drizzle.config.ts`.

## Development commands

-   `bun run dev`: run server + client in parallel.
-   `bun run build`: build server + client.
-   `bun run start`: start server + preview client.
