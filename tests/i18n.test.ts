import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import seed from "../src/content/cms-seed.json" with { type: "json" };
import catalog from "../src/content/i18n/catalog.json" with { type: "json" };
import {
  localizePath,
  stripLocale,
  locales,
  initialTranslations,
  enabledLocales,
} from "../src/lib/i18n/config.ts";
import { contentCatalog, visitTexts } from "../src/lib/i18n/catalog.ts";
import { upgradeContent } from "../src/lib/cms/migrations.ts";
import { validateContent } from "../src/lib/cms/validation.ts";
import type { SiteContent } from "../src/lib/cms/types.ts";

test("Localized URLs preserve paths, query and anchors without touching contacts or private routes", () => {
  assert.equal(
    localizePath("/interventions/rhinoplastie?from=home#questions", "it"),
    "/it/interventions/rhinoplastie?from=home#questions",
  );
  assert.equal(
    localizePath("/ru/contact?intervention=rhinoplastie", "en"),
    "/en/contact?intervention=rhinoplastie",
  );
  assert.equal(localizePath("/en#avant-apres", "tr"), "/tr#avant-apres");
  assert.equal(localizePath("/tr#avant-apres", "fr"), "/#avant-apres");
  for (const path of [
    "https://wa.me/905392996231",
    "tel:+905392996231",
    "#about",
    "/api/contact",
    "/admin",
    "/images/lea-logo.png",
  ])
    assert.equal(localizePath(path, "ru"), path);
  assert.equal(stripLocale("/enquiry"), "/enquiry");
});
test("Migration keeps existing source edits, media, gallery approvals and independent draft translations", () => {
  const old = structuredClone(seed) as SiteContent;
  old.copy.home.text002 = "Une phrase personnalisée";
  old.copy.interventions.text005 = "Le visage · La silhouette · La poitrine";
  old.treatments = old.treatments.filter(
    (item) => !["liposuccion-vaser-hd", "j-plasma", "six-pack"].includes(item.slug),
  );
  delete (old.treatments[0] as Partial<(typeof old.treatments)[number]>).image;
  delete (old.treatments[0] as Partial<(typeof old.treatments)[number]>).imageAlt;
  delete (old as Partial<SiteContent>).translations;
  const migrated = upgradeContent(old);
  assert.equal(migrated.copy.home.text002, old.copy.home.text002);
  assert.match(migrated.copy.interventions.text005, /Opérations pour homme/);
  assert.deepEqual(
    migrated.treatments.slice(-3).map((item) => item.slug),
    ["liposuccion-vaser-hd", "j-plasma", "six-pack"],
  );
  assert.equal(migrated.treatments[0].image, "");
  assert.equal(migrated.treatments[0].imageAlt, "");
  assert.deepEqual(migrated.gallery, old.gallery);
  assert.deepEqual(migrated.translations, initialTranslations());
  assert.deepEqual(upgradeContent(migrated), migrated);
  migrated.translations.ru.enabled = false;
  assert.deepEqual(enabledLocales(migrated.translations), [
    "fr",
    "en",
    "it",
    "es",
    "pt",
    "tr",
  ]);
});
test("Content traversal translates text only and discovers new CMS copy without exposing override storage", () => {
  const result = visitTexts(
    seed,
    (value) => `Translated: ${value}`,
  ) as SiteContent;
  assert.equal(result.copy.home.text007, seed.copy.home.text007);
  assert.equal(result.treatments[0].slug, seed.treatments[0].slug);
  assert.equal(result.settings.phone, seed.settings.phone);
  assert.equal(result.settings.assets.logo, seed.settings.assets.logo);
  assert.equal(
    result.treatments[0].name,
    `Translated: ${seed.treatments[0].name}`,
  );
  assert.deepEqual(result.translations, seed.translations);
  assert.ok(
    contentCatalog(seed).some((item) => item.source === seed.copy.home.text002),
  );
});
test("Translation validation rejects malformed locales, unsafe dictionary keys and lost placeholders", () => {
  const content = structuredClone(seed) as SiteContent;
  content.translations.en.messages["Bonjour {intervention}"] =
    "Hello {intervention}";
  assert.doesNotThrow(() => validateContent(content));
  content.translations.en.messages["Bonjour {intervention}"] = "Hello";
  assert.throws(() => validateContent(content), /variables/);
  content.translations.en.messages = JSON.parse('{"__proto__":"invalid"}');
  assert.throws(() => validateContent(content), /invalide/);
  content.translations.en.messages = { Bonjour: "" };
  assert.throws(() => validateContent(content), /invalide/);
});
test("Six complete dictionaries retain placeholders and every source key", () => {
  for (const locale of locales.filter((code) => code !== "fr")) {
    const dictionary = JSON.parse(
      readFileSync(
        new URL(`../src/content/i18n/${locale}.json`, import.meta.url),
        "utf8",
      ),
    );
    for (const { source } of catalog) {
      assert.equal(
        typeof dictionary[source],
        "string",
        `${locale}: missing ${source}`,
      );
      assert.ok(dictionary[source].trim(), `${locale}: blank ${source}`);
      assert.deepEqual(
        (dictionary[source].match(/\{[a-z]+\}/g) || []).sort(),
        (source.match(/\{[a-z]+\}/g) || []).sort(),
        `${locale}: placeholders ${source}`,
      );
    }
  }
});
