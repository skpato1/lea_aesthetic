import { publicContent } from "@/lib/cms/public";
import { PageIntro, ContactInvitation } from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("parcours");
}

export default async function Journey() {
  const { cms, steps } = await publicContent();
  const copy = cms.copy.parcours;

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
      <section className="container section">
        <div className="journey-list">
          {steps.map((s, i) => (
            <article className="journey-item" key={s.title}>
              <span className="journey-index">
                {copy.text005}
                {i + 1}
              </span>
              <div>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
                <p>{s.detail}</p>
              </div>
            </article>
          ))}
          <div className="notice">{copy.text006}</div>
        </div>
      </section>
      <ContactInvitation />
    </>
  );
}
