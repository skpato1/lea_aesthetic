import { publicContent } from "@/lib/cms/public";
import { PageIntro } from "@/components/ui";
import { managedMetadata } from "@/lib/metadata";
import Link from "@/components/localized-link";
export async function generateMetadata() {
  return managedMetadata("legal");
}
export default async function Legal() {
  const { cms, site } = await publicContent();
  const copy = cms.copy.legal;

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
      <article className="container legal-content">
        <p className="legal-status">{copy.text005}</p>
        <div className="notice">
          <strong>{copy.text006}</strong>
          <p>{copy.text007}</p>
        </div>
        <h2>{copy.text008}</h2>
        <p>{copy.text009}</p>
        <p>{copy.text010}</p>
        <h2>{copy.text011}</h2>
        <p>
          {copy.text012} <a href={site.phoneHref}>{site.phone}</a>{" "}
          {copy.text013}
          <Link href={copy.text014}>{copy.text015}</Link>
          {copy.text016}
        </p>
        <h2>{copy.text017}</h2>
        <p>{copy.text018}</p>
        <h2>{copy.text019}</h2>
        <p>{copy.text020}</p>
        <p>{copy.text021}</p>
        <h2>{copy.text022}</h2>
        <p>{copy.text023}</p>
        <p>{copy.text024}</p>
        <h2>{copy.text025}</h2>
        <p>{copy.text026}</p>
        <p>{copy.text027}</p>
        <h2>{copy.text028}</h2>
        <p>{copy.text029}</p>
        <h2>{copy.text030}</h2>
        <p>{copy.text031}</p>
        <h2>{copy.text032}</h2>
        <p>{copy.text033}</p>
        <h2>{copy.text034}</h2>
        <p>{copy.text035}</p>
        <p>
          {copy.text036}{" "}
          <a href={copy.text037} target="_blank" rel="noopener noreferrer">
            {copy.text038}
          </a>
          {copy.text039}
        </p>
      </article>
    </>
  );
}
