import { AdminError } from "./auth";
export const json = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export async function readBody(request: Request, limit = 800000) {
  if (Number(request.headers.get("content-length")) > limit)
    throw new AdminError(413, "Le fichier ou le contenu est trop volumineux.");
  const reader = request.body?.getReader();
  if (!reader) throw new AdminError(400, "La demande est vide.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > limit) {
      await reader.cancel();
      throw new AdminError(
        413,
        "Le fichier ou le contenu est trop volumineux.",
      );
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks);
}
export async function readJSON(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new AdminError(415, "Format de demande invalide.");
  try {
    const value = JSON.parse((await readBody(request)).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw new Error();
    return value as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AdminError) throw error;
    throw new AdminError(400, "La demande est illisible.");
  }
}
export function apiError(error: unknown) {
  return error instanceof AdminError
    ? json({ message: error.message }, error.status)
    : json(
        {
          message:
            "Le service est indisponible. Vos modifications ne sont pas confirmées. Réessayez après avoir vérifié la connexion et le stockage.",
        },
        503,
      );
}
