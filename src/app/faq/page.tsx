import { publicContent } from "@/lib/cms/public";
import { PageIntro, FAQList, ContactInvitation } from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
export async function generateMetadata() {
  return managedMetadata("faq");
}
export default async function FAQ() {
  const { cms, t } = await publicContent();
  const copy = cms.copy.faq;

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
      <section
        className="container faq-page"
        aria-label={t("Réponses aux questions fréquentes")}
      >
        <FAQList />
      </section>
      <ContactInvitation />
    </>
  );
}
