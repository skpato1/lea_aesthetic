import Image from "next/image";
import {
  ButtonLink,
  ContactInvitation,
  Eyebrow,
  PageIntro,
} from "@/components/ui";
import { publicContent } from "@/lib/cms/public";
import { managedMetadata } from "@/lib/metadata";

export async function generateMetadata() {
  return managedMetadata("chirurgien");
}

export default async function Surgeons() {
  const { cms, site } = await publicContent();
  const copy = cms.copy.chirurgien;
  const teomanPortrait = site.assets.teomanPortrait;

  return (
    <>
      <PageIntro
        eyebrow={copy.text001}
        title={
          <>
            {copy.text002}
            <em>{copy.text003}</em>
          </>
        }
      >
        {copy.text004}
      </PageIntro>

      <section
        className="container doctor-directory"
        aria-labelledby="doctor-directory-title"
      >
        <div className="doctor-directory-heading">
          <Eyebrow>{copy.text025}</Eyebrow>
          <h2 id="doctor-directory-title">{copy.text001}</h2>
        </div>
        <div className="doctor-selector-grid">
          <a className="doctor-selector-card" href="#anil-pehlivan">
            <span className="doctor-card-visual">
              <Image
                src={site.assets.portrait}
                unoptimized={site.assets.portrait.startsWith("/media/")}
                alt=""
                fill
                sizes="(max-width: 760px) 34vw, 180px"
              />
            </span>
            <span className="doctor-card-copy">
              <small>01</small>
              <strong>{copy.text026}</strong>
              <span>{copy.text027}</span>
              <em>{copy.text028}</em>
            </span>
          </a>
          <a className="doctor-selector-card" href="#teoman-eraslan">
            <span className="doctor-card-visual doctor-cv-crop">
              <Image
                src={teomanPortrait}
                unoptimized={teomanPortrait.startsWith("/media/")}
                alt=""
                fill
                sizes="(max-width: 760px) 34vw, 180px"
              />
            </span>
            <span className="doctor-card-copy">
              <small>02</small>
              <strong>{copy.text029}</strong>
              <span>{copy.text030}</span>
              <em>{copy.text031}</em>
            </span>
          </a>
        </div>
      </section>

      <section
        id="anil-pehlivan"
        className="section container surgeon-section doctor-page doctor-profile"
      >
        <div className="surgeon-image">
          <Image
            src={site.assets.portrait}
            unoptimized={site.assets.portrait.startsWith("/media/")}
            alt={copy.text005}
            fill
            sizes="(max-width:760px) 100vw, 45vw"
            priority
          />
          <span className="photo-label">{copy.text006}</span>
        </div>
        <div className="surgeon-copy">
          <Eyebrow>{copy.text007}</Eyebrow>
          <h2>
            {copy.text008}
            <br />
            <em>{copy.text009}</em>
          </h2>
          <p style={{ marginTop: 26 }}>{copy.text010}</p>
          <div className="education-list">
            <div className="education-item">
              <strong>{copy.text011}</strong>
              <div>
                <h3>{copy.text012}</h3>
                <p>
                  {copy.text013}
                  <br />
                  {copy.text014}
                </p>
              </div>
            </div>
            <div className="education-item">
              <strong>{copy.text015}</strong>
              <div>
                <h3>{copy.text016}</h3>
                <p>
                  {copy.text017}
                  <br />
                  {copy.text018}
                  <br />
                  {copy.text019}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="teoman-eraslan"
        className="section container surgeon-section doctor-page doctor-profile doctor-profile-alternate"
      >
        <div className="surgeon-image doctor-cv-crop">
          <Image
            src={teomanPortrait}
            unoptimized={teomanPortrait.startsWith("/media/")}
            alt={copy.text032}
            fill
            sizes="(max-width:760px) 100vw, 45vw"
          />
          <span className="photo-label">{copy.text033}</span>
        </div>
        <div className="surgeon-copy">
          <Eyebrow>{copy.text034}</Eyebrow>
          <h2>
            {copy.text035}
            <br />
            <em>{copy.text036}</em>
          </h2>
          <p style={{ marginTop: 26 }}>{copy.text037}</p>
          <div className="doctor-facts">
            <article>
              <span>01</span>
              <h3>{copy.text038}</h3>
              <p>{copy.text039}</p>
              <p>{copy.text040}</p>
            </article>
            <article>
              <span>02</span>
              <h3>{copy.text041}</h3>
              <p>{copy.text042}</p>
            </article>
          </div>
        </div>
      </section>

      <section
        className="container doctor-details-grid"
        aria-label={copy.text043}
      >
        <article className="doctor-detail-panel doctor-expertise-panel">
          <Eyebrow>{copy.text043}</Eyebrow>
          <div className="expertise-tags">
            {[
              copy.text044,
              copy.text045,
              copy.text046,
              copy.text047,
              copy.text048,
              copy.text049,
              copy.text050,
            ].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
        <article className="doctor-detail-panel">
          <Eyebrow>{copy.text051}</Eyebrow>
          <ul className="doctor-language-list">
            {[copy.text052, copy.text053, copy.text054, copy.text055].map(
              (item) => (
                <li key={item}>{item}</li>
              ),
            )}
          </ul>
        </article>
        <article className="doctor-detail-panel doctor-science-panel">
          <Eyebrow>{copy.text056}</Eyebrow>
          <p>{copy.text057}</p>
          <small>{copy.text058}</small>
        </article>
      </section>

      <section className="container wide-copy doctor-consultation">
        <div className="article-block">
          <h2>{copy.text020}</h2>
          <p>{copy.text021}</p>
          <p>{copy.text022}</p>
          <div style={{ marginTop: 27 }}>
            <ButtonLink href={copy.text023} secondary>
              {copy.text024}
            </ButtonLink>
          </div>
        </div>
      </section>
      <ContactInvitation />
    </>
  );
}
