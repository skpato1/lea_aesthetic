import { getPublished } from "@/lib/cms/public";
import {
  builtinMessages,
  translationMessages,
  translate,
} from "@/lib/i18n/server";
import { isLocale } from "@/lib/i18n/config";
import {
  deliveryMode,
  deliverContact,
  rateLimit,
  validateContact,
} from "@/lib/contact";
export const runtime = "nodejs";
const rawAnswer = (
  status: number,
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
export async function POST(request: Request) {
  const requested = request.headers.get("x-lea-language");
  const locale = isLocale(requested) ? requested : "fr";
  let messages = await builtinMessages(locale);
  const answer = (
    status: number,
    body: Record<string, unknown>,
    headers: Record<string, string> = {},
  ) =>
    rawAnswer(
      status,
      {
        ...body,
        ...(typeof body.message === "string"
          ? { message: translate(messages, body.message) }
          : {}),
        ...(body.errors && typeof body.errors === "object"
          ? {
              errors: Object.fromEntries(
                Object.entries(body.errors).map(([key, value]) => [
                  key,
                  typeof value === "string"
                    ? translate(messages, value)
                    : value,
                ]),
              ),
            }
          : {}),
      },
      { "Content-Language": locale, ...headers },
    );
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin]);
  // Next may construct request.url with the bind address (0.0.0.0) when
  // self-hosted. The browser's Host header retains the actual public origin.
  const host = request.headers.get("host");
  if (host) allowed.add(`${new URL(request.url).protocol}//${host}`);
  if (process.env.NEXT_PUBLIC_SITE_URL)
    allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
  if (!origin || !allowed.has(origin))
    return answer(403, {
      message:
        "Cette demande n’est pas autorisée. Actualisez la page et réessayez.",
    });
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return answer(415, { message: "Le format de la demande est invalide." });
  if (Number(request.headers.get("content-length")) > 8192)
    return answer(413, { message: "Votre demande est trop volumineuse." });
  try {
    const ip =
      process.env.VERCEL === "1"
        ? request.headers
            .get("x-vercel-forwarded-for")
            ?.split(",")[0]
            ?.trim() || "unknown-vercel"
        : "local-or-shared";
    const limit = await rateLimit(ip);
    if (!limit.allowed)
      return answer(
        429,
        {
          message:
            "Plusieurs demandes ont été reçues. Patientez dix minutes ou contactez-nous sur WhatsApp.",
        },
        { "Retry-After": String(limit.retryAfter) },
      );
  } catch {
    return answer(503, {
      message:
        "Le formulaire est momentanément indisponible. Contactez-nous sur WhatsApp.",
    });
  }
  let input: unknown;
  try {
    const reader = request.body?.getReader();
    if (!reader) return answer(400, { message: "La demande est vide." });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 8192) {
        await reader.cancel();
        return answer(413, { message: "Votre demande est trop volumineuse." });
      }
      chunks.push(part.value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return answer(400, {
      message: "La demande n’a pas pu être lue. Veuillez réessayer.",
    });
  }
  let labels: Record<string, string>;
  try {
    const content = await getPublished();
    messages = await translationMessages(content, locale);
    labels = Object.fromEntries([
      ...content.treatments
        .filter((t) => t.visible)
        .map((t) => [t.slug, t.name]),
      ["a-definir", "À définir ensemble"],
    ]);
  } catch {
    return answer(503, {
      message:
        "Le formulaire est momentanément indisponible. Contactez-nous sur WhatsApp.",
    });
  }
  const result = validateContact(input, Date.now(), labels);
  if (!result.data)
    return answer(400, {
      message: "Vérifiez les champs indiqués avant de réessayer.",
      errors: result.errors,
    });
  if (deliveryMode() === "unavailable")
    return answer(503, {
      message:
        "L’envoi par formulaire n’est pas encore disponible. Votre demande n’a pas été transmise. Vous pouvez nous joindre sur WhatsApp.",
    });
  try {
    const accepted = await deliverContact(
      result.data,
      process.env,
      fetch,
      labels,
    );
    return answer(200, {
      success: true,
      mock: accepted.mock,
      message: accepted.mock
        ? "Test réussi : le transport de développement a accepté la demande. Aucun e-mail réel n’a été envoyé."
        : "Votre demande a été acceptée par notre service d’envoi. Merci, l’équipe LEA pourra vous recontacter.",
    });
  } catch {
    return answer(502, {
      message:
        "L’envoi n’a pas pu être confirmé. Réessayez ou contactez-nous sur WhatsApp.",
    });
  }
}
