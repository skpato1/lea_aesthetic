import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { randomBytes } from "node:crypto";
import seed from "@/content/cms-seed.json";
import type { ContentState } from "./types";
import { upgradeContent } from "./migrations";

type Row = { key: string; value: string };
type Query = (sql: string, params?: unknown[]) => Promise<Row[]>;
export type Store = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  remove(key: string): Promise<void>;
  list<T>(prefix: string): Promise<T[]>;
};
type Connection = {
  query: Query;
  transaction<T>(fn: (store: Store) => Promise<T>): Promise<T>;
};
const globalCMS = globalThis as unknown as {
  leaDatabase?: Promise<Connection>;
};
export function storageConfigured() {
  return process.env.VERCEL !== "1" || !!process.env.DATABASE_URL;
}
export const dataDirectory = () =>
  resolve(
    /*turbopackIgnore: true*/ process.env.CMS_DATA_DIR ||
      join(process.cwd(), ".data"),
  );
function storeFor(query: Query): Store {
  return {
    async get<T>(key: string) {
      const rows = await query("SELECT key,value FROM lea_cms WHERE key=$1", [
        key,
      ]);
      return rows[0] ? (JSON.parse(rows[0].value) as T) : undefined;
    },
    async set(key, value) {
      await query(
        "INSERT INTO lea_cms (key,value) VALUES ($1,$2) ON CONFLICT (key) DO UPDATE SET value=excluded.value",
        [key, JSON.stringify(value)],
      );
    },
    async remove(key) {
      await query("DELETE FROM lea_cms WHERE key=$1", [key]);
    },
    async list<T>(prefix: string) {
      return (
        await query(
          "SELECT key,value FROM lea_cms WHERE key LIKE $1 ORDER BY key",
          [`${prefix}%`],
        )
      ).map((row) => JSON.parse(row.value) as T);
    },
  };
}
async function connect(): Promise<Connection> {
  if (!storageConfigured())
    throw new Error("DATABASE_URL est nécessaire sur Vercel.");
  let connection: Connection;
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      connectionTimeoutMillis: 8000,
    });
    const query: Query = async (sql, params = []) =>
      (await pool.query(sql, params)).rows;
    connection = {
      query,
      async transaction(fn) {
        const client = await pool.connect();
        try {
          await client.query("BEGIN");
          await client.query("SELECT pg_advisory_xact_lock(781023941)");
          const result = await fn(
            storeFor(
              async (sql, params = []) =>
                (await client.query(sql, params)).rows,
            ),
          );
          await client.query("COMMIT");
          return result;
        } catch (error) {
          await client.query("ROLLBACK");
          throw error;
        } finally {
          client.release();
        }
      },
    };
  } else {
    await mkdir(dataDirectory(), { recursive: true });
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(join(dataDirectory(), "lea.sqlite"));
    db.exec("PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
    const query: Query = async (sql, params = []) => {
      const values: (string | number | null)[] = [];
      const stmt = db.prepare(
        sql.replace(/\$(\d+)/g, (_, index) => {
          values.push(params[Number(index) - 1] as string | number | null);
          return "?";
        }),
      );
      return (
        sql.startsWith("SELECT")
          ? stmt.all(...values)
          : (stmt.run(...values), [])
      ) as Row[];
    };
    let queue = Promise.resolve();
    connection = {
      query,
      async transaction(fn) {
        const previous = queue;
        let release!: () => void;
        queue = new Promise<void>((done) => {
          release = done;
        });
        await previous;
        try {
          db.exec("BEGIN IMMEDIATE");
          const result = await fn(storeFor(query));
          db.exec("COMMIT");
          return result;
        } catch (error) {
          db.exec("ROLLBACK");
          throw error;
        } finally {
          release();
        }
      },
    };
  }
  await connection.query(
    "CREATE TABLE IF NOT EXISTS lea_cms (key TEXT PRIMARY KEY,value TEXT NOT NULL)",
  );
  await connection.transaction(async (store) => {
    const state = await store.get<ContentState>("content");
    if (!state) await store.set("content", initialState());
    else if (
      !Object.hasOwn(state.draft, "gallery") ||
      !Object.hasOwn(state.published, "gallery") ||
      !Object.hasOwn(state.draft, "translations") ||
      !Object.hasOwn(state.published, "translations") ||
      !Object.hasOwn(state.draft, "certificates") ||
      !Object.hasOwn(state.published, "certificates") ||
      seed.treatments.some(
        (template) =>
          !state.draft.treatments.some((item) => item.slug === template.slug) ||
          !state.published.treatments.some(
            (item) => item.slug === template.slug,
          ),
      ) ||
      state.draft.treatments.some((item) => !Object.hasOwn(item, "image")) ||
      state.draft.treatments.some(
        (item) => !Object.hasOwn(item, "imageAlt"),
      ) ||
      state.published.treatments.some(
        (item) => !Object.hasOwn(item, "image"),
      ) ||
      state.published.treatments.some(
        (item) => !Object.hasOwn(item, "imageAlt"),
      ) ||
      !Object.hasOwn(state.draft.settings.assets, "healthTurkiye") ||
      !Object.hasOwn(state.published.settings.assets, "healthTurkiye")
    ) {
      state.draft = upgradeContent(state.draft);
      state.published = upgradeContent(state.published);
      state.revision++;
      state.updatedAt = Date.now();
      await store.set("content", state);
    }
  });
  return connection;
}
async function database() {
  if (!globalCMS.leaDatabase)
    globalCMS.leaDatabase = connect().catch((error) => {
      delete globalCMS.leaDatabase;
      throw error;
    });
  return globalCMS.leaDatabase;
}
export async function transaction<T>(
  fn: (store: Store) => Promise<T>,
): Promise<T> {
  return (await database()).transaction(fn);
}
export async function readValue<T>(key: string) {
  return transaction((store) => store.get<T>(key));
}
export async function listValues<T>(prefix: string) {
  return transaction((store) => store.list<T>(prefix));
}
export function initialState(): ContentState {
  return {
    draft: structuredClone(seed),
    published: structuredClone(seed),
    revision: 1,
    publishedRevision: 1,
    updatedAt: Date.now(),
    publishedAt: Date.now(),
  };
}
export async function contentState(): Promise<ContentState> {
  if (!storageConfigured()) return initialState();
  return (await readValue<ContentState>("content"))!;
}
export async function setupToken(): Promise<string> {
  if (process.env.ADMIN_SETUP_TOKEN) {
    if (process.env.ADMIN_SETUP_TOKEN.length < 32)
      throw new Error(
        "ADMIN_SETUP_TOKEN doit contenir au moins 32 caractères.",
      );
    return process.env.ADMIN_SETUP_TOKEN;
  }
  if (process.env.VERCEL === "1")
    throw new Error("ADMIN_SETUP_TOKEN doit être configuré.");
  await mkdir(dataDirectory(), { recursive: true });
  const path = join(dataDirectory(), "admin-setup-token.txt");
  try {
    return (await readFile(path, "utf8")).trim();
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const token = randomBytes(32).toString("hex");
  try {
    await writeFile(path, token + "\n", { flag: "wx", mode: 0o600 });
    return token;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    return (await readFile(path, "utf8")).trim();
  }
}
