import seed from "../../content/cms-seed.json" with { type: "json" };
import type { SiteContent } from "./types";
import { initialTranslations } from "../i18n/config.ts";

const suppliedDuplicateGuideId = "e85c6d31-738f-4076-b70b-f6c73f66b4e6";
const suppliedDuplicateGuideImages = new Set([
  "/images/guides/vaser-360-homme-doublon.jpeg",
  "/images/guides/vaser-360-homme-doublon.webp",
]);

function optimizedImagePath(value: string) {
  if (value === "/images/lea-logo-rose.png")
    return "/images/lea-logo-rose.webp";
  if (value === "/images/dr-teoman-eraslan-cv.jpg")
    return "/images/dr-teoman-eraslan-cv.webp";
  if (/^\/images\/guides\/.+\.jpe?g$/i.test(value))
    return value.replace(/\.jpe?g$/i, ".webp");
  return value;
}

function isSuppliedDuplicateGuide(guide: SiteContent["visualGuides"][number]) {
  return (
    guide.id === suppliedDuplicateGuideId &&
    suppliedDuplicateGuideImages.has(guide.image)
  );
}

export function contentNeedsImageMigration(content: SiteContent) {
  return (
    optimizedImagePath(content.settings.assets.logo || "") !==
      (content.settings.assets.logo || "") ||
    optimizedImagePath(content.settings.assets.teomanPortrait || "") !==
      (content.settings.assets.teomanPortrait || "") ||
    (content.visualGuides || []).some(
      (guide) =>
        isSuppliedDuplicateGuide(guide) ||
        optimizedImagePath(guide.image) !== guide.image,
    )
  );
}

/** Add only the new feature; preserve all existing copy, ordering, media and drafts. */
export function upgradeContent(input: SiteContent): SiteContent {
  const content = structuredClone(input);
  if (!Object.hasOwn(content, "visualGuides"))
    content.visualGuides = structuredClone(seed.visualGuides);
  else
    for (const guide of seed.visualGuides)
      if (!content.visualGuides.some((item) => item.id === guide.id))
        content.visualGuides.push(structuredClone(guide));
  content.visualGuides = content.visualGuides
    .filter((guide) => !isSuppliedDuplicateGuide(guide))
    .map((guide) => ({
      ...guide,
      image: optimizedImagePath(guide.image),
    }));
  const interventionCopy = content.copy.interventions as Record<string, string>;
  for (const [key, value] of Object.entries(seed.copy.interventions))
    if (!Object.hasOwn(interventionCopy, key)) interventionCopy[key] = value;
  const surgeonCopy = content.copy.chirurgien as Record<string, string>;
  const seededSurgeonCopy = seed.copy.chirurgien as Record<string, string>;
  const hasOriginalSurgeonIntroduction =
    surgeonCopy.text001 === "Le chirurgien" &&
    surgeonCopy.text002 === "Dr Anıl" &&
    surgeonCopy.text003 === "Pehlivan.";
  if (hasOriginalSurgeonIntroduction) {
    for (const key of ["text001", "text002", "text003", "text004"])
      surgeonCopy[key] = seededSurgeonCopy[key];
  }
  for (const [key, value] of Object.entries(seededSurgeonCopy))
    if (!Object.hasOwn(surgeonCopy, key)) surgeonCopy[key] = value;
  const surgeonNavigation = content.navigation.find(
    (item) => item.href === "/chirurgien",
  );
  if (surgeonNavigation?.label === "Le chirurgien")
    surgeonNavigation.label = "Les chirurgiens";
  const aboutNavigation = content.navigation.find(
    (item) => item.href === "/agence",
  );
  if (aboutNavigation?.label === "L’agence")
    aboutNavigation.label = "À propos";
  for (const locale of Object.values(content.translations || {})) {
    if (!Object.hasOwn(locale.messages, "L’agence")) continue;
    if (!Object.hasOwn(locale.messages, "À propos"))
      locale.messages["À propos"] = locale.messages["L’agence"];
  }
  if (!Object.hasOwn(content.settings.assets, "teomanPortrait"))
    content.settings.assets.teomanPortrait =
      seed.settings.assets.teomanPortrait;
  content.settings.assets.teomanPortrait = optimizedImagePath(
    content.settings.assets.teomanPortrait,
  );
  content.settings.assets.logo = optimizedImagePath(
    content.settings.assets.logo,
  );
  if (content.seo.chirurgien.title === "Dr Anıl Pehlivan, le chirurgien") {
    content.seo.chirurgien.title = seed.seo.chirurgien.title;
    content.seo.chirurgien.description = seed.seo.chirurgien.description;
  }
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
    content.settings.assets.healthTurkiye = seed.settings.assets.healthTurkiye;
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
  } else if (content.gallery.seedVersion !== seed.gallery.seedVersion) {
    for (const item of seed.gallery.items)
      if (!content.gallery.items.some((current) => current.id === item.id))
        content.gallery.items.push(structuredClone(item));
    content.gallery.seedVersion = seed.gallery.seedVersion;
    const gallerySection = content.homeSections.find(
      (section) => section.id === "gallery",
    );
    if (gallerySection) gallerySection.visible = true;
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
