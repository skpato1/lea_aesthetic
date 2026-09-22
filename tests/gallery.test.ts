import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import seed from "../src/content/cms-seed.json" with { type: "json" };
import {
  resultTemplate,
  resultIsVisible,
  contentAssets,
  resetChangedApprovals,
  instagramPostUrl,
} from "../src/lib/cms/gallery.ts";
import { validateContent } from "../src/lib/cms/validation.ts";
import { upgradeContent, restoreContent } from "../src/lib/cms/migrations.ts";
import { prepareBackupRows } from "../src/lib/cms/backup-validation.ts";
import type { ResultCase, SiteContent } from "../src/lib/cms/types.ts";

function fixture(): ResultCase {
  return {
    ...resultTemplate,
    id: randomUUID(),
    title: "Fixture non médicale",
    treatmentSlug: "rhinoplastie",
    caption: "Images techniques de test, aucun patient.",
    sourceLabel: "Test automatisé",
    beforeAlt: "Rectangle avant",
    afterAlt: "Rectangle après",
    beforeImage: `/media/${randomUUID()}`,
    afterImage: `/media/${randomUUID()}`,
    verified: true,
    consentConfirmed: true,
    visible: true,
  };
}
const content = (): SiteContent => structuredClone(seed);
test("Migration v1 : ajout de la galerie, idempotence et préservation des textes et de l’ordre", () => {
  const old = content();
  const expectedCopy = structuredClone(old.copy);
  old.copy.home.text002 = "Texte personnalisé";
  old.homeSections.reverse();
  old.homeSections = old.homeSections.filter((s) => s.id !== "gallery");
  const oldOrder = old.homeSections.map((s) => s.id);
  delete (old as Partial<SiteContent>).gallery;
  const upgraded = upgradeContent(old);
  assert.equal(upgraded.copy.home.text002, "Texte personnalisé");
  assert.deepEqual(upgraded.copy.contact, expectedCopy.contact);
  assert.deepEqual(
    upgraded.homeSections.filter((s) => s.id !== "gallery").map((s) => s.id),
    oldOrder,
  );
  assert.deepEqual(upgradeContent(upgraded), upgraded);
  assert.deepEqual(upgraded.gallery.items, []);
  assert.doesNotThrow(() => validateContent(upgraded));
});
test("Brouillon incomplet permis ; case actif incomplet, fausses confirmations et URL piégée refusés", () => {
  const draft = content();
  draft.gallery.items.push({ ...resultTemplate, id: randomUUID() });
  assert.doesNotThrow(() => validateContent(draft));
  draft.gallery.items[0].visible = true;
  assert.throws(() => validateContent(draft), /authenticité/);
  draft.gallery.items[0] = fixture();
  assert.doesNotThrow(() => validateContent(draft));
  draft.gallery.items[0].consentConfirmed = "false" as unknown as boolean;
  assert.equal(resultIsVisible(draft.gallery.items[0]), false);
  assert.throws(() => validateContent(draft), /choix invalide/);
  assert.equal(
    instagramPostUrl("https://www.instagram.com.evil.test/p/ABC/"),
    null,
  );
  assert.equal(
    instagramPostUrl("https://www.instagram.com/lea__aesthetics/"),
    null,
  );
  assert.equal(
    instagramPostUrl("https://www.instagram.com/reel/ABC_1/?tracking=x"),
    "https://www.instagram.com/reel/ABC_1/",
  );
  assert.equal(
    instagramPostUrl("https://www.instagram.com/lea__aesthetics/reel/ABC_1/"),
    "https://www.instagram.com/reel/ABC_1/",
  );
});
test("Médias : masquage du dossier, de la section et paire incomplète bloquent l’accès public", () => {
  const draft = content();
  const item = fixture();
  draft.gallery.items = [item];
  assert.ok(contentAssets(draft, true).includes(item.beforeImage));
  item.visible = false;
  assert.equal(contentAssets(draft, true).includes(item.beforeImage), false);
  assert.ok(contentAssets(draft).includes(item.beforeImage));
  item.visible = true;
  draft.homeSections.find((s) => s.id === "gallery")!.visible = false;
  assert.equal(contentAssets(draft, true).includes(item.beforeImage), false);
  item.afterImage = "";
  assert.equal(resultIsVisible(item), false);
});
test("Médias : les images d’intervention publiées sont protégées par leur visibilité", () => {
  const draft = content();
  const treatment = draft.treatments.find(
    (item) => item.slug === "liposuccion-vaser-hd",
  )!;
  assert.ok(contentAssets(draft, true).includes(treatment.image));
  treatment.visible = false;
  assert.equal(contentAssets(draft, true).includes(treatment.image), false);
  assert.ok(contentAssets(draft).includes(treatment.image));
});
test("Médias : les guides visuels suivent leur réglage de visibilité", () => {
  const draft = content();
  const guide = draft.visualGuides[0];
  guide.image = `/media/${randomUUID()}`;
  assert.ok(contentAssets(draft, true).includes(guide.image));
  guide.visible = false;
  assert.equal(contentAssets(draft, true).includes(guide.image), false);
  assert.ok(contentAssets(draft).includes(guide.image));
});
test("Remplacement et restauration nécessitent une nouvelle confirmation", () => {
  const before = content();
  before.gallery.items = [fixture()];
  const next = structuredClone(before);
  next.gallery.items[0].beforeImage = `/media/${randomUUID()}`;
  resetChangedApprovals(before, next);
  assert.equal(next.gallery.items[0].consentConfirmed, false);
  assert.equal(next.gallery.items[0].visible, false);
  const restored = restoreContent(before);
  assert.equal(restored.gallery.items[0].verified, false);
  assert.equal(resultIsVisible(restored.gallery.items[0]), false);
  assert.equal(resultIsVisible(before.gallery.items[0]), true);
});
test("Import : v1 accepté, références manquantes et contenu malformé refusés", () => {
  const draft = content();
  delete (draft as Partial<SiteContent>).gallery;
  draft.homeSections = draft.homeSections.filter((s) => s.id !== "gallery");
  const state = {
    draft,
    published: structuredClone(draft),
    revision: 1,
    publishedRevision: 1,
    updatedAt: 1,
    publishedAt: 1,
  };
  const rows = [{ key: "content", value: JSON.stringify(state) }];
  assert.equal(
    JSON.parse(prepareBackupRows(rows)[0].value).draft.gallery.items.length,
    0,
  );
  state.draft = content();
  state.draft.gallery.items = [fixture()];
  assert.throws(
    () => prepareBackupRows([{ key: "content", value: JSON.stringify(state) }]),
    /image référencée/,
  );
  state.draft.gallery = null as unknown as SiteContent["gallery"];
  assert.throws(() =>
    prepareBackupRows([{ key: "content", value: JSON.stringify(state) }]),
  );
});
