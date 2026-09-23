import { Fragment } from "react";
import { publicContent } from "@/lib/cms/public";
import { ResultsGallery } from "@/components/results-gallery";
import { Certificates } from "@/components/certificates";
import { certificateIsVisible } from "@/lib/cms/certificates";
import { resultIsVisible } from "@/lib/cms/gallery";
import Image from "next/image";
import Link from "@/components/localized-link";
import {
  ArrowDown,
  ArrowUpRight,
  MapPin,
  HeartHandshake,
  Stethoscope,
  MessagesSquare,
} from "lucide-react";
import {
  ButtonLink,
  ContactInvitation,
  Eyebrow,
  FAQList,
} from "@/components/ui";
export default async function Home() {
  const { cms, site, treatments, steps } = await publicContent();
  const copy = cms.copy.home;
  const { items: certificates, ...certificateCopy } = cms.certificates;
  const { items: galleryItems, ...galleryCopy } = cms.gallery;
  const publicResults = galleryItems.filter(resultIsVisible).map((item) => {
    // Do not serialize private publishing attestations to the browser.
    const {
      verified: _verified,
      consentConfirmed: _consent,
      visible: _visible,
      ...result
    } = item;
    void _verified;
    void _consent;
    void _visible;
    return {
      ...result,
      treatment:
        cms.treatments.find((t) => t.slug === item.treatmentSlug)?.name || "",
    };
  });

  const sections: Record<string, React.ReactNode> = {
    certificates: (
      <Certificates
        copy={certificateCopy}
        items={certificates
          .filter((item) => certificateIsVisible(item))
          .map(({ verified, visible, ...item }) => {
            void verified;
            void visible;
            return item;
          })}
      />
    ),
    hero: (
      <section className="hero container" id="home">
        <div className="hero-copy">
          <Eyebrow>{copy.text001}</Eyebrow>
          <h1>
            {copy.text002}
            <br />
            {copy.text003}
            <br />
            <em>{copy.text004}</em>
            <br />
            {copy.text005}
          </h1>
          <p>{copy.text006}</p>
          <div className="hero-actions">
            <ButtonLink href={copy.text007}>{copy.text008}</ButtonLink>
            <Link href={copy.text009} className="text-link">
              {copy.text010}
              <ArrowUpRight size={16} />
            </Link>
          </div>
          <a className="hero-scroll" href="#about">
            <span>
              <ArrowDown size={15} />
            </span>
            {copy.text011}
          </a>
        </div>
        <div className="hero-visual">
          <div className="hero-image">
            <Image
              src={site.assets.istanbul}
              unoptimized={site.assets.istanbul.startsWith("/media/")}
              alt={copy.text012}
              fill
              sizes="(max-width: 760px) 100vw, 48vw"
              priority
              data-site-loader-priority
            />
            <div className="image-shade" />
            <div className="city-caption">
              <MapPin size={17} />
              <span>
                {copy.text013}
                <small>{copy.text014}</small>
              </span>
            </div>
          </div>
          <div className="hero-note">
            <span className="note-star">✳</span>
            <div>
              {copy.text015}
              <br />
              <em>{copy.text016}</em>
            </div>
            <span className="note-line" />
          </div>
          <span className="hero-side-label">{copy.text017}</span>
        </div>
      </section>
    ),
    principles: (
      <section className="principles-strip">
        <div className="container">
          <span>
            <HeartHandshake />
            {copy.text018}
          </span>
          <span>
            <Stethoscope />
            {copy.text019}
          </span>
          <span>
            <MessagesSquare />
            {copy.text020}
          </span>
        </div>
      </section>
    ),
    agency: (
      <section className="agency-section container section" id="about">
        <span id="about-us" className="anchor-alias" />
        <div>
          <Eyebrow>{copy.text021}</Eyebrow>
          <h2>
            {copy.text022}
            <br />
            <em>{copy.text023}</em>
          </h2>
        </div>
        <div className="agency-copy">
          <p className="large-copy">{copy.text024}</p>
          <p>{copy.text025}</p>
          <p>{copy.text026}</p>
          <Link className="text-link" href={copy.text027}>
            {copy.text028}
            <ArrowUpRight size={17} />
          </Link>
        </div>
      </section>
    ),
    treatments: (
      <section className="treatments-section section" id="services">
        <span id="our-services" className="anchor-alias" />
        <span id="treatments" className="anchor-alias" />
        <div className="container">
          <div className="section-heading">
            <div>
              <Eyebrow>{copy.text029}</Eyebrow>
              <h2>
                {copy.text030}
                <br />
                <em>{copy.text031}</em>
              </h2>
            </div>
            <div>
              <p>
                {copy.text032}
                <br />
                {copy.text033}
              </p>
              <Link href={copy.text034} className="text-link">
                {copy.text035}
                <ArrowUpRight size={17} />
              </Link>
            </div>
          </div>
          <div className="treatment-grid">
            {treatments.map((t) => (
              <Link
                className={`treatment-card${t.image ? " treatment-card-with-image" : ""}`}
                key={t.slug}
                href={`/interventions/${t.slug}`}
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
                <h3>{t.name}</h3>
                <p>{t.short}</p>
                <span className="card-arrow">
                  <ArrowUpRight size={23} />
                  <span className="sr-only">
                    {copy.text036}
                    {t.name}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    ),
    gallery: (
      <ResultsGallery
        copy={galleryCopy}
        items={publicResults}
        instagram={site.instagram}
        handle={site.instagramHandle}
      />
    ),
    surgeon: (
      <section className="surgeon-section section container" id="doctors">
        <span id="our-doctors" className="anchor-alias" />
        <span id="team" className="anchor-alias" />
        <div className="surgeon-image">
          <Image
            src={site.assets.portrait}
            unoptimized={site.assets.portrait.startsWith("/media/")}
            alt={copy.text037}
            fill
            sizes="(max-width:760px) 100vw, 42vw"
          />
          <span className="photo-label">{copy.text038}</span>
        </div>
        <div className="surgeon-copy">
          <Eyebrow>{copy.text039}</Eyebrow>
          <h2>
            {copy.text040}
            <br />
            <em>{copy.text041}</em>
          </h2>
          <p className="surgeon-specialty">{copy.text042}</p>
          <p>{copy.text043}</p>
          <p>{copy.text044}</p>
          <div className="mini-timeline">
            <div>
              <strong>{copy.text045}</strong>
              <span>
                {copy.text046}
                <br />
                {copy.text047}
              </span>
            </div>
            <div>
              <strong>{copy.text048}</strong>
              <span>
                {copy.text049}
                <br />
                {copy.text050}
              </span>
            </div>
          </div>
          <ButtonLink href={copy.text051} secondary>
            {copy.text052}
          </ButtonLink>
        </div>
      </section>
    ),
    journey: (
      <section className="journey-section section" id="process">
        <div className="container">
          <div className="section-heading">
            <div>
              <Eyebrow light>{copy.text053}</Eyebrow>
              <h2>
                {copy.text054}
                <br />
                <em>{copy.text055}</em>
              </h2>
            </div>
            <ButtonLink href={copy.text056} secondary>
              {copy.text057}
            </ButtonLink>
          </div>
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div key={step.title}>
                <span className="step-number">
                  {copy.text058}
                  {i + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
          <p className="journey-note">{copy.text059}</p>
        </div>
      </section>
    ),
    faq: (
      <section className="home-faq section container" id="faq">
        <span id="testimonials" className="anchor-alias legacy-testimonials" />
        <div>
          <Eyebrow>{copy.text060}</Eyebrow>
          <h2>
            {copy.text061}
            <br />
            <em>{copy.text062}</em>
          </h2>
          <Link href={copy.text063} className="text-link">
            {copy.text064}
            <ArrowUpRight size={17} />
          </Link>
        </div>
        <FAQList limit={4} />
      </section>
    ),
    contact: (
      <div id="appointment">
        <span id="contact-us" className="anchor-alias" />
        <span id="contact" className="anchor-alias" />
        <ContactInvitation />
      </div>
    ),
  };
  const aliases: Record<string, string[]> = {
    hero: ["home"],
    agency: ["about", "about-us"],
    treatments: ["services", "our-services", "treatments"],
    gallery: ["avant-apres", "results"],
    certificates: ["certificats"],
    surgeon: ["doctors", "our-doctors", "team"],
    journey: ["process"],
    faq: ["faq", "testimonials"],
    contact: ["appointment", "contact-us", "contact"],
  };
  return (
    <>
      {cms.homeSections.map((section) => (
        <Fragment key={section.id}>
          {section.visible
            ? sections[section.id]
            : (aliases[section.id] || []).map((id) => (
                <span id={id} className="anchor-alias" key={id} />
              ))}
        </Fragment>
      ))}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: site.name,
            url: site.url,
            telephone: site.phone,
            logo: `${site.url}${site.assets.logo}`,
            sameAs: [site.instagram],
            description: site.description,
          }).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
