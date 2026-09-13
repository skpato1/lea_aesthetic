import type { Metadata } from "next";
import { AdminPanel } from "@/components/admin/panel";
import { getPublished } from "@/lib/cms/public";
import "./admin.css";
export const metadata: Metadata = {
  title: { absolute: "Administration | LEA Aesthetic" },
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};
export default async function AdminPage() {
  const { settings } = await getPublished();
  return (
    <AdminPanel
      initialBrand={{
        logo: settings.assets.logo,
        name: settings.name,
        location: settings.location,
      }}
    />
  );
}
