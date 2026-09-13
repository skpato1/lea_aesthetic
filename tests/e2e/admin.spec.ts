import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ContentState } from "../../src/lib/cms/types";
const token = "lea-e2e-only-setup-token-not-for-production-2026";
const email = "owner@example.test",
  password = "Une-phrase-de-test-privee-2026";
const origin = "http://localhost:3001";
test("administration : brouillon privé, images, publication, historique et contrôle d’accès", async ({
  page,
  browser,
  request,
}, info) => {
  test.setTimeout(150000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  expect((await request.get("/api/admin/content")).status()).toBe(401);
  expect(
    (
      await request.post("/api/admin/publish", {
        data: { revision: 1 },
        headers: { Origin: origin },
      })
    ).status(),
  ).toBe(401);
  await page.goto("/admin");
  const status = await (await page.request.get("/api/admin/status")).json();
  if (status.setup) {
    expect(
      (
        await request.post("/api/admin/setup", {
          headers: { Origin: origin },
          data: { email, password, token: "incorrect" },
        })
      ).status(),
    ).toBe(403);
    await page.getByLabel("Code d’installation privé").fill(token);
  }
  await page.getByLabel("Adresse e-mail", { exact: true }).fill(email);
  await page.locator("input[name=password]").fill(password);
  await page
    .getByRole("button", {
      name: status.setup ? "Créer mon compte" : "Me connecter",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Votre site, à votre image." }),
  ).toBeVisible();
  const session = (await (await page.request.get("/api/admin/status")).json())
    .session;
  const headers = { Origin: origin, "x-csrf-token": session.csrf };
  const initial: ContentState = await (
    await page.request.get("/api/admin/content")
  ).json();
  const original = structuredClone(initial.published);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: `test-results/admin-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    a11y.violations.filter(
      (x) => x.impact === "critical" || x.impact === "serious",
    ),
  ).toEqual([]);
  async function nav(label: string) {
    const button = page
      .getByRole("navigation", { name: "Sections administrables" })
      .getByRole("button", { name: label, exact: true });
    if (!(await button.isVisible()))
      await page
        .getByRole("button", { name: "Ouvrir la navigation", exact: true })
        .click();
    await button.click();
  }
  await nav("Interventions");
  await expect(page.getByText("9 interventions", { exact: true })).toBeVisible();
  const maleEditor = page
    .locator("details")
    .filter({ hasText: "07 · Liposuccion VASER HD" });
  await maleEditor.locator("summary").click();
  await expect(maleEditor.getByLabel("Image de l’intervention")).toHaveValue(
    "/images/operation-homme-vaser-hd.webp",
  );
  await expect(
    maleEditor.getByLabel("Description accessible de l’image"),
  ).not.toHaveValue("");
  await nav("Accueil");
  const text = `Votre projet ${info.project.name}`;
  await page.getByLabel("Titre — Votre projet", { exact: true }).fill(text);
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Brouillon enregistré");
  let current: ContentState = await (
    await page.request.get("/api/admin/content")
  ).json();
  expect(current.draft.copy.home.text002).toBe(text);
  expect(current.published.copy.home.text002).toBe(original.copy.home.text002);
  const visitor = await browser.newContext();
  const publicPage = await visitor.newPage();
  await publicPage.goto("/");
  await expect(publicPage.locator("h1")).not.toContainText(text);
  // CSRF/origin and optimistic concurrency are enforced server-side.
  expect(
    (
      await page.request.post("/api/admin/save", {
        headers: { Origin: origin },
        data: { revision: current.revision, content: current.draft },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await page.request.post("/api/admin/save", {
        headers: { ...headers, Origin: "https://invalid.example" },
        data: { revision: current.revision, content: current.draft },
      })
    ).status(),
  ).toBe(403);
  const invalid = structuredClone(current.draft);
  invalid.copy.home.text007 = "javascript:alert(1)";
  expect(
    (
      await page.request.post("/api/admin/save", {
        headers,
        data: { revision: current.revision, content: invalid },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await page.request.post("/api/admin/save", {
        headers,
        data: { revision: initial.revision, content: current.draft },
      })
    ).status(),
  ).toBe(409);
  const concurrent = await Promise.all(
    [1, 2].map(() =>
      page.request.post("/api/admin/save", {
        headers,
        data: { revision: current.revision, content: current.draft },
      }),
    ),
  );
  expect(concurrent.map((x) => x.status()).sort()).toEqual([200, 409]);
  current = await concurrent.find((x) => x.ok())!.json();
  // New raster images are private until they appear in a published document.
  const upload = await page.request.post("/api/admin/upload", {
    headers: {
      ...headers,
      "Content-Type": "image/png",
      "x-file-name": "Logo-test.png",
    },
    data: await readFile("public/images/lea-logo.png"),
  });
  expect(upload.status()).toBe(201);
  const image = await upload.json();
  expect((await request.get(image.url)).status()).toBe(404);
  expect(
    (
      await page.request.post("/api/admin/upload", {
        headers: { ...headers, "Content-Type": "image/svg+xml" },
        data: "<svg><script>alert(1)</script></svg>",
      })
    ).status(),
  ).toBe(400);
  const edit = structuredClone(current.draft);
  edit.settings.assets.logo = image.url;
  edit.faqs.push({
    id: randomUUID(),
    question: "Une question administrable ?",
    answer: "Une réponse enregistrée et publiée par le propriétaire du site.",
    visible: true,
    featured: true,
  });
  edit.treatments.push({
    ...structuredClone(edit.treatments[0]),
    slug: "intervention-test",
    name: "Intervention de test",
    number: "07",
  });
  edit.treatments[1].visible = false;
  const saved = await page.request.post("/api/admin/save", {
    headers,
    data: { revision: current.revision, content: edit },
  });
  expect(saved.ok()).toBe(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Votre site, à votre image." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Activer l’aperçu", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Aperçu du brouillon activé",
  );
  const preview = await page.context().newPage();
  await preview.goto("/");
  await expect(preview.locator("h1")).toContainText(text);
  await expect(preview.locator(".preview-banner")).toBeVisible();
  expect(
    await preview
      .locator(".site-header .brand-image")
      .evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await expect(preview.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex/,
  );
  await preview.close();
  expect((await request.get("/sitemap.xml")).status()).toBe(200);
  expect(await (await request.get("/sitemap.xml")).text()).not.toContain(
    "intervention-test",
  );
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Confirmer la publication", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "nouvelle version est publiée",
  );
  await publicPage.reload();
  await expect(publicPage.locator("h1")).toContainText(text);
  expect((await request.get(image.url)).status()).toBe(200);
  await publicPage.goto("/interventions/intervention-test");
  await expect(publicPage.locator("h1")).toHaveText("Intervention de test");
  expect((await request.get("/interventions/liposuccion-vaser")).status()).toBe(
    404,
  );
  expect(await (await request.get("/sitemap.xml")).text()).toContain(
    "intervention-test",
  );
  await publicPage.goto("/contact?intervention=intervention-test");
  await expect(publicPage.locator("#intervention")).toHaveValue(
    "intervention-test",
  );
  const payload = {
    name: "Test CMS",
    contact: "test@example.test",
    intervention: "intervention-test",
    message: "Une demande initiale dans un test local.",
    consent: true,
    website: "",
    startedAt: Date.now() - 5000,
    requestId: randomUUID(),
  };
  // Exercise the delivery boundary once. The shared local limiter intentionally
  // counts invalid requests too; the public desktop/mobile suite uses four more.
  if (info.project.name === "desktop") {
    const contact = await request.post("/api/contact", {
      headers: { Origin: origin },
      data: payload,
    });
    expect(contact.status()).toBe(200);
    expect((await contact.json()).mock).toBe(true);
  }
  await nav("Historique");
  await page
    .getByRole("button", { name: "Restaurer en brouillon" })
    .first()
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Version restaurée en brouillon",
  );
  await publicPage.goto("/");
  await expect(publicPage.locator("h1")).toContainText(text);
  await page.getByRole("button", { name: "Publier", exact: true }).click();
  await page
    .getByRole("button", { name: "Confirmer la publication", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "nouvelle version est publiée",
  );
  await publicPage.reload();
  await expect(publicPage.locator("h1")).toContainText(
    original.copy.home.text002,
  );
  await expect(publicPage.locator("h1")).not.toContainText(text);
  // An image retained by publication history is protected against deletion.
  expect(
    (
      await page.request.post("/api/admin/media-delete", {
        headers,
        data: { id: image.id },
      })
    ).status(),
  ).toBe(409);
  await nav("Coordonnées et réglages");
  await expect(page.getByLabel("Téléphone", { exact: true })).toHaveValue(
    original.settings.phone,
  );
  await page.screenshot({
    path: `test-results/admin-editor-${info.project.name}.png`,
    fullPage: true,
  });
  if (info.project.name === "mobile")
    await page
      .getByRole("button", { name: "Ouvrir la navigation", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Se déconnecter", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Heureux de vous retrouver." }),
  ).toBeVisible();
  expect((await page.request.get("/api/admin/content")).status()).toBe(401);
  expect(errors).toEqual([]);
  await visitor.close();
});
test("admin : format, brute force et sessions refusées", async ({
  request,
}, info) => {
  test.skip(
    info.project.name !== "mobile",
    "The final mobile pass exercises the persisted login limit after both UI journeys.",
  );
  expect(
    (
      await request.post("/api/admin/login", {
        headers: { Origin: "https://invalid.example" },
        data: { email, password },
      })
    ).status(),
  ).toBe(403);
  let last = 0;
  for (let i = 0; i < 11; i++)
    last = (
      await request.post("/api/admin/login", {
        headers: { Origin: origin },
        data: { email, password: "incorrect-password" },
      })
    ).status();
  expect(last).toBe(429);
  expect(
    (
      await request.post("/api/admin/login", {
        headers: { Origin: origin },
        data: { email, password },
      })
    ).status(),
  ).toBe(429);
});
