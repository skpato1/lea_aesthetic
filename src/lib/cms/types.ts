import type seed from "@/content/cms-seed.json";
import type { Translations } from "../i18n/config";
import type { Certificate } from "./certificates";
export type ResultCase = {
  id: string;
  title: string;
  treatmentSlug: string;
  caption: string;
  interval: string;
  mode: string;
  beforeImage: string;
  afterImage: string;
  beforeAlt: string;
  afterAlt: string;
  instagramUrl: string;
  sourceLabel: string;
  sourceUrl: string;
  verified: boolean;
  consentConfirmed: boolean;
  visible: boolean;
};
export type SiteContent = Omit<
  typeof seed,
  "gallery" | "translations" | "certificates"
> & {
  certificates: Omit<typeof seed.certificates, "items"> & {
    items: Certificate[];
  };
  translations: Translations;
  gallery: Omit<typeof seed.gallery, "items"> & { items: ResultCase[] };
};
export type ContentState = {
  draft: SiteContent;
  published: SiteContent;
  revision: number;
  publishedRevision: number;
  updatedAt: number;
  publishedAt: number;
};
export type AdminSession = {
  id: string;
  userId: string;
  email: string;
  csrf: string;
  expires: number;
};
export type MediaItem = {
  publicationBlocked?: boolean;
  reviewNote?: string;
  id: string;
  name: string;
  width: number;
  height: number;
  created_at: number;
  url: string;
};
