import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { SiteFrame } from "@/components/site-frame";
import { publicContent } from "@/lib/cms/public";
import "./globals.css";
import "./i18n.css";
import { LocaleProvider } from "@/components/locale-provider";
import { localizePath, ogLocales } from "@/lib/i18n/config";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const { site, preview, cms, locale, languages } = await publicContent();
  return {
    metadataBase: new URL(site.url),
    title: { default: cms.seo.home.title, template: `%s | ${site.name}` },
    description: cms.seo.home.description,
    alternates: {
      canonical: localizePath("/", locale),
      languages: Object.fromEntries([
        ...languages.map((code) => [code, localizePath("/", code)]),
        ["x-default", "/"],
      ]),
    },
    openGraph: {
      type: "website",
      locale: ogLocales[locale],
      siteName: site.name,
      title: cms.seo.home.title,
      description: cms.seo.home.description,
      images: [
        {
          url: localizePath("/opengraph-image", locale),
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    robots: { index: !preview && site.indexable, follow: !preview },
  };
}
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { cms, site, navigation, preview, locale, languages, ui } =
    await publicContent();
  return (
    <html lang={locale} data-scroll-behavior="smooth">
      <body>
        <LocaleProvider locale={locale} languages={languages} messages={ui}>
          <SiteFrame
            header={
              <Header
                site={site}
                navigation={navigation}
                copy={cms.copy.header}
              />
            }
            footer={<Footer />}
            preview={preview}
          >
            {children}
          </SiteFrame>
        </LocaleProvider>
      </body>
    </html>
  );
}
