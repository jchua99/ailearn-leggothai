import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Locally this is a SQLite file (file:local.db).
 * To host later, point DATABASE_URL at a hosted libSQL database (e.g. Turso) and set
 * DATABASE_AUTH_TOKEN — no code changes needed.
 */
const url = process.env.DATABASE_URL ?? "file:local.db";

const globalForDb = globalThis as unknown as { libsqlClient?: Client };

const client =
  globalForDb.libsqlClient ?? createClient({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
if (process.env.NODE_ENV !== "production") globalForDb.libsqlClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
