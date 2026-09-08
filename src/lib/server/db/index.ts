import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';
import { building } from '$app/environment';

if (!building && !env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// postgres.js opens connections lazily, so during the build — where DATABASE_URL is
// absent — a placeholder URL still yields a usable drizzle instance without ever
// touching the network. The instance must exist at import time because Better Auth's
// drizzle adapter reads `db._` as soon as `auth.ts` is evaluated.
const client = postgres(env.DATABASE_URL || 'postgres://build:build@localhost:5432/build');

export const db = drizzle(client, { schema });
