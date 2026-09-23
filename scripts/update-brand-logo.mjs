// Field-level identity migration. Does not publish other draft changes or touch accounts.
import { DatabaseSync } from "node:sqlite";
import { resolve, join } from "node:path";
import { randomUUID } from "node:crypto";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const logo = "/images/lea-logo-rose.webp";
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
    if (client) await client.query("SELECT pg_advisory_xact_lock(781023941)");
    const row = (
      await query("SELECT value FROM lea_cms WHERE key='content'")
    )[0];
    if (!row) throw new Error("Démarrez le site avant la migration.");
    const value = JSON.parse(row.value);
    if (
      value.draft.settings.assets.logo === logo &&
      value.published.settings.assets.logo === logo
    ) {
      await query("COMMIT");
      console.log("Le nouveau logo est déjà actif.");
    } else {
      const beforeDraft = structuredClone(value.draft),
        beforePublished = structuredClone(value.published);
      const now = Date.now(),
        id = randomUUID();
      const revision = {
        id,
        content: value.published,
        createdAt: now,
        email: "Mise à jour de l’identité LEA",
        revision: value.publishedRevision,
      };
      await query("INSERT INTO lea_cms (key,value) VALUES ($1,$2)", [
        `revision:${id}`,
        JSON.stringify(revision),
      ]);
      value.draft.settings.assets.logo = logo;
      value.published.settings.assets.logo = logo;
      value.revision++;
      value.publishedRevision = value.revision;
      value.updatedAt = now;
      value.publishedAt = now;
      const draftCheck = structuredClone(value.draft),
        publishedCheck = structuredClone(value.published);
      draftCheck.settings.assets.logo = beforeDraft.settings.assets.logo;
      publishedCheck.settings.assets.logo =
        beforePublished.settings.assets.logo;
      if (
        JSON.stringify(draftCheck) !== JSON.stringify(beforeDraft) ||
        JSON.stringify(publishedCheck) !== JSON.stringify(beforePublished)
      )
        throw new Error("La migration a touché un autre contenu.");
      await query("UPDATE lea_cms SET value=$1 WHERE key='content'", [
        JSON.stringify(value),
      ]);
      await query("COMMIT");
      console.log(
        `Logo activé. Révision ${value.revision}. Autres contenus et comptes conservés. Version précédente archivée.`,
      );
    }
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }
} finally {
  db?.close();
  client?.release();
  if (pool) await pool.end();
}
