import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  validateContact,
  deliverContact,
  deliveryMode,
  rateLimit,
} from "../src/lib/contact.ts";
import type { ContactData } from "../src/lib/contact.ts";
const now = Date.now();
const valid = (): ContactData => ({
  name: "Camille Exemple",
  contact: "camille@example.test",
  intervention: "rhinoplastie",
  message: "Bonjour, je souhaite connaître les étapes pour me renseigner.",
  consent: true,
  website: "",
  startedAt: now - 10000,
  requestId: randomUUID(),
});
test("accepte une demande par e-mail ou téléphone, sans demander les deux", () => {
  assert.deepEqual(validateContact(valid(), now).errors, {});
  assert.ok(
    validateContact({ ...valid(), contact: "+33 6 12 34 56 78" }, now).data,
  );
});
test("rejette champs invalides, consentement absent, faux choix et contenu trop long", () => {
  const r = validateContact(
    {
      ...valid(),
      name: "x",
      contact: "invalide",
      message: "a".repeat(1201),
      intervention: "__proto__",
      consent: false,
    },
    now,
  );
  for (const k of ["name", "contact", "message", "intervention", "consent"])
    assert.ok(r.errors[k as keyof typeof r.errors]);
  assert.equal(r.data, undefined);
});
test("rejette robots, envoi immédiat, timestamp invalide et données non structurées", () => {
  assert.ok(
    validateContact({ ...valid(), website: "spam" }, now).errors.website,
  );
  assert.ok(
    validateContact({ ...valid(), startedAt: now }, now).errors.startedAt,
  );
  assert.ok(
    validateContact({ ...valid(), startedAt: NaN }, now).errors.startedAt,
  );
  assert.ok(validateContact(null, now).errors.name);
  assert.ok(
    validateContact({ ...valid(), requestId: "invalid" }, now).errors.requestId,
  );
});
test("limiteur local : cinq requêtes puis blocage et expiration", async () => {
  const ip = randomUUID();
  for (let i = 0; i < 5; i++)
    assert.equal(
      (await rateLimit(ip, { NODE_ENV: "test" }, fetch, now)).allowed,
      true,
    );
  const blocked = await rateLimit(ip, { NODE_ENV: "test" }, fetch, now);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfter, 600);
  assert.equal(
    (await rateLimit(ip, { NODE_ENV: "test" }, fetch, now + 600001)).allowed,
    true,
  );
});
test("production : refuse tout envoi sans stockage partagé et refuse le mode mock", async () => {
  assert.equal(
    deliveryMode({ NODE_ENV: "production", CONTACT_TRANSPORT: "mock" }),
    "unavailable",
  );
  assert.equal(
    deliveryMode({
      NODE_ENV: "production",
      CONTACT_TRANSPORT: "resend",
      RESEND_API_KEY: "test",
      CONTACT_FROM: "from",
      CONTACT_TO: "to",
    }),
    "unavailable",
  );
  await assert.rejects(() => rateLimit("test", { NODE_ENV: "production" }));
  await assert.rejects(() =>
    deliverContact(valid(), {
      NODE_ENV: "production",
      CONTACT_TRANSPORT: "mock",
    }),
  );
});
test("mock explicite accepté en développement sans appel réseau", async () => {
  const result = await deliverContact(
    valid(),
    { NODE_ENV: "test", CONTACT_TRANSPORT: "mock" },
    async () => {
      throw new Error("unexpected network");
    },
  );
  assert.equal(result.mock, true);
  assert.ok(result.id.startsWith("mock-"));
});
const resend = {
  NODE_ENV: "test",
  CONTACT_TRANSPORT: "resend",
  RESEND_API_KEY: "test-key-not-real",
  CONTACT_FROM: "LEA <from@example.test>",
  CONTACT_TO: "agency@example.test",
};
test("livraison : vérifie destinataire, contenu texte, reply_to et acceptation réelle", async () => {
  const data = valid();
  let calls = 0;
  const result = await deliverContact(data, resend, async (url, init) => {
    calls++;
    assert.equal(url, "https://api.resend.com/emails");
    const body = JSON.parse(init?.body as string);
    assert.deepEqual(body.to, ["agency@example.test"]);
    assert.equal(body.reply_to, data.contact);
    assert.equal(body.html, undefined);
    assert.ok(body.text.includes(data.message));
    assert.equal(
      (init?.headers as Record<string, string>)["Idempotency-Key"],
      `lea-${data.requestId}`,
    );
    return Response.json({ id: "accepted-message-id" });
  });
  assert.equal(calls, 1);
  assert.equal(result.mock, false);
  assert.equal(result.id, "accepted-message-id");
});
test("aucun succès lorsque le fournisseur refuse, répond sans id ou échoue", async () => {
  for (const mock of [
    async () => Response.json({ error: "refused" }, { status: 422 }),
    async () => Response.json({}),
    async () => {
      throw new Error("timeout");
    },
  ])
    await assert.rejects(() => deliverContact(valid(), resend, mock));
});
test("Redis : commande atomique, adresse IP non stockée et refus en panne", async () => {
  const env = {
    NODE_ENV: "production",
    UPSTASH_REDIS_REST_URL: "https://redis.example.test",
    UPSTASH_REDIS_REST_TOKEN: "test",
    RATE_LIMIT_SALT: "test-salt",
  };
  const result = await rateLimit("192.0.2.1", env, async (_url, init) => {
    const body = JSON.parse(init?.body as string);
    assert.equal(body[0], "EVAL");
    assert.ok(body[1].includes("EXPIRE"));
    assert.ok(!body[3].includes("192.0.2.1"));
    return Response.json({ result: [6, 555] });
  });
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfter, 555);
  await assert.rejects(() =>
    rateLimit("192.0.2.1", env, async () =>
      Response.json({ error: "unavailable" }),
    ),
  );
});

test('les interventions publiées sont validées et leurs libellés sont livrés', async () => {
  const labels={'nouveau-soin':'Nouveau soin confirmé','a-definir':'À définir ensemble'};
  const data={...valid(),intervention:'nouveau-soin'};
  assert.ok(validateContact(data,Date.now(),labels).data);
  assert.ok(validateContact({...data,intervention:'rhinoplastie'},Date.now(),labels).errors.intervention);
  await deliverContact(data,{NODE_ENV:'development',CONTACT_TRANSPORT:'resend',RESEND_API_KEY:'test',CONTACT_FROM:'site@example.test',CONTACT_TO:'owner@example.test'},async(_url,init)=>{
    const mail=JSON.parse(init?.body as string);assert.ok(mail.subject.includes('Nouveau soin confirmé'));assert.ok(mail.text.includes('Nouveau soin confirmé'));return Response.json({id:'accepted'});
  },labels);
});
