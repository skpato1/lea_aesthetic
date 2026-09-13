import { ImageResponse } from "next/og";
/* eslint-disable @next/next/no-img-element -- ImageResponse renders raster output. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getPublished } from "@/lib/cms/public";
import { readValue } from "@/lib/cms/store";
import { localizedContent, requestLocale } from "@/lib/i18n/server";
export const alt = "LEA Aesthetic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";
export default async function Image() {
  const {
    content: { settings },
  } = await localizedContent(await getPublished(), await requestLocale());
  let logo: string;
  if (settings.assets.logo.startsWith("/media/"))
    logo = `data:image/webp;base64,${(await readValue<{ body: string }>(`media:${settings.assets.logo.slice(7)}`))?.body}`;
  else
    logo = `data:image/png;base64,${(await readFile(join(process.cwd(), "public", settings.assets.logo))).toString("base64")}`;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "#fcfaf8",
        padding: "45px 80px",
        color: "#342e33",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 35 }}>
        <img
          src={logo}
          width={124}
          height={138}
          style={{ objectFit: "contain" }}
          alt=""
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <span style={{ fontSize: 34, color: "#8a3858" }}>
            {settings.name}
          </span>
          <span style={{ fontSize: 19, color: "#70646c" }}>
            {settings.location}
          </span>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "serif",
          fontSize: 60,
          lineHeight: 1.15,
          marginTop: 30,
        }}
      >
        {settings.socialTitle}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 21,
          marginTop: 24,
          color: "#70646c",
        }}
      >
        {settings.name}
      </div>
    </div>,
    size,
  );
}
