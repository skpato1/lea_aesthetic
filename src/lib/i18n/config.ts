export const locales = ["fr", "en", "it", "es", "pt", "ru", "tr"] as const;
export type Locale = (typeof locales)[number];
export type TranslationLocale = Exclude<Locale, "fr">;
export const languageNames: Record<Locale, string> = {
  fr: "Français",
  en: "English",
  it: "Italiano",
  es: "Español",
  pt: "Português",
  ru: "Русский",
  tr: "Türkçe",
};
export const ogLocales: Record<Locale, string> = {
  fr: "fr_FR",
  en: "en_GB",
  it: "it_IT",
  es: "es_ES",
  pt: "pt_PT",
  ru: "ru_RU",
  tr: "tr_TR",
};
export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (locales as readonly string[]).includes(value)
  );
}
export function localeFromPath(path: string): Locale {
  const value = path.split("/")[1];
  return isLocale(value) ? value : "fr";
}
export function stripLocale(path: string): string {
  return /^\/(fr|en|it|es|pt|ru|tr)(?=\/|[?#]|$)/.test(path)
    ? path.replace(/^\/(fr|en|it|es|pt|ru|tr)/, "") || "/"
    : path;
}
export function localizePath(path: string, locale: Locale): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const clean = stripLocale(path);
  if (
    /^\/(admin|api|media|images|fonts|_next)(\/|$)/.test(clean) ||
    /\.[a-z0-9]+(?:[?#]|$)/i.test(clean)
  )
    return clean;
  const normalized = clean.startsWith("/") ? clean : `/${clean}`;
  return locale === "fr"
    ? normalized
    : `/${locale}${normalized === "/" ? "" : normalized.replace(/^\/(?=[?#])/, "")}`;
}
export type Translations = Record<
  TranslationLocale,
  { enabled: boolean; messages: Record<string, string> }
>;
export function initialTranslations(): Translations {
  return Object.fromEntries(
    locales
      .filter((locale) => locale !== "fr")
      .map((locale) => [locale, { enabled: true, messages: {} }]),
  ) as Translations;
}
export function enabledLocales(translations: Translations): Locale[] {
  return locales.filter(
    (locale) => locale === "fr" || translations[locale]?.enabled,
  );
}
