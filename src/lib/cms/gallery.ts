import type { ResultCase, SiteContent } from "./types";
import { certificateIsVisible } from "./certificates.ts";

// Validation template only: never inserted as a patient result into the seed.
export const resultTemplate: ResultCase = {
  id: "",
  title: "",
  treatmentSlug: "",
  caption: "",
  interval: "",
  mode: "photos",
  beforeImage: "",
  afterImage: "",
  beforeAlt: "",
  afterAlt: "",
  instagramUrl: "",
  sourceLabel: "",
  sourceUrl: "",
  verified: false,
  consentConfirmed: false,
  visible: false,
};
const mediaPath = (value: unknown): value is string =>
  typeof value === "string" && /^\/media\/[a-f0-9-]{36}$/.test(value);
const nonempty = (value: unknown) =>
  typeof value === "string" && value.trim().length > 0;
export const resultIsVisible = (item: ResultCase) =>
  !!item &&
  item.visible === true &&
  item.verified === true &&
  item.consentConfirmed === true &&
  [item.title, item.treatmentSlug, item.caption, item.sourceLabel].every(
    nonempty,
  ) &&
  (item.mode === "photos"
    ? mediaPath(item.beforeImage) &&
      mediaPath(item.afterImage) &&
      item.beforeImage !== item.afterImage &&
      nonempty(item.beforeAlt) &&
      nonempty(item.afterAlt)
    : item.mode === "instagram" && !!instagramPostUrl(item.instagramUrl));

export function resetChangedApprovals(
  previous: SiteContent,
  next: SiteContent,
) {
  const sourceKeys = [
    "mode",
    "beforeImage",
    "afterImage",
    "instagramUrl",
    "sourceLabel",
    "sourceUrl",
  ] as const;
  for (const item of next.gallery.items) {
    const old = previous.gallery.items.find((entry) => entry.id === item.id);
    if (
      old &&
      (old.verified || old.consentConfirmed) &&
      sourceKeys.some((key) => old[key] !== item[key])
    ) {
      item.visible = false;
      item.verified = false;
      item.consentConfirmed = false;
    }
  }
}

export function instagramPostUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      !["www.instagram.com", "instagram.com"].includes(url.hostname)
    )
      return null;
    const match = url.pathname.match(
      /^\/(?:[A-Za-z0-9._]+\/)?(p|reel)\/([A-Za-z0-9_-]+)\/?$/,
    );
    return match ? `https://www.instagram.com/${match[1]}/${match[2]}/` : null;
  } catch {
    return null;
  }
}

/** Public media excludes hidden cases, including when the whole section is hidden. */
export function contentAssets(
  content: SiteContent,
  publicOnly = false,
): string[] {
  const cases = publicOnly
    ? content.homeSections.some(
        (section) => section.id === "gallery" && section.visible,
      )
      ? content.gallery.items.filter(resultIsVisible)
      : []
    : content.gallery.items;
  return [
    ...(!publicOnly ||
    content.homeSections.some(
      (section) => section.id === "certificates" && section.visible,
    )
      ? (content.certificates?.items || [])
          .filter((item) => !publicOnly || certificateIsVisible(item))
          .map((item) => item.image)
          .filter(Boolean)
      : []),
    ...Object.values(content.settings.assets),
    ...content.treatments
      .filter((item) => !publicOnly || item.visible)
      .map((item) => item.image)
      .filter(Boolean),
    ...content.visualGuides
      .filter((item) => !publicOnly || item.visible)
      .map((item) => item.image)
      .filter(Boolean),
    ...cases.flatMap((item) =>
      !publicOnly || item.mode === "photos"
        ? [item.beforeImage, item.afterImage].filter(Boolean)
        : [],
    ),
  ];
}
