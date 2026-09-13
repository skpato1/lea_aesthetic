import type { Metadata } from "next";
import { getCMS, siteValues } from "@/lib/cms/public";
import type { SiteContent } from "@/lib/cms/types";
import { localizePath, ogLocales } from "@/lib/i18n/config";
export async function managedMetadata(
  group: keyof SiteContent["seo"],
): Promise<Metadata> {
  const { content, preview } = await getCMS();
  const entry = content.seo[group];
  return {
    ...(await pageMetadata(entry.title, entry.description, entry.path)),
    ...(preview ? { robots: { index: false, follow: false } } : {}),
  };
}
export async function pageMetadata(
  title: string,
  description: string,
  path: string,
): Promise<Metadata> {
  const { content, locale, languages } = await getCMS();
  const { site } = siteValues(content);
  return {
    title,
    description,
    alternates: {
      canonical: localizePath(path, locale),
      languages: Object.fromEntries([
        ...languages.map((code) => [code, localizePath(path, code)]),
        ["x-default", path],
      ]),
    },
    openGraph: {
      title: `${title} | ${site.name}`,
      description,
      url: `${site.url}${localizePath(path, locale)}`,
      type: "website",
      locale: ogLocales[locale],
      images: [
        {
          url: localizePath("/opengraph-image", locale),
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}
