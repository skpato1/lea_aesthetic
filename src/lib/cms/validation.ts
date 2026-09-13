import seed from "../../content/cms-seed.json" with { type: "json" };
import fields from "../../content/cms-fields.json" with { type: "json" };
import type { SiteContent } from "./types";
import { instagramPostUrl, resultTemplate } from "./gallery.ts";
import { locales } from "../i18n/config.ts";
import { certificateTemplate, verificationLink } from "./certificates.ts";
const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
export function validateContent(value: unknown): SiteContent {
  const fail = (path: string, message: string): never => {
    throw new Error(`${path} : ${message}`);
  };
  function walk(input: unknown, template: unknown, path: string): void {
    if (path === "Contenu.translations") {
      if (!record(input) || Object.keys(input).length !== 6)
        fail(path, "les six langues de traduction sont requises.");
      for (const locale of locales.filter((code) => code !== "fr")) {
        const entry = (input as Record<string, unknown>)[locale];
        if (
          !record(entry) ||
          Object.keys(entry).some(
            (key) => !["enabled", "messages"].includes(key),
          ) ||
          typeof entry.enabled !== "boolean" ||
          !record(entry.messages)
        )
          fail(path, "réglages de langue invalides.");
        const messages = (entry as { messages: Record<string, unknown> })
          .messages;
        if (Object.keys(messages).length > 2500)
          fail(path, "2 500 traductions maximum par langue.");
        for (const [source, target] of Object.entries(messages)) {
          if (
            !source.trim() ||
            source.length > 10000 ||
            ["__proto__", "constructor", "prototype"].includes(source) ||
            typeof target !== "string" ||
            !target.trim() ||
            target.length > 10000 ||
            /[\u0000-\u0008]/.test(target)
          )
            fail(path, "texte de traduction invalide.");
          const placeholders = (source.match(/\{[a-z]+\}/g) || []).sort();
          if (
            JSON.stringify(placeholders) !==
            JSON.stringify(
              ((target as string).match(/\{[a-z]+\}/g) || []).sort(),
            )
          )
            fail(path, "conservez les variables, par exemple {intervention}.");
        }
      }
      return;
    }
    if (typeof template === "string") {
      if (
        typeof input !== "string" ||
        input.length > 10000 ||
        /[\u0000-\u0008]/.test(input)
      )
        fail(path, "texte invalide (10 000 caractères maximum).");
      return;
    }
    if (typeof template === "boolean") {
      if (typeof input !== "boolean") fail(path, "choix invalide.");
      return;
    }
    if (Array.isArray(template)) {
      if (!Array.isArray(input) || input.length > 60)
        fail(path, "liste invalide (60 éléments maximum).");
      for (const [i, item] of (input as unknown[]).entries())
        walk(
          item,
          path === "Contenu.gallery.items"
            ? resultTemplate
            : path === "Contenu.certificates.items"
              ? certificateTemplate
              : template[0],
          `${path}.${i}`,
        );
      return;
    }
    if (record(template)) {
      if (!record(input)) fail(path, "groupe invalide.");
      const obj = input as Record<string, unknown>;
      if (Object.keys(obj).some((key) => !Object.hasOwn(template, key)))
        fail(path, "champ inconnu.");
      for (const [key, item] of Object.entries(template))
        walk(obj[key], item, `${path}.${key}`);
      return;
    }
    fail(path, "type non autorisé.");
  }
  walk(value, seed, "Contenu");
  const content = value as SiteContent;
  const certificateIds = new Set<string>();
  for (const item of content.certificates.items) {
    const label = `Certificat — ${item.title || "nouveau document"}`;
    if (!/^[a-f0-9-]{36}$/.test(item.id) || certificateIds.has(item.id))
      fail(label, "identifiant unique requis.");
    certificateIds.add(item.id);
    if (item.image && !/^\/media\/[a-f0-9-]{36}$/.test(item.image))
      fail(label, "choisissez une image dans la médiathèque.");
    if (item.verificationUrl && !verificationLink(item.verificationUrl))
      fail(label, "utilisez un lien HTTPS vers la source officielle.");
    for (const value of [item.issuedOn, item.expiresOn])
      if (
        value &&
        (!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
          !Number.isFinite(Date.parse(value)) ||
          new Date(value).toISOString().slice(0, 10) !== value)
      )
        fail(label, "date invalide (AAAA-MM-JJ).");
    if (item.issuedOn && item.expiresOn && item.expiresOn < item.issuedOn)
      fail(label, "la fin de validité précède la délivrance.");
    if (
      item.visible &&
      (!item.verified ||
        ![
          item.title,
          item.holder,
          item.issuer,
          item.scope,
          item.reference,
          item.image,
          item.alt,
          item.verificationUrl,
        ].every((value) => value.trim()))
    )
      fail(
        label,
        "titulaire, émetteur, portée, référence, image, description et source officielle vérifiée requis.",
      );
  }
  const safeLink = (link: string) => {
    if (/^(\/(?!\/)[^\s\\]*|#[a-zA-Z0-9_-]+|tel:\+?[0-9 ()-]+)$/.test(link))
      return true;
    try {
      const url = new URL(link);
      return (
        url.protocol === "https:" &&
        !url.username &&
        !url.password &&
        !/[\s\\]/.test(link)
      );
    } catch {
      return false;
    }
  };
  for (const [group, definition] of Object.entries(fields))
    for (const field of definition.fields)
      if (
        field.kind === "url" &&
        !safeLink(
          (content.copy as unknown as Record<string, Record<string, string>>)[
            group
          ][field.key],
        )
      )
        fail(definition.label, "lien invalide.");
  for (const item of content.navigation)
    if (!item.label.trim() || !/^\/(?!\/)[^\s\\]*$/.test(item.href))
      fail("Navigation", "utilisez un titre et un chemin interne valide.");
  if (
    !/^\+?[0-9 ()-]{7,25}$/.test(content.settings.phone) ||
    !/^[0-9]{7,15}$/.test(content.settings.phone.replace(/\D/g, ""))
  )
    fail("Téléphone", "format invalide.");
  if (!/^\d{7,15}$/.test(content.settings.whatsappNumber))
    fail("WhatsApp", "utilisez 7 à 15 chiffres, sans + ni espaces.");
  try {
    const url = new URL(content.settings.instagram);
    if (
      url.protocol !== "https:" ||
      !["instagram.com", "www.instagram.com"].includes(url.hostname)
    )
      throw new Error();
  } catch {
    fail("Instagram", "utilisez une adresse https://www.instagram.com/.");
  }
  for (const asset of Object.values(content.settings.assets))
    if (
      ![
        "/images/lea-logo.png",
        "/images/lea-logo-rose.png",
        "/images/dr-anil-pehlivan.webp",
        "/images/istanbul.webp",
        "/images/health-turkiye-footer.webp",
      ].includes(asset) &&
      !/^\/media\/[a-f0-9-]{36}$/.test(asset)
    )
      fail("Images", "sélectionnez une image de la médiathèque.");
  const treatmentImages = [
    "/images/operation-homme-vaser-hd.webp",
    "/images/operation-homme-j-plasma.webp",
    "/images/operation-homme-six-pack.webp",
  ];
  const slugs = new Set<string>();
  for (const treatment of content.treatments) {
    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(treatment.slug) ||
      slugs.has(treatment.slug) ||
      treatment.slug === "a-definir" ||
      !treatment.name.trim()
    )
      fail("Interventions", "identifiant unique et nom requis.");
    if (
      treatment.image &&
      !treatmentImages.includes(treatment.image) &&
      !/^\/media\/[a-f0-9-]{36}$/.test(treatment.image)
    )
      fail("Interventions", "sélectionnez une image de la médiathèque.");
    if (treatment.image && !treatment.imageAlt.trim())
      fail(
        "Interventions",
        "décrivez chaque image d’intervention pour les lecteurs d’écran.",
      );
    slugs.add(treatment.slug);
  }
  const caseIds = new Set<string>();
  for (const item of content.gallery.items) {
    const label = `Avant / après — ${item.title || "nouveau dossier"}`;
    if (!/^[a-f0-9-]{36}$/.test(item.id) || caseIds.has(item.id))
      fail(label, "identifiant unique requis.");
    caseIds.add(item.id);
    if (!["photos", "instagram"].includes(item.mode))
      fail(label, "format invalide.");
    for (const asset of [item.beforeImage, item.afterImage])
      if (asset && !/^\/media\/[a-f0-9-]{36}$/.test(asset))
        fail(label, "choisissez les photos dans la médiathèque.");
    if (item.instagramUrl && !instagramPostUrl(item.instagramUrl))
      fail(
        label,
        "indiquez le lien d’une publication Instagram (/p/… ou /reel/…).",
      );
    if (
      item.sourceUrl &&
      (!item.sourceUrl.startsWith("https://") || !safeLink(item.sourceUrl))
    )
      fail(label, "le lien source doit être une adresse HTTPS valide.");
    if (item.treatmentSlug && !slugs.has(item.treatmentSlug))
      fail(label, "intervention inconnue.");
    if (!item.visible) continue;
    if (!item.verified || !item.consentConfirmed)
      fail(
        label,
        "confirmez l’authenticité et l’autorisation de publication, ou masquez ce dossier.",
      );
    if (
      !item.title.trim() ||
      !item.treatmentSlug ||
      !item.caption.trim() ||
      !item.sourceLabel.trim()
    )
      fail(
        label,
        "titre, intervention, légende et source sont requis avant publication.",
      );
    if (
      item.mode === "photos" &&
      (!item.beforeImage ||
        !item.afterImage ||
        item.beforeImage === item.afterImage ||
        !item.beforeAlt.trim() ||
        !item.afterAlt.trim())
    )
      fail(
        label,
        "deux photos distinctes et leurs descriptions sont requises.",
      );
    if (item.mode === "instagram" && !instagramPostUrl(item.instagramUrl))
      fail(label, "le lien de la publication Instagram est requis.");
  }
  for (const treatment of seed.treatments)
    if (!slugs.has(treatment.slug))
      fail(
        "Interventions",
        "conservez les adresses initiales ; vous pouvez masquer une intervention.",
      );
  const pages = new Set([
    "/",
    ...Object.values(content.seo).map((x) => x.path),
    ...content.treatments
      .filter((x) => x.visible)
      .map((x) => `/interventions/${x.slug}`),
  ]);
  const checkPage = (href: string) => {
    if (
      href.startsWith("/") &&
      !pages.has(new URL(href, "https://lea.invalid").pathname)
    )
      fail("Lien interne", "choisissez une page existante et visible.");
  };
  for (const item of content.navigation) checkPage(item.href);
  for (const [group, definition] of Object.entries(fields))
    for (const field of definition.fields)
      if (field.kind === "url")
        checkPage(
          (content.copy as unknown as Record<string, Record<string, string>>)[
            group
          ][field.key],
        );
  for (const group of [content.faqs, content.steps, content.homeSections]) {
    const ids = group.map((x) => x.id);
    if (new Set(ids).size !== ids.length)
      fail("Listes", "identifiants dupliqués.");
  }
  const sectionIds = seed.homeSections.map((x) => x.id);
  if (
    content.homeSections.length !== sectionIds.length ||
    content.homeSections.some((x) => !sectionIds.includes(x.id))
  )
    fail("Accueil", "sections inconnues ou manquantes.");
  if (!content.homeSections.some((x) => x.id === "hero" && x.visible))
    fail("Accueil", "le bloc principal doit rester visible.");
  for (const [key, entry] of Object.entries(content.seo))
    if (entry.path !== (seed.seo as Record<string, { path: string }>)[key].path)
      fail("Référencement", "les adresses des pages existantes sont fixes.");
  return structuredClone(content);
}
