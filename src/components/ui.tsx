import Link from "@/components/localized-link";
import { ArrowUpRight, ArrowRight, MessageCircle, Plus } from "lucide-react";
import { publicContent } from "@/lib/cms/public";
import type { ReactNode } from "react";
export function ButtonLink({
  href,
  children,
  secondary = false,
  external = false,
  className = "",
}: {
  href: string;
  children: ReactNode;
  secondary?: boolean;
  external?: boolean;
  className?: string;
}) {
  return (
    <Link
      className={`button ${secondary ? "button-secondary" : ""} ${className}`}
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      {external ? <ArrowUpRight size={17} /> : <ArrowRight size={17} />}
    </Link>
  );
}
export function Eyebrow({
  children,
  light = false,
}: {
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <p className={`eyebrow ${light ? "eyebrow-light" : ""}`}>
      <span />
      {children}
    </p>
  );
}
export function PageIntro({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="page-intro container">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1>{title}</h1>
      <p className="intro-copy">{children}</p>
    </section>
  );
}
export async function FAQList({ limit }: { limit?: number }) {
  const { cms, faqs } = await publicContent();
  const copy = cms.copy.invitation;
  const selected = limit
    ? faqs.filter((x) => x.featured).slice(0, limit)
    : faqs;
  return (
    <div className="faq-list">
      {selected.map((faq, i) => (
        <details key={faq.question}>
          <summary>
            <span className="faq-number">
              {copy.text001}
              {i + 1}
            </span>
            {faq.question}
            <Plus size={20} />
          </summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
export async function ContactInvitation() {
  const { cms, whatsapp } = await publicContent();
  const copy = cms.copy.invitation;
  return (
    <section className="contact-invitation container">
      <div>
        <Eyebrow>{copy.text002}</Eyebrow>
        <h2>
          {copy.text003}
          <br />
          <em>{copy.text004}</em>
        </h2>
        <p>{copy.text005}</p>
      </div>
      <div className="invitation-actions">
        <ButtonLink href={copy.text006}>{copy.text007}</ButtonLink>
        <a
          className="text-link"
          href={whatsapp()}
          target="_blank"
          rel="noopener noreferrer"
        >
          <MessageCircle size={19} /> {copy.text008} <ArrowUpRight size={16} />
        </a>
      </div>
    </section>
  );
}
