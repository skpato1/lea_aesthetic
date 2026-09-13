import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { contentState } from "./store";
import { session, PREVIEW_COOKIE } from "./auth";
import type { SiteContent } from "./types";
import { localizedContent, requestLocale } from "@/lib/i18n/server";
import { enabledLocales } from "@/lib/i18n/config";
export const getCMS = cache(async () => {
  const state = await contentState();
  const preview =
    (await cookies()).get(PREVIEW_COOKIE)?.value === "1" && !!(await session());
  const source = preview ? state.draft : state.published;
  const locale = await requestLocale();
  return {
    ...(await localizedContent(source, locale)),
    locale,
    languages: enabledLocales(source.translations),
    preview,
  };
});
export async function getPublished() {
  return (await contentState()).published;
}
export function siteValues(content: SiteContent) {
  const site = {
    ...content.settings,
    url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    phoneHref: `tel:${content.settings.phone.replace(/[^+0-9]/g, "")}`,
  };
  const whatsapp = (treatment?: string) =>
    `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(treatment ? site.whatsappTreatment.replaceAll("{intervention}", treatment) : site.whatsappGeneral)}`;
  return {
    site,
    whatsapp,
    treatments: content.treatments.filter((x) => x.visible),
    steps: content.steps,
    navigation: content.navigation,
    faqs: content.faqs.filter((x) => x.visible),
  };
}
export async function publicContent() {
  const { content, ...context } = await getCMS();
  return { cms: content, ...context, ...siteValues(content) };
}
