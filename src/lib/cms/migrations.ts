import seed from "../../content/cms-seed.json" with { type: "json" };
import type { SiteContent } from "./types";
import { initialTranslations } from "../i18n/config.ts";

/** Add only the new feature; preserve all existing copy, ordering, media and drafts. */
export function upgradeContent(input: SiteContent): SiteContent {
  const content = structuredClone(input);
  for (const template of seed.treatments) {
    const treatment = content.treatments.find(
      (item) => item.slug === template.slug,
    );
    if (!treatment) {
      content.treatments.push(structuredClone(template));
      continue;
    }
    if (!Object.hasOwn(treatment, "image")) treatment.image = template.image;
    if (!Object.hasOwn(treatment, "imageAlt"))
      treatment.imageAlt = template.imageAlt;
  }
  if (!content.copy.interventions.text005.includes("Opérations pour homme"))
    content.copy.interventions.text005 += " · Opérations pour homme";
  if (!Object.hasOwn(content.settings.assets, "healthTurkiye"))
    content.settings.assets.healthTurkiye =
      seed.settings.assets.healthTurkiye;
  if (!Object.hasOwn(content, "certificates")) {
    content.certificates = structuredClone(seed.certificates);
    const index = content.homeSections.findIndex(
      (section) => section.id === "surgeon",
    );
    if (!content.homeSections.some((section) => section.id === "certificates"))
      content.homeSections.splice(
        index < 0 ? content.homeSections.length : index + 1,
        0,
        { id: "certificates", visible: true },
      );
  }
  if (!Object.hasOwn(content, "translations"))
    content.translations = initialTranslations();
  if (!Object.hasOwn(content, "gallery")) {
    content.gallery = structuredClone(seed.gallery);
    if (!content.homeSections.some((section) => section.id === "gallery")) {
      const index = content.homeSections.findIndex(
        (section) => section.id === "treatments",
      );
      content.homeSections.splice(
        index < 0 ? content.homeSections.length : index + 1,
        0,
        { id: "gallery", visible: true },
      );
    }
    content.copy.legal.text033 = content.copy.legal.text033
      .replace(
        "Le site n’intègre ni outil publicitaire, ni mesure d’audience, ni cookie de suivi.",
        "Le site n’intègre pas d’outil publicitaire ni de mesure d’audience. Aucun contenu Instagram ni cookie tiers n’est chargé par défaut.",
      )
      .replace(
        "Aucun flux Instagram ni lecteur externe n’est intégré.",
        "Dans la galerie avant / après, le bouton « Afficher la publication » charge un lecteur Instagram de Meta. Ce service peut alors recevoir votre adresse IP et utiliser ses propres cookies. Le choix reste limité à cette publication et à cette visite ; vous pouvez fermer le lecteur. Un lien permet aussi de consulter directement la publication sur Instagram.",
      );
  }
  return content;
}

export function restoreContent(input: SiteContent): SiteContent {
  const content = upgradeContent(input);
  content.certificates.items = content.certificates.items.map((item) => ({
    ...item,
    verified: false,
    visible: false,
  }));
  // A historical permission must not silently reinstate a withdrawn patient photo.
  content.gallery.items = content.gallery.items.map((item) => ({
    ...item,
    visible: false,
    verified: false,
    consentConfirmed: false,
  }));
  return content;
}
