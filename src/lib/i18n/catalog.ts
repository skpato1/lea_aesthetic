import type { SiteContent } from "../cms/types";
import uiSources from "../../content/i18n/ui-fr.json" with { type: "json" };

const technical = new Set([
  "id",
  "slug",
  "href",
  "path",
  "number",
  "mode",
  "treatmentSlug",
  "beforeImage",
  "afterImage",
  "instagramUrl",
  "sourceUrl",
  "phone",
  "instagram",
  "whatsappNumber",
  "instagramHandle",
  "image",
  "issuedOn",
  "expiresOn",
  "reference",
  "verificationUrl",
  "holder",
  "issuer",
]);
export function isText(value: string, path: string[]): boolean {
  return (
    !path.includes("translations") &&
    !path.includes("assets") &&
    !technical.has(path.at(-1) || "") &&
    !!value.trim() &&
    !/^(?:\/|#|https?:|tel:)/.test(value) &&
    !/^[\d\s.,+–—-]+$/.test(value)
  );
}
export function visitTexts(
  input: unknown,
  visitor: (source: string, path: string[]) => string,
  path: string[] = [],
): unknown {
  if (typeof input === "string")
    return isText(input, path) ? visitor(input, path) : input;
  if (Array.isArray(input))
    return input.map((value, index) =>
      visitTexts(value, visitor, [...path, String(index)]),
    );
  if (input && typeof input === "object")
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        key,
        key === "translations"
          ? value
          : visitTexts(value, visitor, [...path, key]),
      ]),
    );
  return input;
}
export function contentCatalog(content: SiteContent) {
  const entries = new Map<string, string[]>();
  visitTexts(content, (source, path) => {
    entries.set(source, [...(entries.get(source) || []), path.join(".")]);
    return source;
  });
  for (const source of uiSources)
    entries.set(source, [...(entries.get(source) || []), "interface"]);
  return [...entries].map(([source, contexts]) => ({ source, contexts }));
}
