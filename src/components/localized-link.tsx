"use client";
import Link from "next/link";
import type { ComponentProps } from "react";
import { localizePath } from "@/lib/i18n/config";
import { useLocale } from "./locale-provider";
export default function LocalizedLink({
  href,
  ...props
}: ComponentProps<typeof Link>) {
  const { locale } = useLocale();
  return (
    <Link
      {...props}
      href={
        typeof href === "string"
          ? localizePath(href, locale)
          : { ...href, pathname: localizePath(href.pathname || "/", locale) }
      }
    />
  );
}
