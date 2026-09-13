import { test } from "node:test";
import assert from "node:assert/strict";
import seed from "../src/content/cms-seed.json" with { type: "json" };
import {
  certificateTemplate,
  certificateIsVisible,
  resetCertificateApprovals,
} from "../src/lib/cms/certificates.ts";
import { validateContent } from "../src/lib/cms/validation.ts";
import { upgradeContent, restoreContent } from "../src/lib/cms/migrations.ts";
import { contentAssets } from "../src/lib/cms/gallery.ts";
import type { SiteContent } from "../src/lib/cms/types.ts";
const fixture = () => ({
  ...certificateTemplate,
  id: "99999999-1111-4111-8111-111111111111",
  title: "Document de test non médical",
  holder: "Organisation de test",
  issuer: "Émetteur de test",
  scope: "Fixture technique sans accréditation",
  reference: "TEST",
  image: "/media/11111111-1111-4111-8111-111111111111",
  alt: "Image de test",
  verificationUrl: "https://example.org/verification",
  verified: true,
  visible: true,
});
test("certificats : brouillons privés, champs requis, liens sûrs et dates réelles", () => {
  const content = structuredClone(seed) as SiteContent;
  content.certificates.items = [fixture()];
  assert.doesNotThrow(() => validateContent(content));
  content.certificates.items[0].verified = false;
  assert.throws(() => validateContent(content), /vérifiée/);
  content.certificates.items[0].visible = false;
  assert.doesNotThrow(() => validateContent(content));
  content.certificates.items[0].verificationUrl = "javascript:alert(1)";
  assert.throws(() => validateContent(content), /HTTPS/);
  content.certificates.items[0].verificationUrl = "";
  content.certificates.items[0].expiresOn = "2026-02-31";
  assert.throws(() => validateContent(content), /date invalide/);
});
test("certificats : expiration, retrait, section masquée et médias privés", () => {
  const content = structuredClone(seed) as SiteContent;
  const item = fixture();
  content.certificates.items = [item];
  assert.ok(certificateIsVisible(item));
  assert.ok(contentAssets(content, true).includes(item.image));
  item.expiresOn = "2020-01-01";
  assert.equal(certificateIsVisible(item), false);
  assert.ok(!contentAssets(content, true).includes(item.image));
  item.expiresOn = "";
  content.homeSections.find((s) => s.id === "certificates")!.visible = false;
  assert.ok(!contentAssets(content, true).includes(item.image));
  assert.ok(contentAssets(content).includes(item.image));
});
test("certificats : migration préserve les textes et restauration retire les confirmations", () => {
  const old = structuredClone(seed) as SiteContent;
  old.copy.home.text002 = "Saisie préservée";
  delete (old as Partial<SiteContent>).certificates;
  old.homeSections = old.homeSections.filter((s) => s.id !== "certificates");
  const next = upgradeContent(old);
  assert.equal(next.copy.home.text002, "Saisie préservée");
  assert.deepEqual(next.certificates.items, []);
  assert.deepEqual(upgradeContent(next), next);
  next.certificates.items = [fixture()];
  const restored = restoreContent(next);
  assert.equal(restored.certificates.items[0].verified, false);
  const edited = structuredClone(next);
  edited.certificates.items[0].holder = "Autre titulaire";
  resetCertificateApprovals(next, edited);
  assert.equal(edited.certificates.items[0].verified, false);
  assert.equal(edited.certificates.items[0].visible, false);
});
