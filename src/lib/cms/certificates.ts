import type { SiteContent } from "./types";
export type Certificate = {
  id: string;
  title: string;
  holder: string;
  issuer: string;
  scope: string;
  reference: string;
  issuedOn: string;
  expiresOn: string;
  verificationUrl: string;
  image: string;
  alt: string;
  verified: boolean;
  visible: boolean;
};
export const certificateTemplate: Certificate = {
  id: "",
  title: "",
  holder: "",
  issuer: "",
  scope: "",
  reference: "",
  issuedOn: "",
  expiresOn: "",
  verificationUrl: "",
  image: "",
  alt: "",
  verified: false,
  visible: false,
};
export function verificationLink(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !/[\s\\]/.test(value)
    );
  } catch {
    return false;
  }
}
export function certificateIsVisible(
  item: Certificate,
  now = new Date(),
): boolean {
  return (
    item.visible === true &&
    item.verified === true &&
    [
      item.title,
      item.holder,
      item.issuer,
      item.scope,
      item.reference,
      item.alt,
    ].every((value) => !!value.trim()) &&
    /^\/media\/[a-f0-9-]{36}$/.test(item.image) &&
    verificationLink(item.verificationUrl) &&
    (!item.expiresOn || item.expiresOn >= now.toISOString().slice(0, 10))
  );
}
export function resetCertificateApprovals(
  previous: SiteContent,
  next: SiteContent,
) {
  for (const item of next.certificates.items) {
    const old = previous.certificates.items.find(
      (entry) => entry.id === item.id,
    );
    if (
      old?.verified &&
      Object.keys(certificateTemplate).some(
        (key) =>
          !["id", "visible", "verified"].includes(key) &&
          old[key as keyof Certificate] !== item[key as keyof Certificate],
      )
    ) {
      item.verified = false;
      item.visible = false;
    }
  }
}
