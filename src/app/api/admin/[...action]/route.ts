import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import {
  AdminError,
  requireAdmin,
  ownerExists,
  session,
  checkOrigin,
  authThrottle,
  validateCredentials,
  signIn,
  signOut,
  changePassword,
  PREVIEW_COOKIE,
} from "@/lib/cms/auth";
import {
  contentState,
  transaction,
  listValues,
  setupToken,
  storageConfigured,
} from "@/lib/cms/store";
import { validateContent } from "@/lib/cms/validation";
import { contentAssets, resetChangedApprovals } from "@/lib/cms/gallery";
import { restoreContent } from "@/lib/cms/migrations";
import { resetCertificateApprovals } from "@/lib/cms/certificates";
import { json, readJSON, readBody, apiError } from "@/lib/cms/http";
import type { ContentState, SiteContent, MediaItem } from "@/lib/cms/types";
import { builtinMessages } from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/config";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ action: string[] }> };
type Revision = {
  id: string;
  content: SiteContent;
  createdAt: number;
  email: string;
  revision: number;
};
type StoredMedia = MediaItem & { body: string };
export async function GET(request: Request, context: Context) {
  try {
    const action = (await context.params).action.join("/");
    if (action === "status") {
      if (!storageConfigured())
        return json({
          configured: false,
          message:
            "Configurez DATABASE_URL et ADMIN_SETUP_TOKEN sur Vercel pour activer le panneau.",
        });
      const exists = await ownerExists();
      if (!exists) await setupToken();
      const current = await session();
      return json({
        configured: true,
        setup: !exists,
        preview: (await cookies()).get(PREVIEW_COOKIE)?.value === "1",
        session: current ? { email: current.email, csrf: current.csrf } : null,
      });
    }
    await requireAdmin();
    if (action === "translations") {
      const locale = new URL(request.url).searchParams.get("locale");
      if (!isLocale(locale)) throw new AdminError(400, "Langue inconnue.");
      return json(await builtinMessages(locale));
    }
    if (action === "content") return json(await contentState());
    if (action === "history")
      return json(
        (await listValues<Revision>("revision:"))
          .sort((a, b) => b.createdAt - a.createdAt)
          .map(({ id, createdAt, email, revision }) => ({
            id,
            createdAt,
            email,
            revision,
          })),
      );
    if (action === "media")
      return json(
        (await listValues<MediaItem>("media-info:")).sort(
          (a, b) => b.created_at - a.created_at,
        ),
      );
    throw new AdminError(404, "Cette action n’existe pas.");
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    const action = (await context.params).action.join("/");
    if (action === "login" || action === "setup") {
      checkOrigin(request);
      await authThrottle(request);
      const body = await readJSON(request);
      const credentials = validateCredentials(body.email, body.password);
      if (
        action === "setup" &&
        (typeof body.token !== "string" || body.token.length > 256)
      )
        throw new AdminError(400, "Le code d’installation est requis.");
      const current = await signIn(
        credentials.email,
        credentials.password,
        action === "setup" ? (body.token as string) : undefined,
      );
      return json({ email: current.email, csrf: current.csrf });
    }
    const current = await requireAdmin(request);
    if (action === "logout") {
      await signOut(current);
      return json({ ok: true });
    }
    if (action === "upload") {
      const buffer = await readBody(request, 5 * 1024 * 1024);
      let body: Buffer;
      let width: number, height: number;
      try {
        const input = sharp(buffer, {
          limitInputPixels: 25000000,
          animated: false,
        });
        const info = await input.metadata();
        if (
          !["jpeg", "png", "webp"].includes(info.format || "") ||
          !info.width ||
          !info.height ||
          (info.pages || 1) > 1
        )
          throw new Error();
        const result = await input
          .rotate()
          .resize({
            width: 2200,
            height: 2200,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 88 })
          .toBuffer({ resolveWithObject: true });
        body = result.data;
        width = result.info.width;
        height = result.info.height;
      } catch {
        throw new AdminError(
          400,
          "Choisissez une image JPEG, PNG ou WebP valide, de moins de 5 Mo et 25 mégapixels.",
        );
      }
      const id = randomUUID();
      let name = "Image";
      try {
        name = decodeURIComponent(
          request.headers.get("x-file-name") || "Image",
        ).slice(0, 150);
      } catch {}
      const item: StoredMedia = {
        id,
        name,
        width,
        height,
        created_at: Date.now(),
        url: `/media/${id}`,
        body: body.toString("base64"),
      };
      const publicItem: MediaItem = {
        id: item.id,
        name: item.name,
        width: item.width,
        height: item.height,
        created_at: item.created_at,
        url: item.url,
      };
      await transaction(async (store) => {
        await store.set(`media:${id}`, item);
        await store.set(`media-info:${id}`, publicItem);
      });
      return json(publicItem, 201);
    }
    const body = await readJSON(request);
    if (action === "password") {
      await authThrottle(request);
      if (
        typeof body.oldPassword !== "string" ||
        typeof body.password !== "string" ||
        body.oldPassword.length > 128
      )
        throw new AdminError(400, "Mot de passe invalide.");
      await changePassword(current, body.oldPassword, body.password);
      return json({ ok: true });
    }
    if (action === "preview") {
      if (typeof body.enabled !== "boolean")
        throw new AdminError(400, "Choix invalide.");
      (await cookies()).set(PREVIEW_COOKIE, body.enabled ? "1" : "0", {
        httpOnly: true,
        sameSite: "strict",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 8 * 3600,
      });
      return json({ ok: true });
    }
    if (action === "media-delete") {
      if (typeof body.id !== "string" || !/^[a-f0-9-]{36}$/.test(body.id))
        throw new AdminError(400, "Image inconnue.");
      await transaction(async (store) => {
        const currentContent = await store.get<ContentState>("content");
        const history = await store.list<Revision>("revision:");
        if (
          JSON.stringify([currentContent, ...history]).includes(
            `/media/${body.id}`,
          )
        )
          throw new AdminError(
            409,
            "Cette image est utilisée par le site, un brouillon ou une version conservée.",
          );
        await store.remove(`media:${body.id}`);
        await store.remove(`media-info:${body.id}`);
      });
      return json({ ok: true });
    }
    if (!["save", "publish", "restore"].includes(action))
      throw new AdminError(404, "Cette action n’existe pas.");
    if (!Number.isSafeInteger(body.revision))
      throw new AdminError(400, "Version invalide. Rechargez le contenu.");
    let validated: SiteContent | undefined;
    if (action === "save")
      try {
        validated = validateContent(body.content);
      } catch (error) {
        throw new AdminError(400, (error as Error).message);
      }
    const state = await transaction(async (store) => {
      const value = (await store.get<ContentState>("content"))!;
      if (value.revision !== body.revision)
        throw new AdminError(
          409,
          "Une autre session a enregistré des modifications. Rechargez la dernière version avant de continuer. Votre saisie reste affichée.",
        );
      if (action === "restore") {
        if (typeof body.id !== "string")
          throw new AdminError(400, "Version invalide.");
        const previous = await store.get<Revision>(`revision:${body.id}`);
        if (!previous) throw new AdminError(404, "Version introuvable.");
        try {
          value.draft = validateContent(restoreContent(previous.content));
        } catch (error) {
          throw new AdminError(400, (error as Error).message);
        }
      } else if (action === "save") {
        resetChangedApprovals(value.draft, validated!);
        resetCertificateApprovals(value.draft, validated!);
        for (const asset of contentAssets(validated!, true)) {
          const media = asset.startsWith("/media/")
            ? await store.get<MediaItem>(`media-info:${asset.slice(7)}`)
            : undefined;
          if (media?.publicationBlocked)
            throw new AdminError(
              400,
              "Ce visuel est réservé à l’examen privé. Fournissez un original authentique avant publication.",
            );
        }
        for (const asset of contentAssets(validated!))
          if (
            asset.startsWith("/media/") &&
            !(await store.get(`media:${asset.slice(7)}`))
          )
            throw new AdminError(400, "Une image sélectionnée n’existe plus.");
        value.draft = validated!;
      } else {
        for (const asset of contentAssets(value.draft, true)) {
          const media = asset.startsWith("/media/")
            ? await store.get<MediaItem>(`media-info:${asset.slice(7)}`)
            : undefined;
          if (media?.publicationBlocked)
            throw new AdminError(
              400,
              "Un visuel réservé à l’examen privé ne peut pas être publié.",
            );
        }
        try {
          validateContent(value.draft);
        } catch (error) {
          throw new AdminError(400, (error as Error).message);
        }
        for (const asset of contentAssets(value.draft))
          if (
            asset.startsWith("/media/") &&
            !(await store.get(`media:${asset.slice(7)}`))
          )
            throw new AdminError(400, "Une image sélectionnée n’existe plus.");
        // Keep the previous publication so the very first publication is reversible too.
        const id = randomUUID();
        await store.set(`revision:${id}`, {
          id,
          content: value.published,
          createdAt: Date.now(),
          email: current.email,
          revision: value.publishedRevision,
        });
        const history = (await store.list<Revision>("revision:")).sort(
          (a, b) => b.createdAt - a.createdAt,
        );
        for (const old of history.slice(30))
          await store.remove(`revision:${old.id}`);
        value.published = structuredClone(value.draft);
        value.publishedRevision = value.revision + 1;
        value.publishedAt = Date.now();
      }
      value.revision++;
      value.updatedAt = Date.now();
      await store.set("content", value);
      return value;
    });
    return json(state);
  } catch (error) {
    return apiError(error);
  }
}
