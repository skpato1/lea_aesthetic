import { createHmac, randomUUID } from "node:crypto";

export type ContactData = {
  name: string;
  contact: string;
  intervention: string;
  message: string;
  consent: true;
  website: string;
  startedAt: number;
  requestId: string;
};
export type ContactErrors = Partial<Record<keyof ContactData, string>>;
export const interventionLabels: Record<string, string> = {
  rhinoplastie: "Rhinoplastie",
  "liposuccion-vaser": "Liposuccion Vaser",
  abdominoplastie: "Abdominoplastie",
  "augmentation-mammaire": "Augmentation mammaire",
  "lifting-mammaire": "Lifting mammaire",
  "lifting-du-visage": "Lifting du visage",
  "liposuccion-vaser-hd": "Liposuccion VASER HD",
  "j-plasma": "J-Plasma",
  "six-pack": "Six Pack",
  "a-definir": "À définir ensemble",
};
export function validateContact(
  value: unknown,
  now = Date.now(),
  labels: Record<string, string> = interventionLabels,
): { data?: ContactData; errors: ContactErrors } {
  const v = (
    value && typeof value === "object" && !Array.isArray(value) ? value : {}
  ) as Record<string, unknown>;
  const str = (key: string) =>
    typeof v[key] === "string" ? (v[key] as string).trim() : "";
  const name = str("name"),
    contact = str("contact"),
    intervention = str("intervention"),
    message = str("message"),
    requestId = str("requestId");
  const errors: ContactErrors = {};
  if (name.length < 2 || name.length > 80 || /[\r\n\u0000-\u001f]/.test(name))
    errors.name = "Indiquez un nom entre 2 et 80 caractères.";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact);
  const phone =
    /^\+?[0-9 ()\.\-]+$/.test(contact) &&
    contact.replace(/\D/g, "").length >= 7 &&
    contact.replace(/\D/g, "").length <= 15;
  if (contact.length > 160 || (!email && !phone))
    errors.contact =
      "Indiquez une adresse e-mail ou un numéro de téléphone valide.";
  if (!Object.hasOwn(labels, intervention))
    errors.intervention =
      "Choisissez une intervention ou « À définir ensemble ».";
  if (
    message.length < 10 ||
    message.length > 1200 ||
    /[\u0000-\u0008]/.test(message)
  )
    errors.message =
      "Votre message doit contenir entre 10 et 1 200 caractères.";
  if (v.consent !== true)
    errors.consent = "Votre accord est nécessaire pour traiter votre demande.";
  if (typeof v.website !== "string" || str("website") !== "")
    errors.website = "La demande n’a pas pu être validée.";
  if (
    typeof v.startedAt !== "number" ||
    !Number.isFinite(v.startedAt) ||
    now - v.startedAt < 2000 ||
    now - v.startedAt > 86400000
  )
    errors.startedAt =
      "Veuillez patienter quelques secondes ou actualiser la page avant de réessayer.";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      requestId,
    )
  )
    errors.requestId = "Veuillez actualiser la page et réessayer.";
  return Object.keys(errors).length
    ? { errors }
    : {
        errors,
        data: {
          name,
          contact,
          intervention,
          message,
          consent: true,
          website: "",
          startedAt: v.startedAt as number,
          requestId,
        },
      };
}
export type Environment = Record<string, string | undefined>;
export function deliveryMode(
  env: Environment = process.env,
): "resend" | "mock" | "unavailable" {
  if (
    env.CONTACT_TRANSPORT === "mock" &&
    (env.NODE_ENV === "development" || env.NODE_ENV === "test")
  )
    return "mock";
  if (
    env.CONTACT_TRANSPORT === "resend" &&
    env.RESEND_API_KEY &&
    env.CONTACT_FROM &&
    env.CONTACT_TO
  ) {
    if (
      env.NODE_ENV === "production" &&
      (!env.UPSTASH_REDIS_REST_URL ||
        !env.UPSTASH_REDIS_REST_TOKEN ||
        !env.RATE_LIMIT_SALT)
    )
      return "unavailable";
    return "resend";
  }
  return "unavailable";
}
const windowMs = 10 * 60 * 1000;
const maxRequests = 5;
const memory = new Map<string, { count: number; reset: number }>();
const localSalt = randomUUID();
export async function rateLimit(
  ip: string,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
  now = Date.now(),
): Promise<{ allowed: boolean; retryAfter: number }> {
  const key =
    "lea:contact:" +
    createHmac("sha256", env.RATE_LIMIT_SALT || localSalt)
      .update(ip)
      .digest("hex");
  if (env.UPSTASH_REDIS_REST_URL && env.UPSTASH_REDIS_REST_TOKEN) {
    const script =
      "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('EXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('TTL',KEYS[1])}";
    const res = await fetcher(env.UPSTASH_REDIS_REST_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.UPSTASH_REDIS_REST_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", script, "1", key, String(windowMs / 1000)]),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error("rate_limit_unavailable");
    const body = (await res.json()) as { result?: unknown; error?: string };
    if (
      body.error ||
      !Array.isArray(body.result) ||
      body.result.length !== 2 ||
      !body.result.every((x) => typeof x === "number") ||
      body.result[0] < 1 ||
      body.result[1] < 0
    )
      throw new Error("rate_limit_invalid");
    return {
      allowed: body.result[0] <= maxRequests,
      retryAfter: Math.max(1, body.result[1]),
    };
  }
  if (env.NODE_ENV === "production") throw new Error("rate_limit_unconfigured");
  for (const [k, v] of memory) {
    if (v.reset <= now) memory.delete(k);
  }
  if (memory.size > 10000) throw new Error("rate_limit_capacity");
  let record = memory.get(key);
  if (!record || record.reset <= now) {
    record = { count: 0, reset: now + windowMs };
    memory.set(key, record);
  }
  record.count++;
  return {
    allowed: record.count <= maxRequests,
    retryAfter: Math.max(1, Math.ceil((record.reset - now) / 1000)),
  };
}
export async function deliverContact(
  data: ContactData,
  env: Environment = process.env,
  fetcher: typeof fetch = fetch,
  labels: Record<string, string> = interventionLabels,
): Promise<{ id: string; mock: boolean }> {
  const mode = deliveryMode(env);
  if (mode === "unavailable") throw new Error("delivery_unavailable");
  if (mode === "mock") return { id: `mock-${data.requestId}`, mock: true };
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.contact)
    ? data.contact
    : undefined;
  const response = await fetcher("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `lea-${data.requestId}`,
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM,
      to: [env.CONTACT_TO],
      ...(email ? { reply_to: email } : {}),
      subject: `Nouvelle demande LEA — ${labels[data.intervention]}`,
      text: `Demande initiale LEA Aesthetic\n\nNom : ${data.name}\nContact : ${data.contact}\nIntervention : ${labels[data.intervention]}\n\n${data.message}\n\nAccord au traitement de la demande : oui\nVersion de la notice : 10 septembre 2026\nRéférence : ${data.requestId}`,
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) throw new Error("delivery_rejected");
  const body = (await response.json()) as { id?: unknown };
  if (typeof body.id !== "string" || body.id.length === 0)
    throw new Error("delivery_not_confirmed");
  return { id: body.id, mock: false };
}
