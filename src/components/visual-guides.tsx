"use client";
/* eslint-disable @next/next/no-img-element -- Admin-selected media keeps its natural ratio in the dialog. */
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ArrowUpRight, Expand, X } from "lucide-react";
import Link from "@/components/localized-link";
import type { SiteContent } from "@/lib/cms/types";
import styles from "./visual-guides.module.css";

type Guide = SiteContent["visualGuides"][number];
type GuideCopy = SiteContent["copy"]["interventions"];

export function VisualGuides({
  guides,
  copy,
  compact = false,
}: {
  guides: Guide[];
  copy: GuideCopy;
  compact?: boolean;
}) {
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<Guide | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const categories = useMemo(
    () => [...new Set(guides.map((guide) => guide.category))],
    [guides],
  );
  const displayed = category
    ? guides.filter((guide) => guide.category === category)
    : guides;

  useEffect(() => {
    if (!selected || !dialog.current || dialog.current.open) return;
    dialog.current.showModal();
    dialog.current.querySelector<HTMLElement>("button")?.focus();
  }, [selected]);

  if (!guides.length) return null;

  const close = () => {
    dialog.current?.close();
    setSelected(null);
  };

  return (
    <section
      className={`${styles.section}${compact ? ` ${styles.compact}` : ""}`}
      id={compact ? undefined : "guides-visuels"}
      aria-labelledby={compact ? undefined : "visual-guides-title"}
    >
      <div className="container">
        {!compact && (
          <div className={styles.heading}>
            <div>
              <p className="eyebrow">{copy.text007}</p>
              <h2 id="visual-guides-title">{copy.text008}</h2>
              <p>{copy.text009}</p>
            </div>
            <div className={styles.notice}>
              <span>{copy.text010}</span>
              <p>{copy.text011}</p>
            </div>
          </div>
        )}

        {!compact && categories.length > 1 && (
          <div className={styles.filters} aria-label={copy.text012}>
            <button
              type="button"
              aria-pressed={!category}
              onClick={() => setCategory("")}
            >
              {copy.text012}
            </button>
            {categories.map((item) => (
              <button
                type="button"
                key={item}
                aria-pressed={category === item}
                onClick={() => setCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>
        )}

        <div className={styles.grid}>
          {displayed.map((guide) => (
            <article className={styles.card} key={guide.id}>
              <button
                type="button"
                className={styles.preview}
                onClick={() => setSelected(guide)}
                aria-label={`${copy.text013} : ${guide.title}`}
              >
                <Image
                  src={guide.image}
                  alt={guide.imageAlt}
                  fill
                  sizes={
                    compact
                      ? "(max-width: 760px) 100vw, 42vw"
                      : "(max-width: 680px) 100vw, (max-width: 1050px) 50vw, 33vw"
                  }
                  unoptimized={guide.image.startsWith("/media/")}
                />
                <span className={styles.badge}>{copy.text010}</span>
                <span className={styles.expand} aria-hidden="true">
                  <Expand size={18} />
                </span>
              </button>
              <div className={styles.cardBody}>
                <p>{guide.category}</p>
                <h3>{guide.title}</h3>
                <span>{guide.summary}</span>
                <button type="button" onClick={() => setSelected(guide)}>
                  {copy.text013}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>

        {!compact && <p className={styles.availability}>{copy.text016}</p>}
      </div>

      {selected && (
        <dialog
          ref={dialog}
          className={styles.dialog}
          aria-labelledby="visual-guide-dialog-title"
          onCancel={(event) => {
            event.preventDefault();
            close();
          }}
          onClose={() => setSelected(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div className={styles.dialogPanel}>
            <header>
              <div>
                <span>{selected.category}</span>
                <h2 id="visual-guide-dialog-title">{selected.title}</h2>
              </div>
              <button
                type="button"
                className={styles.close}
                onClick={close}
                aria-label={copy.text014}
              >
                <X size={22} aria-hidden="true" />
              </button>
            </header>
            <div className={styles.fullImage}>
              <img src={selected.image} alt={selected.imageAlt} />
            </div>
            <div className={styles.dialogFooter}>
              <div>
                <strong>{copy.text010}</strong>
                <p>{copy.text011}</p>
                <small>{copy.text017}</small>
              </div>
              {selected.treatmentSlug && (
                <Link href={`/interventions/${selected.treatmentSlug}`}>
                  {copy.text015}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              )}
            </div>
          </div>
        </dialog>
      )}
    </section>
  );
}
