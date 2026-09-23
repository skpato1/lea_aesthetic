"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ArrowUpRight, Expand, Instagram, X } from "lucide-react";
import type { ResultCase, SiteContent } from "@/lib/cms/types";
import { instagramPostUrl } from "@/lib/cms/gallery";
import "./results-gallery.css";
import { useTranslate } from "./locale-provider";

export type PublicResult = Omit<
  ResultCase,
  "verified" | "consentConfirmed" | "visible"
> & { treatment: string };
type Props = {
  copy: Omit<SiteContent["gallery"], "items">;
  items: PublicResult[];
  instagram: string;
  handle: string;
};
const external = { target: "_blank", rel: "noopener noreferrer" };
const subscribe = () => () => {};
const clientReady = () => true;
const serverReady = () => false;
const useReady = () =>
  useSyncExternalStore(subscribe, clientReady, serverReady);

function PhotoPair({
  item,
  eager = false,
}: {
  item: PublicResult;
  eager?: boolean;
}) {
  const t = useTranslate();
  return (
    <div className="result-pair">
      {(["before", "after"] as const).map((side) => (
        <figure key={side}>
          <ResultImage
            src={item[`${side}Image`]}
            alt={item[`${side}Alt`]}
            eager={eager}
          />
          <figcaption>{t(side === "before" ? "Avant" : "Après")}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function ResultImage({
  src,
  alt,
  eager = false,
}: {
  src: string;
  alt: string;
  eager?: boolean;
}) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const syncCachedImage = useCallback((node: HTMLImageElement | null) => {
    if (!node?.complete) return;
    const next = node.naturalWidth > 0 ? "loaded" : "error";
    queueMicrotask(() =>
      setStatus((current) => (current === next ? current : next)),
    );
  }, []);

  return (
    <div
      className={`result-photo is-${status}`}
      aria-busy={status === "loading"}
    >
      <span className="result-photo-placeholder" aria-hidden="true" />
      <Image
        ref={syncCachedImage}
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 760px) 44vw, 26vw"
        unoptimized
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "low" : "auto"}
        decoding="async"
        onLoad={() => setStatus("loaded")}
        onError={() => setStatus("error")}
        style={{ objectFit: "contain" }}
      />
    </div>
  );
}

function InstagramPublication({ item }: { item: PublicResult }) {
  const t = useTranslate();
  const ready = useReady();
  const [loaded, setLoaded] = useState(false);
  const url = instagramPostUrl(item.instagramUrl);
  if (!url) return null;
  return (
    <div className="result-instagram">
      {loaded ? (
        <>
          <iframe
            src={`${url}embed/`}
            title={`${t("Publication Instagram :")} ${item.title}`}
            referrerPolicy="no-referrer"
            allow="encrypted-media; fullscreen"
            loading="lazy"
          />
          <button className="text-link" onClick={() => setLoaded(false)}>
            {t("Fermer le contenu Instagram")}
          </button>
        </>
      ) : (
        <div className="result-instagram-cover">
          <Instagram size={32} aria-hidden="true" />
          <span>{t("Publication Instagram")}</span>
          <button
            className="button button-secondary"
            disabled={!ready}
            onClick={() => setLoaded(true)}
          >
            {t("Afficher la publication")} <ArrowUpRight size={16} />
          </button>
          <p>
            {t(
              "En l’affichant, vous chargez un contenu de Meta. Instagram pourra recevoir votre adresse IP et utiliser ses propres cookies.",
            )}
          </p>
        </div>
      )}
      <a href={url} {...external} className="text-link">
        {t("Ouvrir sur Instagram")} <ArrowUpRight size={15} />
      </a>
    </div>
  );
}

export function ResultsGallery({ copy, items, instagram, handle }: Props) {
  const t = useTranslate();
  const ready = useReady();
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(6);
  const [selected, setSelected] = useState<PublicResult | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const filtered = items.filter(
    (item) => !filter || item.treatmentSlug === filter,
  );
  const categories = [
    ...new Map(
      items.map((item) => [item.treatmentSlug, item.treatment]),
    ).entries(),
  ];
  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    const previousOverflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [selected]);
  return (
    <section
      className="results-section section"
      id="avant-apres"
      aria-labelledby="results-heading"
    >
      <span id="results" className="anchor-alias" />
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              {copy.eyebrow}
            </p>
            <h2 id="results-heading">{copy.title}</h2>
          </div>
          <p>{copy.introduction}</p>
        </div>
        {items.length ? (
          <>
            {categories.length > 1 && (
              <div
                className="result-filters"
                role="group"
                aria-label={t("Filtrer les avant / après par intervention")}
              >
                {[["", t("Toutes les interventions")], ...categories].map(
                  ([slug, label]) => (
                    <button
                      key={slug}
                      disabled={!ready}
                      aria-pressed={filter === slug}
                      onClick={() => {
                        setFilter(slug);
                        setLimit(6);
                      }}
                    >
                      {label}
                    </button>
                  ),
                )}
              </div>
            )}
            <p className="result-count" role="status">
              {filtered.length}{" "}
              {t(
                filtered.length > 1
                  ? "comparaisons présentées"
                  : "comparaison présentée",
              )}
            </p>
            <div className="results-grid">
              {filtered.slice(0, limit).map((item, index) => (
                <article className="result-card" key={item.id}>
                  {item.mode === "photos" ? (
                    <div className="result-visual">
                      <PhotoPair item={item} eager={index < 3} />
                      <button
                        type="button"
                        className="result-expand"
                        disabled={!ready}
                        onClick={() => setSelected(item)}
                        aria-label={`${t("Agrandir :")} ${item.title}`}
                      >
                        <Expand size={17} />
                        <span>{t("Voir en grand")}</span>
                      </button>
                    </div>
                  ) : (
                    <InstagramPublication item={item} />
                  )}
                  <div className="result-description">
                    <span className="result-category">{item.treatment}</span>
                    <h3>{item.title}</h3>
                    <p>{item.caption}</p>
                    {item.interval && (
                      <p className="result-interval">
                        {t("Photo après :")} {item.interval}
                      </p>
                    )}
                    <p className="result-source">
                      {t("Source :")}{" "}
                      {item.sourceUrl ? (
                        <a href={item.sourceUrl} {...external}>
                          {item.sourceLabel} <ArrowUpRight size={13} />
                        </a>
                      ) : (
                        item.sourceLabel
                      )}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            {filtered.length > limit && (
              <button
                type="button"
                className="button button-secondary result-more"
                onClick={() => setLimit(limit + 6)}
              >
                {t("Voir plus de dossiers")}
              </button>
            )}
            <p className="results-disclaimer">
              {t(
                "Chaque situation est individuelle. Ces images ne constituent pas une promesse de résultat. Seule une consultation médicale permet d’évaluer votre projet.",
              )}
            </p>
            <a
              href={instagram}
              {...external}
              className="text-link result-account"
            >
              <Instagram size={18} />
              {copy.instagramLabel}
              <ArrowUpRight size={16} />
            </a>
          </>
        ) : (
          <div className="results-empty">
            <div className="results-empty-symbol" aria-hidden="true">
              <Instagram size={44} strokeWidth={1.2} />
              <span>{handle}</span>
            </div>
            <div>
              <span className="result-category">
                {t("Le compte officiel de LEA")}
              </span>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyText}</p>
              <a className="button" href={instagram} {...external}>
                {copy.instagramLabel}
                <ArrowUpRight size={17} />
              </a>
            </div>
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        className="result-dialog"
        aria-labelledby="result-dialog-title"
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        {selected && (
          <div className="result-dialog-inner">
            <div className="result-dialog-heading">
              <h2 id="result-dialog-title">{selected.title}</h2>
              <button
                type="button"
                autoFocus
                onClick={() => dialog.current?.close()}
                aria-label={t("Fermer l’agrandissement")}
              >
                <X />
              </button>
            </div>
            <PhotoPair key={selected.id} item={selected} eager />
            <p>{selected.caption}</p>
            {selected.interval && (
              <p>
                {t("Photo après :")} {selected.interval}
              </p>
            )}
            <p className="results-disclaimer">
              {t("Résultat individuel, sans garantie d’un résultat similaire.")}
            </p>
          </div>
        )}
      </dialog>
    </section>
  );
}
