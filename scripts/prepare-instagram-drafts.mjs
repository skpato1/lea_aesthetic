// Imports observed LEA publication links as hidden drafts only. Never publishes results.
import { DatabaseSync } from "node:sqlite";
import { resolve, join } from "node:path";
import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { validateContent } from "../src/lib/cms/validation.ts";
import { instagramPostUrl } from "../src/lib/cms/gallery.ts";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const candidates = JSON.parse(
  await readFile(
    new URL("../src/content/instagram-candidates.json", import.meta.url),
    "utf8",
  ),
);
let db, pool, client;
try {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
    client = await pool.connect();
  } else {
    db = new DatabaseSync(
      join(resolve(process.env.CMS_DATA_DIR || ".data"), "lea.sqlite"),
    );
    db.exec("PRAGMA busy_timeout=5000;");
  }
  const query = async (sql, params = []) => {
    if (client) return (await client.query(sql, params)).rows;
    const values = [];
    const statement = db.prepare(
      sql.replace(/\$(\d+)/g, (_, index) => {
        values.push(params[Number(index) - 1]);
        return "?";
      }),
    );
    return sql.startsWith("SELECT")
      ? statement.all(...values)
      : (statement.run(...values), []);
  };
  await query(client ? "BEGIN" : "BEGIN IMMEDIATE");
  try {
    if (client) await query("SELECT pg_advisory_xact_lock(781023941)");
    const row = (
      await query("SELECT value FROM lea_cms WHERE key='content'")
    )[0];
    if (!row)
      throw new Error("Démarrez le site avant de préparer les brouillons.");
    const state = JSON.parse(row.value),
      before = structuredClone(state);
    if (!state.draft.gallery)
      throw new Error(
        "Redémarrez le site avec la version incluant la galerie.",
      );
    const existing = new Set(
      state.draft.gallery.items.map((item) =>
        instagramPostUrl(item.instagramUrl),
      ),
    );
    const additions = candidates.filter(
      (item) => !existing.has(instagramPostUrl(item.instagramUrl)),
    );
    state.draft.gallery.items.push(
      ...additions.map((item) => ({
        ...item,
        verified: false,
        consentConfirmed: false,
        visible: false,
      })),
    );
    validateContent(state.draft);
    assert.deepEqual(state.published, before.published);
    const check = structuredClone(state.draft);
    check.gallery.items = before.draft.gallery.items;
    assert.deepEqual(check, before.draft);
    if (additions.length) {
      state.revision++;
      state.updatedAt = Date.now();
      await query("UPDATE lea_cms SET value=$1 WHERE key='content'", [
        JSON.stringify(state),
      ]);
    }
    await query("COMMIT");
    console.log(
      `${additions.length} publications préparées en brouillon masqué. Aucun résultat publié ; autres contenus conservés.`,
    );
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
} finally {
  db?.close();
  client?.release();
  if (pool) await pool.end();
}
