"use client";
import { useTranslate } from "@/components/locale-provider";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = useTranslate();
  return (
    <section className="container not-found">
      <h1>
        {t("Une interruption")}
        <br />
        <em>{t("momentanée.")}</em>
      </h1>
      <p>
        {t(
          "La page n’a pas pu être chargée. Vous pouvez réessayer ou nous contacter sur WhatsApp depuis le bouton en bas de l’écran.",
        )}
      </p>
      <button className="button" onClick={reset}>
        {t("Réessayer")}
      </button>
    </section>
  );
}
