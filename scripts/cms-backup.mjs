import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { prepareBackupRows } from "../src/lib/cms/backup-validation.ts";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const mode = process.argv[2] || "export";
const directory = resolve(process.env.CMS_DATA_DIR || ".data");
let pool, db;
try {
  if (process.env.DATABASE_URL) {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  } else {
    await mkdir(directory, { recursive: true });
    db = new DatabaseSync(join(directory, "lea.sqlite"));
  }
  if (mode === "export") {
    const rows = pool
      ? (
          await pool.query(
            "SELECT key,value FROM lea_cms WHERE key='content' OR key LIKE 'revision:%' OR key LIKE 'media:%' OR key LIKE 'media-info:%' ORDER BY key",
          )
        ).rows
      : db
          .prepare(
            "SELECT key,value FROM lea_cms WHERE key='content' OR key LIKE 'revision:%' OR key LIKE 'media:%' OR key LIKE 'media-info:%' ORDER BY key",
          )
          .all();
    if (!rows.some((x) => x.key === "content"))
      throw new Error(
        "Aucun contenu à exporter. Démarrez le site une première fois.",
      );
    const target = resolve(
      process.argv[3] ||
        join(
          directory,
          `backup-${new Date().toISOString().replaceAll(":", "-")}.json`,
        ),
    );
    await writeFile(
      target,
      JSON.stringify(
        {
          format: "lea-cms-backup-v1",
          createdAt: new Date().toISOString(),
          rows,
        },
        null,
        2,
      ),
      { flag: "wx", mode: 0o600 },
    );
    console.log(
      `Sauvegarde créée : ${target}. Les comptes, sessions et codes d’installation sont exclus. Conservez ce fichier privé.`,
    );
  } else if (mode === "import") {
    if (!process.argv[3])
      throw new Error("Indiquez le chemin de la sauvegarde.");
    const backup = JSON.parse(await readFile(resolve(process.argv[3]), "utf8"));
    if (
      backup.format !== "lea-cms-backup-v1" ||
      !Array.isArray(backup.rows) ||
      !backup.rows.some((x) => x.key === "content")
    )
      throw new Error("Format de sauvegarde invalide.");
    if (
      backup.rows.some(
        (x) =>
          typeof x.value !== "string" ||
          !/^(content|revision:[a-f0-9-]{36}|media:[a-f0-9-]{36}|media-info:[a-f0-9-]{36})$/.test(
            x.key,
          ),
      )
    )
      throw new Error("La sauvegarde contient une entrée non autorisée.");
    backup.rows = prepareBackupRows(backup.rows);
    const query = async (sql, params = []) => {
      if (pool) return (await pool.query(sql, params)).rows;
      return sql.startsWith("SELECT")
        ? db.prepare(sql).all(...params)
        : (db.prepare(sql).run(...params), []);
    };
    await query(
      "CREATE TABLE IF NOT EXISTS lea_cms (key TEXT PRIMARY KEY,value TEXT NOT NULL)",
    );
    await query("BEGIN");
    try {
      if (pool) await pool.query("SELECT pg_advisory_xact_lock(781023941)");
      if ((await query("SELECT key FROM lea_cms LIMIT 1")).length)
        throw new Error(
          "La base doit être vide. Importez avant de démarrer le site ; aucune donnée existante ne sera écrasée.",
        );
      for (const row of backup.rows)
        await query(
          pool
            ? "INSERT INTO lea_cms (key,value) VALUES ($1,$2)"
            : "INSERT INTO lea_cms (key,value) VALUES (?,?)",
          [row.key, row.value],
        );
      await query("COMMIT");
      console.log(
        "Import terminé. Créez un nouveau compte propriétaire avec le code d’installation de cette instance. Les dossiers avant / après sont masqués jusqu’à une nouvelle confirmation des autorisations.",
      );
    } catch (error) {
      await query("ROLLBACK");
      throw error;
    }
  } else
    throw new Error(
      "Utilisation : npm run cms:export -- [fichier] ou npm run cms:import -- fichier",
    );
} finally {
  db?.close();
  if (pool) await pool.end();
}
