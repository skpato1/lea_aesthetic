import { publicContent } from "@/lib/cms/public";
import { HeartHandshake, MessagesSquare, Route } from "lucide-react";
import {
  PageIntro,
  ContactInvitation,
  Eyebrow,
  ButtonLink,
} from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("agence");
}
export default async function Agency() {
  const { cms } = await publicContent();
  const copy = cms.copy.agence;

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
      <section className="section container">
        <div className="prose-grid">
          <div>
            <Eyebrow>{copy.text005}</Eyebrow>
            <h2>
              {copy.text006}
              <br />
              {copy.text007}
              <br />
              <em>{copy.text008}</em>
            </h2>
          </div>
          <div>
            <p>{copy.text009}</p>
            <p>{copy.text010}</p>
            <p>{copy.text011}</p>
            <ButtonLink href={copy.text012} secondary>
              {copy.text013}
            </ButtonLink>
          </div>
        </div>
        <div className="principle-cards">
          <div className="principle-card">
            <HeartHandshake size={31} />
            <h3>{copy.text014}</h3>
            <p>{copy.text015}</p>
          </div>
          <div className="principle-card">
            <MessagesSquare size={31} />
            <h3>{copy.text016}</h3>
            <p>{copy.text017}</p>
          </div>
          <div className="principle-card">
            <Route size={31} />
            <h3>{copy.text018}</h3>
            <p>{copy.text019}</p>
          </div>
        </div>
      </section>
      <section className="container notice">
        <strong>{copy.text020}</strong>
        <p>{copy.text021}</p>
      </section>
      <ContactInvitation />
    </>
  );
}
