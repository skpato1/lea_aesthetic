import { publicContent } from "@/lib/cms/public";
import { ButtonLink, Eyebrow } from "@/components/ui";
export default async function NotFound() {
  const { cms } = await publicContent();
  const copy = cms.copy.notFound;

  return (
    <section className="container not-found">
      <Eyebrow>{copy.text001}</Eyebrow>
      <h1>
        {copy.text002}
        <br />
        <em>{copy.text003}</em>
      </h1>
      <p>{copy.text004}</p>
      <ButtonLink href="/">{copy.text005}</ButtonLink>
    </section>
  );
}
