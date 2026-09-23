import { readValues } from "@/lib/cms/store";
import { session } from "@/lib/cms/auth";
import { contentAssets } from "@/lib/cms/gallery";
import type { ContentState, MediaItem } from "@/lib/cms/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const values = await readValues([
    "content",
    `media-info:${id}`,
    `media:${id}`,
  ]);
  const state = values.get("content") as ContentState | undefined;
  const metadata = values.get(`media-info:${id}`) as MediaItem | undefined;
  const isPublic =
    !!state &&
    !metadata?.publicationBlocked &&
    contentAssets(state.published, true).includes(`/media/${id}`);
  if (!isPublic && !(await session()))
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const item = values.get(`media:${id}`) as { body: string } | undefined;
  if (!item) return new Response(null, { status: 404 });
  return new Response(Buffer.from(item.body, "base64"), {
    headers: {
      "Content-Type": "image/webp",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
