import { publicContent } from "@/lib/cms/public";
import Link from "@/components/localized-link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { ContactInvitation, PageIntro } from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("interventions");
}
export default async function Treatments() {
  const { cms, treatments } = await publicContent();
  const copy = cms.copy.interventions;

  return (
    <>
      <PageIntro
        eyebrow={copy.text001}
        title={
          <>
            {copy.text002}
            <br />
            <em>{copy.text003}</em>
          </>
        }
      >
        {copy.text004}
      </PageIntro>
      <section className="container section treatment-overview">
        <p className="treatment-filter-intro">{copy.text005}</p>
        <div className="treatment-grid">
          {treatments.map((t) => (
            <Link
              className={`treatment-card${t.image ? " treatment-card-with-image" : ""}`}
              href={`/interventions/${t.slug}`}
              key={t.slug}
            >
              {t.image && (
                <span className="treatment-card-visual">
                  <Image
                    src={t.image}
                    alt={t.imageAlt}
                    fill
                    sizes="(max-width: 450px) 100vw, (max-width: 760px) 50vw, 33vw"
                    unoptimized={t.image.startsWith("/media/")}
                  />
                </span>
              )}
              <div className="treatment-top">
                <span>{t.category}</span>
                <span>{t.number}</span>
              </div>
              <h2 style={{ fontSize: "1.9rem", marginBottom: 14 }}>{t.name}</h2>
              <p>{t.short}</p>
              <span className="card-arrow">
                <ArrowUpRight size={24} />
              </span>
            </Link>
          ))}
        </div>
        <p className="notice" style={{ marginTop: 35 }}>
          {copy.text006}
        </p>
      </section>
      <ContactInvitation />
    </>
  );
}
