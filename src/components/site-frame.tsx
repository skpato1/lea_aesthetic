"use client";
import { usePathname } from "next/navigation";
import { useTranslate } from "./locale-provider";
export function SiteFrame({
  children,
  header,
  footer,
  loader,
  preview,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  loader: React.ReactNode;
  preview: boolean;
}) {
  const path = usePathname();
  const t = useTranslate();
  if (path.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      {loader}
      {preview && (
        <div className="preview-banner">
          {t("Aperçu du brouillon — visible uniquement dans votre session.")}{" "}
          <a href="/admin">
            {t("Revenir au panneau pour publier ou quitter l’aperçu")}
          </a>
        </div>
      )}
      <a href="#contenu" className="skip-link">
        {t("Aller au contenu")}
      </a>
      {header}
      <main id="contenu">{children}</main>
      {footer}
    </>
  );
}
