import "server-only";
import { headers } from "next/headers";
import { isLocale, type Locale } from "./config";
import { visitTexts } from "./catalog";
import uiSources from "@/content/i18n/ui-fr.json";
import type { SiteContent } from "@/lib/cms/types";

const dictionaries = {
  en: () => import("@/content/i18n/en.json"),
  it: () => import("@/content/i18n/it.json"),
  es: () => import("@/content/i18n/es.json"),
  pt: () => import("@/content/i18n/pt.json"),
  ru: () => import("@/content/i18n/ru.json"),
  tr: () => import("@/content/i18n/tr.json"),
};
export async function requestLocale(): Promise<Locale> {
  const locale = (await headers()).get("x-lea-locale");
  return isLocale(locale) ? locale : "fr";
}
export async function builtinMessages(
  locale: Locale,
): Promise<Record<string, string>> {
  return locale === "fr" ? {} : (await dictionaries[locale]()).default;
}
export async function translationMessages(
  content: SiteContent,
  locale: Locale,
) {
  const builtins = await builtinMessages(locale);
  return locale === "fr"
    ? {}
    : { ...builtins, ...content.translations[locale].messages };
}
export function translate(
  messages: Record<string, string>,
  source: string,
): string {
  return Object.hasOwn(messages, source) && messages[source]?.trim()
    ? messages[source]
    : source;
}
export async function localizedContent(content: SiteContent, locale: Locale) {
  const messages = await translationMessages(content, locale);
  const t = (source: string) => translate(messages, source);
  return {
    content: visitTexts(content, t) as SiteContent,
    ui: Object.fromEntries(uiSources.map((source) => [source, t(source)])),
    t,
  };
}
