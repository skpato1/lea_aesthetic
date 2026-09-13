import { publicContent } from "@/lib/cms/public";
import {
  Instagram,
  Phone,
  MapPin,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import { PageIntro } from "@/components/ui";
import { ContactForm } from "@/components/contact-form";
import { deliveryMode } from "@/lib/contact";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("contact");
}
export const dynamic = "force-dynamic";
export default async function Contact({
  searchParams,
}: {
  searchParams: Promise<{ intervention?: string }>;
}) {
  const { cms, site, treatments, whatsapp } = await publicContent();
  const copy = cms.copy.contact;

  const query = await searchParams;
  const selected = treatments.some((t) => t.slug === query.intervention)
    ? query.intervention
    : "";
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
      <section className="container contact-layout">
        <div className="contact-direct">
          <h2>
            {copy.text005}
            <br />
            {copy.text006}
          </h2>
          <p>{copy.text007}</p>
          <div className="contact-method">
            <MessageCircle />
            <div>
              <small>{copy.text008}</small>
              <a
                href={whatsapp(
                  treatments.find((t) => t.slug === selected)?.name,
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{copy.text009}</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="contact-method">
            <Phone />
            <div>
              <small>{copy.text010}</small>
              <a href={site.phoneHref}>
                <span>{site.phone}</span>
              </a>
            </div>
          </div>
          <div className="contact-method">
            <Instagram />
            <div>
              <small>{copy.text011}</small>
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>{site.instagramHandle}</span>
                <ArrowUpRight size={16} />
              </a>
            </div>
          </div>
          <div className="contact-method">
            <MapPin />
            <div>
              <small>{copy.text013}</small>
              <span>{site.location}</span>
            </div>
          </div>
        </div>
        <ContactForm
          initialIntervention={selected}
          mode={deliveryMode()}
          copy={cms.copy.form}
          treatments={treatments}
          whatsappUrl={whatsapp()}
        />
      </section>
    </>
  );
}
