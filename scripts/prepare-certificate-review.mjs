// Store these supplied, disputed visuals privately; never publish or attest them.
import { DatabaseSync } from "node:sqlite";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { upgradeContent } from "../src/lib/cms/migrations.ts";
import { validateContent } from "../src/lib/cms/validation.ts";
import { certificateTemplate } from "../src/lib/cms/certificates.ts";
const inputs = [
  {
    id: "c0fb8e34-3269-443f-950d-1e960c634af1",
    file: "C:/Users/Lenovo/Documents/Lea_Aesthetic_files/certif-lea-1.png",
    title: "Visuel d’autorisation de tourisme de santé — à vérifier",
    issuer:
      "Ministère de la Santé de la République de Turquie (mention figurant sur le visuel)",
    reference: "ST-1995",
    reviewNote:
      "Le document précédent ST-1995 nommait ÖZEL RAMİ HASTANESİ. Ce visuel reprend ce numéro en remplaçant le titulaire par LEA AESTHETIC. Il ne constitue pas une preuve vérifiée d’autorisation de LEA.",
  },
  {
    id: "3d10f0a1-3f47-484e-94d1-44f9c4385edb",
    file: "C:/Users/Lenovo/Documents/Lea_Aesthetic_files/Generated Image September 13, 2026 - 5_08PM.png",
    title: "Visuel portant la marque JCI — à vérifier",
    issuer: "Joint Commission International (mention figurant sur le visuel)",
    reference: "",
    reviewNote:
      "Fichier fourni sous le nom Generated Image, avec texte dédoublé et signes de génération. Aucun original émis par JCI ni inscription officielle correspondant à LEA n’a été confirmé. Ne pas utiliser comme preuve d’accréditation.",
  },
];
if (process.env.DATABASE_URL || process.env.CMS_DATA_DIR)
  throw new Error(
    "Cet import vise uniquement la base locale .data/lea.sqlite du projet.",
  );
const documents = await Promise.all(
  inputs.map(async (input) => {
    const image = await sharp(await readFile(input.file))
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 92 })
      .toBuffer({ resolveWithObject: true });
    return { ...input, image };
  }),
);
const db = new DatabaseSync(".data/lea.sqlite");
db.exec("PRAGMA busy_timeout=5000; BEGIN IMMEDIATE");
try {
  const state = JSON.parse(
    db.prepare("SELECT value FROM lea_cms WHERE key='content'").get().value,
  );
  state.draft = upgradeContent(state.draft);
  state.published = upgradeContent(state.published);
  let added = 0;
  for (const doc of documents) {
    const url = `/media/${doc.id}`;
    const metadata = {
      id: doc.id,
      name: doc.title,
      width: doc.image.info.width,
      height: doc.image.info.height,
      created_at: Date.now(),
      url,
      publicationBlocked: true,
      reviewNote: doc.reviewNote,
    };
    for (const [key, value] of [
      [`media-info:${doc.id}`, metadata],
      [
        `media:${doc.id}`,
        { ...metadata, body: doc.image.data.toString("base64") },
      ],
    ])
      db.prepare(
        "INSERT INTO lea_cms(key,value) VALUES (?,?) ON CONFLICT(key) DO NOTHING",
      ).run(key, JSON.stringify(value));
    if (!state.draft.certificates.items.some((item) => item.id === doc.id)) {
      state.draft.certificates.items.push({
        ...certificateTemplate,
        id: doc.id,
        title: doc.title,
        holder: "LEA AESTHETIC (mention du visuel, non vérifiée)",
        issuer: doc.issuer,
        reference: doc.reference,
        image: url,
        alt: "Visuel fourni pour examen privé",
        visible: false,
        verified: false,
      });
      added++;
    }
  }
  validateContent(state.draft);
  validateContent(state.published);
  state.revision++;
  state.updatedAt = Date.now();
  db.prepare("UPDATE lea_cms SET value=? WHERE key='content'").run(
    JSON.stringify(state),
  );
  db.exec("COMMIT");
  console.log(
    `${added} documents ajoutés à l’examen privé. Aucun certificat publié.`,
  );
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}
