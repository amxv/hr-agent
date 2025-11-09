import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";

const globalForDb = globalThis as unknown as {
  __postgresClient?: ReturnType<typeof postgres>;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

const isProd = process.env.NODE_ENV === "production";

if (!globalForDb.__postgresClient) {
  globalForDb.__postgresClient = postgres(env.POSTGRES_URL, {
    // In dev we keep a small pool to avoid exhausting Postgres during HMR.
    max: isProd ? undefined : 5,
  });
}

export const client = globalForDb.__postgresClient;

if (!globalForDb.__drizzleDb) {
  globalForDb.__drizzleDb = drizzle(client);
}
export const db = globalForDb.__drizzleDb;
