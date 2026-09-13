"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, FileCheck2, X } from "lucide-react";
import Link from "./localized-link";
import type { Certificate } from "@/lib/cms/certificates";
import type { SiteContent } from "@/lib/cms/types";
import { useHydrated } from "./use-hydrated";
import { useLocale } from "./locale-provider";
import "./certificates.css";
type PublicCertificate = Omit<Certificate, "verified" | "visible">;
export function Certificates({
  copy,
  items,
}: {
  copy: Omit<SiteContent["certificates"], "items">;
  items: PublicCertificate[];
}) {
  const [selected, setSelected] = useState<PublicCertificate | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const ready = useHydrated();
  const { locale } = useLocale();
  const date = (value: string) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "long",
      timeZone: "UTC",
    }).format(new Date(`${value}T12:00:00Z`));
  useEffect(() => {
    if (!selected) return;
    const element = dialog.current;
    const overflow = document.body.style.overflow;
    element?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      element?.close();
      document.body.style.overflow = overflow;
    };
  }, [selected]);
  return (
    <section
      id="certificats"
      className="certificates-section section"
      aria-labelledby="certificates-title"
    >
      <div className="container">
        <div className="section-heading">
          <div>
            <p className="eyebrow">
              <span />
              {copy.eyebrow}
            </p>
            <h2 id="certificates-title">{copy.title}</h2>
          </div>
          <p>{copy.introduction}</p>
        </div>
        {items.length ? (
          <div className="certificates-grid">
            {items.map((item) => (
              <article key={item.id} className="certificate-card">
                <button
                  className="certificate-preview"
                  disabled={!ready}
                  onClick={() => setSelected(item)}
                  aria-label={`${copy.viewLabel} : ${item.title}`}
                >
                  <Image
                    src={item.image}
                    alt={item.alt}
                    fill
                    unoptimized
                    sizes="(max-width: 760px) 90vw, 42vw"
                    style={{ objectFit: "contain" }}
                  />
                  <span>
                    {copy.viewLabel}
                    <ArrowUpRight size={16} />
                  </span>
                </button>
                <div className="certificate-body">
                  <h3>{item.title}</h3>
                  <dl>
                    {[
                      [copy.holderLabel, item.holder],
                      [copy.issuerLabel, item.issuer],
                      [copy.referenceLabel, item.reference],
                      [copy.scopeLabel, item.scope],
                      ...(item.issuedOn
                        ? [[copy.issuedLabel, date(item.issuedOn)]]
                        : []),
                      ...(item.expiresOn
                        ? [[copy.expiresLabel, date(item.expiresOn)]]
                        : []),
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <a
                    href={item.verificationUrl}
                    className="text-link"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {copy.sourceLabel}
                    <ArrowUpRight size={16} />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="certificates-empty">
            <FileCheck2 size={42} strokeWidth={1.2} aria-hidden="true" />
            <div>
              <h3>{copy.emptyTitle}</h3>
              <p>{copy.emptyText}</p>
              <Link href="/contact" className="text-link">
                {copy.contactLabel}
                <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        )}
      </div>
      <dialog
        ref={dialog}
        className="certificate-dialog"
        onClose={() => setSelected(null)}
        aria-labelledby="certificate-dialog-title"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current.close();
        }}
      >
        {selected && (
          <div>
            <div className="certificate-dialog-heading">
              <h2 id="certificate-dialog-title">{selected.title}</h2>
              <button
                autoFocus
                onClick={() => dialog.current?.close()}
                aria-label={copy.closeLabel}
              >
                <X />
              </button>
            </div>
            <div className="certificate-full-image">
              <Image
                src={selected.image}
                alt={selected.alt}
                fill
                unoptimized
                sizes="90vw"
                style={{ objectFit: "contain" }}
              />
            </div>
            <p>
              {copy.holderLabel} : {selected.holder}
            </p>
            <a
              className="text-link"
              href={selected.verificationUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {copy.sourceLabel}
              <ArrowUpRight size={16} />
            </a>
          </div>
        )}
      </dialog>
    </section>
  );
}
