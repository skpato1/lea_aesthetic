import { publicContent } from "@/lib/cms/public";
import Image from "next/image";
import {
  ContactInvitation,
  Eyebrow,
  PageIntro,
  ButtonLink,
} from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("chirurgien");
}
export default async function Surgeon() {
  const { cms, site } = await publicContent();
  const copy = cms.copy.chirurgien;

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
      <section className="section container surgeon-section doctor-page">
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
      <section className="container wide-copy" style={{ paddingBottom: 60 }}>
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
