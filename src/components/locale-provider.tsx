"use client";
import { createContext, useContext } from "react";
import type { Locale } from "@/lib/i18n/config";
const Context = createContext<{
  locale: Locale;
  languages: Locale[];
  messages: Record<string, string>;
}>({ locale: "fr", languages: ["fr"], messages: {} });
export function LocaleProvider({
  children,
  ...value
}: {
  locale: Locale;
  languages: Locale[];
  messages: Record<string, string>;
  children: React.ReactNode;
}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useLocale() {
  return useContext(Context);
}
export function useTranslate() {
  const { messages } = useLocale();
  return (source: string) =>
    Object.hasOwn(messages, source) ? messages[source] : source;
}
