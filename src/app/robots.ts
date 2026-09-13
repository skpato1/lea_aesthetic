import type { MetadataRoute } from "next";
import { getPublished, siteValues } from "@/lib/cms/public";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { site } = siteValues(await getPublished());
  return {
    rules: {
      userAgent: "*",
      ...(site.indexable
        ? { allow: "/", disallow: ["/api/", "/admin", "/media/"] }
        : { disallow: "/" }),
    },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
