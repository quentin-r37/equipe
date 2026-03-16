# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Equipe** is a team collaboration platform (chat, video meetings, file sharing) built with SvelteKit 2 + Svelte 5, TypeScript, PostgreSQL, and Carbon Design System.

## Commands

| Task                                 | Command                                                  |
| ------------------------------------ | -------------------------------------------------------- |
| Dev server                           | `npm run dev`                                            |
| Build                                | `npm run build`                                          |
| Type check                           | `npm run check`                                          |
| Lint                                 | `npm run lint`                                           |
| Format                               | `npm run format`                                         |
| Run all tests                        | `npm test`                                               |
| Run tests (watch)                    | `npm run test:unit`                                      |
| Run single test                      | `npx vitest run src/lib/vitest-examples/example.test.ts` |
| Start infra (DB, SeaweedFS, LiveKit) | `npm run infra:start`                                    |
| Stop infra                           | `npm run infra:stop`                                     |
| Push schema to DB                    | `npm run db:push`                                        |
| Generate migration                   | `npm run db:generate`                                    |
| Apply migrations                     | `npm run db:migrate`                                     |
| DB visual editor                     | `npm run db:studio`                                      |
| Regenerate auth schema               | `npm run auth:schema`                                    |

## Architecture

### Stack

- **Framework**: SvelteKit 2 with Svelte 5 (runes mode globally enabled)
- **Language**: TypeScript (strict)
- **UI**: Carbon Design System (`carbon-components-svelte`) — no Tailwind
- **DB**: PostgreSQL via Drizzle ORM (`postgres.js` driver)
- **Auth**: Better Auth (email/password) with Drizzle adapter
- **i18n**: Paraglide (English + French), messages in `/messages/{locale}.json`
- **Video**: LiveKit (client + server SDK)
- **File storage**: SeaweedFS (HTTP API via filer)
- **Infra**: Docker Compose for dev services (`docker-compose.infra.yml`)

### Route Groups

- `(app)/*` — Protected routes (requires auth). Layout checks `event.locals.user`.
- `(auth)/*` — Login/signup pages. Redirects away if already authenticated.
- `api/*` — REST/SSE endpoints (files download, message posting, message streaming).

### Server-Side Patterns

- Auth session available via `event.locals.user` and `event.locals.session` (set in `hooks.server.ts`)
- Database instance: `import { db } from '$lib/server/db'`
- Schema: `import { team, channel, ... } from '$lib/server/db/schema'`
- Real-time messages use Server-Sent Events (`/api/messages/stream`) with an in-memory `EventEmitter` (`$lib/server/messages.ts`)

### Database Schema (`src/lib/server/db/schema.ts`)

Core tables: `team`, `team_member` (roles: owner/admin/member), `channel`, `message`, `meeting`, `file`. Auth tables are generated in `auth.schema.ts` via `npm run auth:schema`.

All IDs are UUIDs (text columns with `crypto.randomUUID()`). Foreign keys use `onDelete: 'cascade'` (except `file.channelId` which is `set null`).

### Styling

Uses Carbon Design System CSS tokens (`--cds-spacing-*`, `--cds-text-*`, `--cds-layer-*`). Component-scoped styles in `.svelte` files. Global tokens in `src/routes/layout.css`.

### Formatting

- Tabs, single quotes, 100 char print width (see `.prettierrc`)
- ESLint with TypeScript and Svelte plugins

## Environment Variables

Required in `.env`: `DATABASE_URL`, `ORIGIN`, `BETTER_AUTH_SECRET`, `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `SEAWEEDFS_FILER_URL`.

Optional: `ADMIN_EMAILS` — comma-separated list of emails that can access the admin panel (`/admin/users`).

Optional: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME` — Brevo transactional email configuration for email verification and password reset.
