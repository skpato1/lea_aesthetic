import { publicContent } from "@/lib/cms/public";
import { Brand } from "@/components/brand";
import Link from "@/components/localized-link";
import Image from "next/image";
import {
  Instagram,
  ArrowUpRight,
  MapPin,
  Phone,
  MessageCircle,
} from "lucide-react";
export async function Footer() {
  const { cms, site, navigation, whatsapp, t } = await publicContent();
  const copy = cms.copy.footer;

  return (
    <>
      <footer className="site-footer">
        <div className="container footer-grid">
          <div className="footer-brand">
            <Link href="/" aria-label={t("LEA Aesthetic, accueil")}>
              <Brand
                src={site.assets.logo}
                alt={copy.text001}
                name={site.name}
                location={site.location}
              />
            </Link>
            <p>
              {copy.text002}
              <br />
              {copy.text003}
            </p>
            <p className="footer-location">
              <MapPin size={16} /> {site.location}
            </p>
            <div className="footer-health-mark">
              <Image
                src={site.assets.healthTurkiye}
                alt="Health Türkiye — Heart of Health"
                width={1200}
                height={388}
                sizes="(max-width: 760px) 200px, 230px"
                loading="lazy"
                unoptimized={site.assets.healthTurkiye.startsWith("/media/")}
              />
            </div>
          </div>
          <div>
            <p className="footer-heading">{copy.text005}</p>
            <div className="footer-links">
              {navigation.map((x) => (
                <Link key={x.href} href={x.href}>
                  {x.label}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="footer-heading">{copy.text006}</p>
            <div className="footer-links">
              <a href={site.phoneHref}>
                <Phone size={16} />
                {site.phone}
              </a>
              <a href={whatsapp()} target="_blank" rel="noopener noreferrer">
                <MessageCircle size={17} />
                {copy.text007}
                <ArrowUpRight size={14} />
              </a>
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram size={17} />
                {site.instagramHandle}
                <ArrowUpRight size={14} />
              </a>
              <Link href={copy.text009}>
                {copy.text010}
                <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
        <div className="container footer-bottom">
          <p>
            © {new Date().getFullYear()} {copy.text011}
          </p>
          <Link href={copy.text012}>{copy.text013}</Link>
          <span>{copy.text014}</span>
        </div>
      </footer>
      <a
        className="floating-whatsapp"
        href={whatsapp()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("Contacter LEA Aesthetic sur WhatsApp (nouvel onglet)")}
      >
        <MessageCircle size={22} />
        <span>{copy.text015}</span>
      </a>
    </>
  );
}
