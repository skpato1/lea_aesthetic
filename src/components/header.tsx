"use client";
import { Brand } from "@/components/brand";
import Link from "@/components/localized-link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Instagram, Menu, X } from "lucide-react";
import type { SiteContent } from "@/lib/cms/types";
import { useHydrated } from "@/components/use-hydrated";
import { useTranslate } from "./locale-provider";
import { LanguageSwitcher } from "./language-switcher";
import { stripLocale } from "@/lib/i18n/config";
export function Header({
  site,
  navigation,
  copy,
}: {
  site: SiteContent["settings"];
  navigation: SiteContent["navigation"];
  copy: SiteContent["copy"]["header"];
}) {
  const hydrated = useHydrated();
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const trigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (e.key === "Tab") {
        const items =
          header.current?.querySelectorAll<HTMLElement>("a, button, select");
        if (!items) return;
        const visible = [...items].filter((el) => el.offsetParent !== null);
        const first = visible[0],
          last = visible[visible.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <header
      className={`site-header ${open ? "menu-is-open" : ""}`}
      ref={header}
    >
      <div className="header-inner container">
        <Link
          href="/"
          prefetch
          className="brand"
          aria-label={t("LEA Aesthetic, accueil")}
          onClick={() => setOpen(false)}
        >
          <Brand
            src={site.assets.logo}
            alt={copy.text001}
            name={site.name}
            location={site.location}
            priority
          />
        </Link>
        <button
          className="menu-toggle"
          disabled={!hydrated}
          ref={trigger}
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls="main-navigation"
          aria-label={t(open ? "Fermer le menu" : "Ouvrir le menu")}
        >
          {open ? <X /> : <Menu />}
        </button>
        <nav
          id="main-navigation"
          className={open ? "navigation is-open" : "navigation"}
          aria-label={t("Navigation principale")}
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              aria-current={
                stripLocale(pathname) === item.href ? "page" : undefined
              }
              onClick={() => setOpen(false)}
            >
              {item.label}
            </Link>
          ))}
          <a
            className="nav-instagram"
            href={site.instagram}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t("LEA Aesthetic sur Instagram (nouvel onglet)")}
          >
            <Instagram size={20} />
          </a>
          <Link
            href={copy.text002}
            prefetch
            className="nav-contact"
            onClick={() => setOpen(false)}
          >
            {copy.text003}
            <ArrowUpRight size={16} />
          </Link>
        </nav>
        <LanguageSwitcher />
      </div>
    </header>
  );
}
