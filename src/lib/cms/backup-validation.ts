import { validateContent } from "./validation.ts";
import { restoreContent } from "./migrations.ts";
import { contentAssets } from "./gallery.ts";
import type { ContentState, SiteContent } from "./types";
import transformationMedia from "../../content/transformation-media.json" with { type: "json" };

type Row = { key: string; value: string };
const suppliedMedia = new Set(transformationMedia.map((item) => item.url));
export function prepareBackupRows(rows: Row[]): Row[] {
  const ids = new Set(rows.map((row) => row.key));
  if (ids.size !== rows.length)
    throw new Error("Clés de sauvegarde dupliquées.");
  const normalized = rows.map((row) => {
    const value = JSON.parse(row.value);
    if (row.key === "content") {
      const state = value as ContentState;
      for (const field of [
        "revision",
        "publishedRevision",
        "updatedAt",
        "publishedAt",
      ] as const)
        if (!Number.isSafeInteger(state[field]) || state[field] < 0)
          throw new Error("Version de sauvegarde invalide.");
      state.draft = validateContent(restoreContent(state.draft));
      state.published = validateContent(restoreContent(state.published));
    } else if (row.key.startsWith("revision:")) {
      if (value.id !== row.key.slice(9))
        throw new Error("Historique incohérent.");
      value.content = validateContent(restoreContent(value.content));
    } else {
      const id = row.key.split(":")[1];
      if (
        value.id !== id ||
        value.url !== `/media/${id}` ||
        typeof value.name !== "string" ||
        !Number.isSafeInteger(value.width) ||
        value.width < 1 ||
        !Number.isSafeInteger(value.height) ||
        value.height < 1
      )
        throw new Error("Métadonnées d’image incohérentes.");
      if (!ids.has(`media:${id}`) || !ids.has(`media-info:${id}`))
        throw new Error("Image incomplète dans la sauvegarde.");
      if (
        row.key.startsWith("media:") &&
        (typeof value.body !== "string" || !value.body.length)
      )
        throw new Error("Image vide dans la sauvegarde.");
    }
    return { ...row, value: JSON.stringify(value) };
  });
  for (const row of normalized) {
    const value = JSON.parse(row.value);
    const snapshots: SiteContent[] =
      row.key === "content"
        ? [value.draft, value.published]
        : row.key.startsWith("revision:")
          ? [value.content]
          : [];
    for (const content of snapshots)
      for (const asset of contentAssets(content))
        if (
          asset.startsWith("/media/") &&
          !suppliedMedia.has(asset) &&
          !ids.has(`media:${asset.slice(7)}`)
        )
          throw new Error("Une image référencée est absente de la sauvegarde.");
  }
  return normalized;
}
