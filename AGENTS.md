# AGENTS

Project-specific guidance for any future work in this repo.

## Repo structure

-   `client/`: SvelteKit 5 (w/ Runes & Remote Functions) frontend.
-   `server/`: Fastify + tRPC backend (Drizzle + SQLite via libsql).

## Conventions

-   Shared zod schemas live in `packages/shared/src/schema/` and are exported via `packages/shared/src/schema/index.ts`.
-   Form schemas trim string inputs and include user-friendly, short error messages (e.g. `Name is required`).
-   String limits are enforced (character and line counts) with small shared helpers (see `packages/shared/src/utils/`).
-   Utilities follow short JSDoc comments describing purpose/params/returns. Follow style of existing utilities.
-   Environment schemas live alongside the loaders in `packages/shared/src/env/public.ts` (client) and `packages/shared/src/env/server.ts` (server).
-   The server loader reads `.env*` files from the repo root based on `NODE_ENV`/`BUN_ENV` and validates with zod.
-   The client loader only reads Vite `import.meta.env` values with the `VITE_` prefix; never import server env on the client.

## Development commands

-   `bun run dev`: run server + client in parallel.
-   `bun run build`: build server + client.
-   `bun run start`: start server + preview client.
