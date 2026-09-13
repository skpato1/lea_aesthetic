import type { MetadataRoute } from "next";
import { getPublished, siteValues } from "@/lib/cms/public";
import { enabledLocales, localizePath } from "@/lib/i18n/config";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const content = await getPublished();
  const { site, treatments } = siteValues(content);
  const languages = enabledLocales(content.translations);
  return [
    "",
    "/agence",
    "/interventions",
    ...treatments.map((t) => `/interventions/${t.slug}`),
    "/chirurgien",
    "/parcours",
    "/faq",
    "/contact",
    "/informations-legales",
  ].flatMap((path) =>
    languages.map((locale) => ({
      url: `${site.url}${localizePath(path || "/", locale)}`,
      alternates: {
        languages: Object.fromEntries(
          languages.map((code) => [
            code,
            `${site.url}${localizePath(path || "/", code)}`,
          ]),
        ),
      },
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : 0.7,
    })),
  );
}
