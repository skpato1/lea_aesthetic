import { publicContent } from "@/lib/cms/public";
import Link from "@/components/localized-link";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ButtonLink, Eyebrow } from "@/components/ui";
import { pageMetadata } from "@/lib/metadata";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { treatments } = await publicContent();
  const { slug } = await params;
  const t = treatments.find((t) => t.slug === slug);
  return t ? pageMetadata(t.name, t.short, `/interventions/${t.slug}`) : {};
}
export default async function Treatment({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { cms, treatments, whatsapp, t: translate } = await publicContent();
  const copy = cms.copy.treatment;

  const { slug } = await params;
  const t = treatments.find((t) => t.slug === slug);
  if (!t) notFound();
  return (
    <>
      <section
        className={`page-intro container${t.image ? " treatment-page-hero" : ""}`}
      >
        <div>
          <nav className="breadcrumb" aria-label={translate("Fil d’Ariane")}>
            <Link href="/">{copy.text001}</Link>
            <span>/</span>
            <Link href={copy.text002}>{copy.text003}</Link>
            <span>/</span>
            <span aria-current="page">{t.name}</span>
          </nav>
          <Eyebrow>{t.category}</Eyebrow>
          <h1>{t.name}</h1>
          <p className="intro-copy">{t.intro}</p>
        </div>
        {t.image && (
          <div className="treatment-detail-visual">
            <Image
              src={t.image}
              alt={t.imageAlt}
              fill
              sizes="(max-width: 760px) 100vw, 38vw"
              unoptimized={t.image.startsWith("/media/")}
            />
          </div>
        )}
      </section>
      <section className="section container treatment-detail-grid">
        <div>
          <div className="article-block">
            <h2>{copy.text004}</h2>
            <ul>
              {t.aims.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="article-block">
            <h2>{copy.text005}</h2>
            <p>{copy.text006}</p>
            <ul>
              {t.discussion.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="article-block">
            <h2>{copy.text007}</h2>
            <ul>
              {t.questions.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
          <div className="notice" style={{ marginTop: 35 }}>
            {copy.text008}
          </div>
        </div>
        <aside className="treatment-sidebar">
          <Eyebrow>{copy.text009}</Eyebrow>
          <h3>
            {copy.text010}
            <br />
            {t.name.toLowerCase()}
          </h3>
          <p>{copy.text011}</p>
          <ButtonLink href={whatsapp(t.name)} external>
            {copy.text012}
          </ButtonLink>
          <Link className="text-link" href={`/contact?intervention=${t.slug}`}>
            {copy.text013}
            <ArrowUpRight size={16} />
          </Link>
        </aside>
      </section>
      <section className="container related-treatments">
        <h2>{copy.text014}</h2>
        <div>
          {treatments
            .filter((x) => x.slug !== slug)
            .map((x) => (
              <Link key={x.slug} href={`/interventions/${x.slug}`}>
                {x.name} ↗
              </Link>
            ))}
        </div>
      </section>
    </>
  );
}
