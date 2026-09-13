import { readValue, contentState } from "@/lib/cms/store";
import { session } from "@/lib/cms/auth";
import { contentAssets } from "@/lib/cms/gallery";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/.test(id)) return new Response(null, { status: 404 });
  const state = await contentState();
  const metadata = await readValue<{ publicationBlocked?: boolean }>(
    `media-info:${id}`,
  );
  const isPublic =
    !metadata?.publicationBlocked &&
    contentAssets(state.published, true).includes(`/media/${id}`);
  if (!isPublic && !(await session()))
    return new Response(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const item = await readValue<{ body: string }>(`media:${id}`);
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
