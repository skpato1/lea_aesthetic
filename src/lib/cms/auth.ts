import "server-only";
import {
  randomBytes,
  randomUUID,
  createHash,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { readValue, transaction, setupToken } from "./store";
import type { AdminSession } from "./types";
const derive = promisify(scrypt);
export const SESSION_COOKIE = "lea_admin";
export const PREVIEW_COOKIE = "lea_preview";
type Owner = { id: string; email: string; password: string };
export class AdminError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const equal = (a: string, b: string) => {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};
export function validateCredentials(email: unknown, password: unknown) {
  if (
    typeof email !== "string" ||
    email.length > 160 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  )
    throw new AdminError(400, "Indiquez une adresse e-mail valide.");
  if (
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  )
    throw new AdminError(
      400,
      "Le mot de passe doit contenir entre 12 et 128 caractères.",
    );
  return { email: email.toLowerCase().trim(), password };
}
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await derive(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
async function verify(password: string, hash: string) {
  const [salt, key] = hash.split(":");
  const candidate = (await derive(password, salt, 64)) as Buffer;
  return equal(candidate.toString("hex"), key);
}
export async function ownerExists() {
  return !!(await readValue<Owner>("owner"));
}
export async function session(): Promise<AdminSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const value = await readValue<AdminSession>(`session:${digest(token)}`);
  return value && value.expires > Date.now() ? value : null;
}
export function checkOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const url = new URL(request.url);
  const allowed = new Set([url.origin]);
  const host = request.headers.get("host");
  if (host) allowed.add(`${url.protocol}//${host}`);
  if (process.env.NEXT_PUBLIC_SITE_URL)
    allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
  if (!origin || !allowed.has(origin))
    throw new AdminError(403, "Origine de la demande non autorisée.");
}
export async function requireAdmin(request?: Request) {
  const current = await session();
  if (!current) throw new AdminError(401, "Connectez-vous pour continuer.");
  if (request) {
    checkOrigin(request);
    if (!equal(request.headers.get("x-csrf-token") || "", current.csrf))
      throw new AdminError(
        403,
        "La session de sécurité a changé. Rechargez la page.",
      );
  }
  return current;
}
export async function authThrottle(request: Request) {
  const ip =
    process.env.VERCEL === "1"
      ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
        "shared"
      : "local";
  const key = `limit:${digest(ip)}`;
  const allowed = await transaction(async (store) => {
    const now = Date.now();
    const old = await store.get<{ count: number; reset: number }>(key);
    const value =
      old && old.reset > now ? old : { count: 0, reset: now + 15 * 60 * 1000 };
    value.count++;
    await store.set(key, value);
    return value.count <= 10;
  });
  if (!allowed)
    throw new AdminError(
      429,
      "Trop de tentatives. Patientez quinze minutes avant de réessayer.",
    );
}
export async function signIn(email: string, password: string, token?: string) {
  if (token !== undefined) {
    const expected = await setupToken();
    if (!equal(digest(token), digest(expected)))
      throw new AdminError(403, "Le code d’installation est incorrect.");
    const hash = await hashPassword(password);
    await transaction(async (store) => {
      if (await store.get("owner"))
        throw new AdminError(
          409,
          "Le compte administrateur existe déjà. Connectez-vous.",
        );
      await store.set("owner", { id: randomUUID(), email, password: hash });
    });
  }
  const owner = await readValue<Owner>("owner");
  // Always perform the password derivation, including unknown accounts.
  const valid = await verify(
    password,
    owner?.password || `${"0".repeat(32)}:${"0".repeat(128)}`,
  );
  if (!owner || !valid || owner.email !== email)
    throw new AdminError(401, "Adresse e-mail ou mot de passe incorrect.");
  const raw = randomBytes(32).toString("hex");
  const current: AdminSession = {
    id: digest(raw),
    userId: owner.id,
    email: owner.email,
    csrf: randomBytes(32).toString("hex"),
    expires: Date.now() + 8 * 60 * 60 * 1000,
  };
  await transaction(async (store) => {
    const latest = await store.get<Owner>("owner");
    if (!latest || latest.id !== owner.id || latest.password !== owner.password)
      throw new AdminError(
        401,
        "Les identifiants ont changé. Reconnectez-vous.",
      );
    const existing = await store.list<AdminSession>("session:");
    for (const value of existing)
      if (value.expires < Date.now()) await store.remove(`session:${value.id}`);
    await store.set(`session:${current.id}`, current);
  });
  (await cookies()).set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 8 * 60 * 60,
  });
  return current;
}
export async function signOut(current: AdminSession) {
  await transaction((store) => store.remove(`session:${current.id}`));
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(PREVIEW_COOKIE);
}
export async function changePassword(
  current: AdminSession,
  old: string,
  next: string,
) {
  const owner = await readValue<Owner>("owner");
  if (!owner || !(await verify(old, owner.password)))
    throw new AdminError(400, "Le mot de passe actuel est incorrect.");
  validateCredentials(owner.email, next);
  const password = await hashPassword(next);
  await transaction(async (store) => {
    const latest = await store.get<Owner>("owner");
    if (!latest || latest.password !== owner.password)
      throw new AdminError(
        409,
        "Le mot de passe a changé dans une autre session.",
      );
    await store.set("owner", { ...owner, password });
    for (const item of await store.list<AdminSession>("session:"))
      await store.remove(`session:${item.id}`);
  });
  (await cookies()).delete(SESSION_COOKIE);
  (await cookies()).delete(PREVIEW_COOKIE);
}
