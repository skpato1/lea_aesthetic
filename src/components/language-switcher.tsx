"use client";
import { Globe2, ChevronDown } from "lucide-react";
import { languageNames, localizePath, isLocale } from "@/lib/i18n/config";
import { useLocale, useTranslate } from "./locale-provider";
import { useHydrated } from "./use-hydrated";
import { useRouter } from "next/navigation";
import { SITE_NAVIGATION_START_EVENT } from "./site-loader";
export function LanguageSwitcher() {
  const { locale, languages } = useLocale();
  const t = useTranslate();
  const ready = useHydrated();
  const router = useRouter();
  return (
    <label className="language-switcher">
      <Globe2 size={17} aria-hidden="true" />
      <span className="sr-only">{t("Choisir la langue")}</span>
      <span className="language-code" aria-hidden="true">
        {locale.toUpperCase()}
      </span>
      <select
        value={locale}
        disabled={!ready}
        onChange={(event) => {
          const next = event.target.value;
          if (isLocale(next)) {
            window.dispatchEvent(new Event(SITE_NAVIGATION_START_EVENT));
            router.replace(
              localizePath(
                window.location.pathname +
                  window.location.search +
                  window.location.hash,
                next,
              ),
            );
          }
        }}
      >
        {[...new Set([...languages, locale])].map((code) => (
          <option key={code} value={code} lang={code}>
            {languageNames[code]}
          </option>
        ))}
      </select>
      <ChevronDown size={13} aria-hidden="true" />
    </label>
  );
}
