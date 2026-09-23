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
import {
  contentNeedsImageMigration,
  upgradeContent,
} from "../src/lib/cms/migrations.ts";
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
    (item) =>
      !["liposuccion-vaser-hd", "j-plasma", "six-pack"].includes(item.slug),
  );
  delete (old.treatments[0] as Partial<(typeof old.treatments)[number]>).image;
  delete (old.treatments[0] as Partial<(typeof old.treatments)[number]>)
    .imageAlt;
  delete (old.settings.assets as Partial<typeof old.settings.assets>)
    .teomanPortrait;
  for (let index = 25; index <= 58; index++)
    delete (old.copy.chirurgien as Record<string, string>)[
      `text${String(index).padStart(3, "0")}`
    ];
  old.copy.chirurgien.text001 = "Le chirurgien";
  old.copy.chirurgien.text002 = "Dr Anıl";
  old.copy.chirurgien.text003 = "Pehlivan.";
  old.navigation.find((item) => item.href === "/chirurgien")!.label =
    "Le chirurgien";
  old.navigation.find((item) => item.href === "/agence")!.label = "L’agence";
  old.seo.chirurgien.title = "Dr Anıl Pehlivan, le chirurgien";
  delete (old as Partial<SiteContent>).translations;
  delete (old as Partial<SiteContent>).visualGuides;
  for (let index = 7; index <= 17; index++)
    delete (old.copy.interventions as Record<string, string>)[
      `text${String(index).padStart(3, "0")}`
    ];
  const migrated = upgradeContent(old);
  assert.equal(migrated.copy.home.text002, old.copy.home.text002);
  assert.match(migrated.copy.interventions.text005, /Opérations pour homme/);
  assert.deepEqual(
    migrated.treatments.slice(-3).map((item) => item.slug),
    ["liposuccion-vaser-hd", "j-plasma", "six-pack"],
  );
  assert.equal(migrated.treatments[0].image, "");
  assert.equal(migrated.treatments[0].imageAlt, "");
  assert.equal(migrated.navigation[2].label, "Les chirurgiens");
  assert.equal(migrated.navigation[0].label, "À propos");
  assert.equal(
    migrated.settings.assets.teomanPortrait,
    "/images/dr-teoman-eraslan-cv.webp",
  );
  assert.equal(migrated.copy.chirurgien.text029, "Dr Teoman Eraslan");
  assert.match(migrated.seo.chirurgien.title, /Teoman Eraslan/);
  assert.deepEqual(migrated.gallery, old.gallery);
  assert.deepEqual(migrated.translations, initialTranslations());
  assert.equal(migrated.visualGuides.length, 17);
  assert.equal(
    migrated.visualGuides.filter((guide) => guide.visible).length,
    17,
  );
  assert.equal(
    migrated.copy.interventions.text017,
    "Visuel fourni en français",
  );
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
test("About navigation migration preserves an existing translated label", () => {
  const old = structuredClone(seed) as SiteContent;
  old.navigation.find((item) => item.href === "/agence")!.label = "L’agence";
  old.translations.en.messages["L’agence"] = "Our agency";
  const migrated = upgradeContent(old);
  assert.equal(migrated.navigation[0].label, "À propos");
  assert.equal(migrated.translations.en.messages["À propos"], "Our agency");
  assert.equal(migrated.translations.en.messages["L’agence"], "Our agency");
});
test("Image migration replaces legacy JPEG paths and removes the supplied duplicate only", () => {
  const old = structuredClone(seed) as SiteContent;
  old.settings.assets.logo = "/images/lea-logo-rose.png";
  old.settings.assets.teomanPortrait = "/images/dr-teoman-eraslan-cv.jpg";
  old.visualGuides[0].image = "/images/guides/gynecomastie.jpeg";
  old.visualGuides.splice(2, 0, {
    id: "e85c6d31-738f-4076-b70b-f6c73f66b4e6",
    title: "Liposuccion VASER 360° — copie fournie",
    category: "Homme",
    summary:
      "Illustration pédagogique simplifiée pour préparer vos questions avant une consultation médicale individuelle.",
    image: "/images/guides/vaser-360-homme-doublon.jpeg",
    imageAlt:
      "Copie du schéma pédagogique de la liposuccion VASER 360 degrés chez l’homme",
    treatmentSlug: "liposuccion-vaser-hd",
    visible: false,
  });
  assert.equal(contentNeedsImageMigration(old), true);
  const migrated = upgradeContent(old);
  assert.equal(migrated.settings.assets.logo, "/images/lea-logo-rose.webp");
  assert.equal(migrated.settings.assets.teomanPortrait.endsWith(".webp"), true);
  assert.equal(migrated.visualGuides[0].image.endsWith(".webp"), true);
  assert.equal(
    migrated.visualGuides.some(
      (guide) => guide.id === "e85c6d31-738f-4076-b70b-f6c73f66b4e6",
    ),
    false,
  );
  assert.equal(contentNeedsImageMigration(migrated), false);
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
